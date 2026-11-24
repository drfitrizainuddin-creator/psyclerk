// Tests reproducing the final review's Critical/Important findings.
const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers'); const { serve } = require('./serve');
const SAVE_WAIT = 700;
async function withApp(fn) { const app = await openApp({ viewport: { width: 1366, height: 800 } }); try { await app.page.click('#device-own'); await fn(app); } finally { await app.browser.close(); } }
async function newPatient(page, label) { await page.evaluate(l => { document.getElementById('new-patient-label').value = l; newPatient(); }, label); }
const draftField = (page, id, f) => page.evaluate(([id, f]) => PsyDrafts.loadDraft(id)?.state?.fields?.[f], [id, f]);
const staleFingerprint = (page, id) => page.evaluate(id => { const k = 'psyclerk.draft.' + id; const d = JSON.parse(localStorage.getItem(k)); d.fingerprint = 'old'; d.state.fingerprint = 'old'; localStorage.setItem(k, JSON.stringify(d)); }, id);

test('#1 opening an older-version draft never lets the on-screen patient overwrite it', () => withApp(async ({ page }) => {
  await newPatient(page, 'B'); const idB = await page.evaluate(() => PsyDrafts.getActive());
  await page.fill('#pt_name', 'Bob Patient'); await page.waitForTimeout(SAVE_WAIT);
  await newPatient(page, 'A'); const idA = await page.evaluate(() => PsyDrafts.getActive());
  await page.fill('#pt_name', 'Alice Patient'); await page.waitForTimeout(SAVE_WAIT);
  await staleFingerprint(page, idB);
  await page.evaluate(id => switchToDraft(id), idB);
  await page.fill('#comp_pc', 'x'); await page.waitForTimeout(SAVE_WAIT);
  assert.strictEqual(await draftField(page, idB, 'pt_name'), 'Bob Patient');
  assert.strictEqual(await page.evaluate(() => PsyDrafts.getActive()), idA, 'should stay on A');
}));

test('#2 an older-version active draft at reload is not reopened or overwritten, and the user is told', () => withApp(async ({ page }) => {
  await newPatient(page, 'Bed 12 OLD'); const id = await page.evaluate(() => PsyDrafts.getActive());
  await page.fill('#pt_name', 'Old Patient'); await page.waitForTimeout(SAVE_WAIT);
  await staleFingerprint(page, id);
  await page.reload(); await page.waitForTimeout(400);
  assert.match(await page.$eval('#toast-msg', e => e.textContent), /older version/);
  await page.fill('#pt_name', 'New Person'); await page.waitForTimeout(SAVE_WAIT);
  assert.strictEqual(await draftField(page, id, 'pt_name'), 'Old Patient');
}));

async function twoTabs(app) {
  const b = await app.context.newPage(); await b.route(/^https?:/, r => r.abort()); await b.goto(app.page.url()); await b.waitForTimeout(300); return b;
}

test('#3 same draft in two tabs: a stale tab does not wipe the other tab\'s work', () => withApp(async (app) => {
  const a = app.page; await newPatient(a, 'X'); const id = await a.evaluate(() => PsyDrafts.getActive());
  const b = await twoTabs(app);
  assert.strictEqual(await b.evaluate(() => PsyDrafts.getActive()), id);
  await a.fill('#comp_hpi_narrative', 'Long history typed in tab A'); await a.waitForTimeout(SAVE_WAIT);
  await b.fill('#pt_age', '7'); await b.waitForTimeout(SAVE_WAIT);
  assert.strictEqual(await draftField(a, id, 'comp_hpi_narrative'), 'Long history typed in tab A');
}));

test('#4 Done in one tab is not undone by editing in another tab', () => withApp(async (app) => {
  const a = app.page; await newPatient(a, 'Dora Deleted');
  await a.fill('#pt_name', 'Dora'); await a.waitForTimeout(SAVE_WAIT);
  const b = await twoTabs(app);
  await a.evaluate(() => { markDone(); document.getElementById('modal-confirm-btn').click(); });
  await b.waitForTimeout(300);
  await b.fill('#comp_pc', 'more'); await b.waitForTimeout(SAVE_WAIT);
  const stored = await a.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('psyclerk.draft.')).map(k => localStorage.getItem(k)).join('\n'));
  assert.ok(!stored.includes('Dora'), 'deleted patient came back: ' + stored.slice(0, 200));
  assert.strictEqual(await b.$eval('#pt_name', e => e.value), '', 'deleted patient still on screen in tab B');
}));

test('#5 Sample Case never overwrites the open patient; it opens as its own draft', () => withApp(async ({ page }) => {
  await newPatient(page, 'Bed 3'); const id = await page.evaluate(() => PsyDrafts.getActive());
  await page.fill('#comp_hpi_narrative', 'Real patient history'); await page.waitForTimeout(SAVE_WAIT);
  await page.evaluate(() => loadSampleCase()); await page.waitForTimeout(SAVE_WAIT);
  assert.strictEqual(await draftField(page, id, 'comp_hpi_narrative'), 'Real patient history');
  const active = await page.evaluate(() => PsyDrafts.loadDraft(PsyDrafts.getActive()).label);
  assert.match(active, /Sample/);
}));

test('#6a the form fingerprint changes when a dropdown option value changes', () => withApp(async ({ page }) => {
  const r = await page.evaluate(() => { const a = PsyForm.formFingerprint(); document.querySelector('#comp_suicide_level option[value="Moderate"]').value = 'Medium'; return [a, PsyForm.formFingerprint()]; });
  assert.notStrictEqual(r[0], r[1]);
}));

test('#6b a risk dropdown with no valid value counts as not rated', () => withApp(async ({ page }) => {
  const gaps = await page.evaluate(() => { switchTemplateMode('comprehensive'); document.getElementById('comp_suicide_level').value = 'Medium'; return getRiskGaps(); });
  assert.ok(gaps.some(g => /Suicide \(C\)/.test(g)), JSON.stringify(gaps));
}));

test('#7 offline works when opened at the folder address, not just index.html', async () => {
  const { server, url } = await serve();
  const app = await openApp({ offline: false, url });
  try {
    await app.page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('no SW')), 5000))]));
    await app.page.reload(); await app.page.waitForTimeout(500);
    await app.context.setOffline(true); server.close();
    await app.page.reload(); await app.page.waitForTimeout(500);
    assert.ok(await app.page.evaluate(() => typeof loadSampleCase === 'function'));
  } finally { await app.browser.close(); server.close(); }
});
