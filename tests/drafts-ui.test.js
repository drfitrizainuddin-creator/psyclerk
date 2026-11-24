const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers');
const H = 3600000;
const SAVE_WAIT = 700; // live-update debounce (150 ms) + autosave debounce (300 ms) + margin

async function withApp(fn, opts) { const app = await openApp(opts); try { await fn(app); } finally { await app.browser.close(); } }
const visible = (page, sel) => page.$eval(sel, el => getComputedStyle(el).display !== 'none' && !el.classList.contains('hidden'));
async function chooseDevice(page, which) { await page.click(which === 'own' ? '#device-own' : '#device-shared'); }
async function newPatient(page, label) { await page.evaluate(l => { document.getElementById('new-patient-label').value = l; newPatient(); }, label); }
const hpi = (page) => page.$eval('#comp_hpi_narrative', e => e.value);
const draftKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('psyclerk.draft.')));

test('first run asks device type; choosing Shared stores it', () => withApp(async ({ page }) => {
  assert.ok(await visible(page, '#device-modal'));
  await chooseDevice(page, 'shared');
  assert.strictEqual(await page.evaluate(() => PsyDrafts.getDeviceType()), 'shared');
  assert.ok(!(await visible(page, '#device-modal')));
}));

test('device modal not shown again once chosen', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'own'); await page.reload(); await page.waitForTimeout(300);
  assert.ok(!(await visible(page, '#device-modal')));
}));

test('autosave survives reload and restores with a toast naming the draft', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'own');
  await page.fill('#comp_hpi_narrative', 'Low mood 3 weeks'); await page.waitForTimeout(SAVE_WAIT);
  await page.reload(); await page.waitForTimeout(300);
  assert.strictEqual(await hpi(page), 'Low mood 3 weeks');
  assert.match(await page.$eval('#toast-msg', e => e.textContent), /Restored Unlabelled/);
}));

test('opening the app with a blank form does not create a draft', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'own'); await page.evaluate(() => switchTemplateMode('rapid')); await page.waitForTimeout(SAVE_WAIT);
  assert.deepStrictEqual(await draftKeys(page), []);
}));

test('switch race: switching right after typing never leaks A into B', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'own');
  await newPatient(page, 'A'); const idA = await page.evaluate(() => PsyDrafts.getActive());
  await newPatient(page, 'B'); const idB = await page.evaluate(() => PsyDrafts.getActive());
  await page.evaluate(id => switchToDraft(id), idA);
  await page.fill('#comp_hpi_narrative', 'AAA');
  await page.evaluate(id => switchToDraft(id), idB);   // immediately, before any debounce fires
  await page.waitForTimeout(SAVE_WAIT);
  const r = await page.evaluate(([a, b]) => [PsyDrafts.loadDraft(a).state?.fields.comp_hpi_narrative, PsyDrafts.loadDraft(b).state?.fields.comp_hpi_narrative ?? ''], [idA, idB]);
  assert.strictEqual(r[0], 'AAA'); assert.ok(!r[1].includes('AAA'));
  assert.strictEqual(await hpi(page), '');
}));

test('expired draft on screen: purge clears the form and nothing is re-saved', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'shared');
  await page.fill('#comp_hpi_narrative', 'Sensitive history'); await page.waitForTimeout(SAVE_WAIT);
  assert.strictEqual((await draftKeys(page)).length, 1);
  await page.evaluate((H) => { PsyDraftsUI.now = () => Date.now() + 13 * H; PsyDraftsUI.tick(); }, H);
  assert.strictEqual(await hpi(page), '');
  await page.waitForTimeout(SAVE_WAIT);
  assert.deepStrictEqual(await draftKeys(page), []);
}));

test('label is rendered as text, never as HTML', () => withApp(async ({ page }) => {
  let dialog = false; page.on('dialog', d => { dialog = true; d.dismiss(); });
  await chooseDevice(page, 'own'); await newPatient(page, '<img src=x onerror=alert(1)>');
  await page.evaluate(() => openPatients()); await page.waitForTimeout(200);
  assert.strictEqual(await page.$$eval('#patients-list img', l => l.length), 0);
  assert.match(await page.$eval('#patients-list', e => e.textContent), /<img src=x/);
  assert.strictEqual(dialog, false);
}));

test('expiry warning shows minutes left in the final hour', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'shared'); await newPatient(page, 'Bed 4');
  await page.evaluate((H) => { const id = PsyDrafts.getActive(); PsyDrafts.saveDraft(id, PsyForm.captureForm(), { mode: 'comprehensive', status: 'risk incomplete' }, Date.now() - (12 * H - 45 * 60000)); renderPatients(); }, H);
  assert.match(await page.$eval('#patients-list', e => e.textContent), /deletes in 45 min/);
}));

test('Done deletes only the active draft', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'own'); await newPatient(page, 'A'); await newPatient(page, 'B');
  await page.evaluate(() => { markDone(); document.getElementById('modal-confirm-btn').click(); });
  const labels = await page.evaluate(() => PsyDrafts.listDrafts(Date.now()).map(d => d.label));
  assert.deepStrictEqual(labels, ['A']);
}));

test('End session deletes all drafts but keeps saved phrases', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'own'); await newPatient(page, 'A'); await newPatient(page, 'B');
  await page.evaluate(() => localStorage.setItem('psyclerk.phrases.v1', '["Seen with husband"]'));
  await page.evaluate(() => { endSession(); document.getElementById('modal-confirm-btn').click(); });
  assert.deepStrictEqual(await draftKeys(page), []);
  assert.strictEqual(await page.evaluate(() => localStorage.getItem('psyclerk.phrases.v1')), '["Seen with husband"]');
}));

test('New patient is disabled at the 10-draft limit', () => withApp(async ({ page }) => {
  await chooseDevice(page, 'own');
  for (let i = 0; i < 10; i++) await newPatient(page, 'P' + i);
  await page.evaluate(() => renderPatients());
  assert.strictEqual(await page.$eval('#new-patient-btn', b => b.disabled), true);
  assert.match(await page.$eval('#patients-drawer', e => e.textContent), /Limit of 10/);
}));

test('storage warning visible when the browser refuses to store', async () => {
  const app = await openApp();
  try {
    await app.page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('no', 'QuotaExceededError'); }; });
    await app.page.reload(); await app.page.waitForTimeout(300);
    assert.ok(await visible(app.page, '#storage-warning'));
    assert.deepStrictEqual(app.errors, []);
  } finally { await app.browser.close(); }
});
