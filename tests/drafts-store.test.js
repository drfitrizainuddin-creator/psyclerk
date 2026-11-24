const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers');
const H = 3600000;

async function withApp(fn, opts) { const app = await openApp(opts); try { await fn(app); } finally { await app.browser.close(); } }

test('ttl: 24 h own device, 12 h shared PC', () => withApp(async ({ page }) => {
  const r = await page.evaluate(() => [PsyDrafts.ttlMs('own'), PsyDrafts.ttlMs('shared')]);
  assert.deepStrictEqual(r, [86400000, 43200000]);
}));

test('cap: 11th draft is refused, list stays at 10', () => withApp(async ({ page }) => {
  const r = await page.evaluate(() => {
    PsyDrafts.setDeviceType('own'); const now = Date.now(); const made = [];
    for (let i = 0; i < 11; i++) made.push(PsyDrafts.createDraft('P' + i, now + i));
    return { last: made[10], n: PsyDrafts.listDrafts(now + 20).length, newestFirst: PsyDrafts.listDrafts(now + 20)[0].label };
  });
  assert.strictEqual(r.last, null); assert.strictEqual(r.n, 10); assert.strictEqual(r.newestFirst, 'P9');
}));

test('purge: shared expires after 12 h, own after 24 h', () => withApp(async ({ page }) => {
  const r = await page.evaluate((H) => {
    const t = 1_000_000_000_000;
    PsyDrafts.setDeviceType('shared'); const a = PsyDrafts.createDraft('A', t);
    const sharedGone = PsyDrafts.purgeExpired(t + 12 * H + 1);
    PsyDrafts.setDeviceType('own'); const b = PsyDrafts.createDraft('B', t);
    const ownKeptAt13h = PsyDrafts.purgeExpired(t + 13 * H).length === 0 && !!PsyDrafts.loadDraft(b.id);
    const ownGone = PsyDrafts.purgeExpired(t + 24 * H + 1);
    return { sharedGone, aId: a.id, ownKeptAt13h, ownGone, bId: b.id };
  }, H);
  assert.deepStrictEqual(r.sharedGone, [r.aId]); assert.ok(r.ownKeptAt13h); assert.deepStrictEqual(r.ownGone, [r.bId]);
}));

test('roundtrip: chips, text and dropdowns restore to the same note', () => withApp(async ({ page, click, set, out }) => {
  await click('#comp-suicide-chips span', ['Plan', 'Intent']);
  await page.fill('#comp_hpi_narrative', 'Two weeks of low mood');
  await set({ comp_suicide_level: 'High' });
  const before = await out();
  const ok = await page.evaluate(() => { const s = PsyForm.captureForm(); PsyForm.clearFormSilently(); const blank = document.getElementById('output-textarea').value; window.__blankHadPlan = /Ideation.*Plan/.test(blank); return PsyForm.restoreForm(s); });
  assert.strictEqual(ok, true);
  assert.strictEqual(await page.evaluate(() => window.__blankHadPlan), false, 'clear did not clear');
  assert.strictEqual(await out(), before);
}));

test('fingerprint mismatch: refuses to restore and leaves form untouched', () => withApp(async ({ page, click, out }) => {
  await click('#comp-suicide-chips span', ['Plan']);
  const r = await page.evaluate(() => { const s = PsyForm.captureForm(); PsyForm.clearFormSilently(); s.fingerprint = 'older-version'; return PsyForm.restoreForm(s); });
  assert.strictEqual(r, false);
  assert.ok(!/Ideation.*Plan/.test(await out()));
}));

test('two tabs: saving in one tab does not erase a draft saved in another', () => withApp(async (app) => {
  const pageB = await app.context.newPage(); await pageB.route(/^https?:/, r => r.abort()); await pageB.goto(app.page.url());
  const st = await app.page.evaluate(() => PsyForm.captureForm());
  const idA = await app.page.evaluate((st) => { PsyDrafts.setDeviceType('own'); const d = PsyDrafts.createDraft('A', Date.now()); PsyDrafts.saveDraft(d.id, st, { mode: 'comprehensive', status: 'risk incomplete' }, Date.now()); return d.id; }, st);
  const idB = await pageB.evaluate((st) => { const d = PsyDrafts.createDraft('B', Date.now()); PsyDrafts.saveDraft(d.id, st, { mode: 'rapid', status: 'ready' }, Date.now()); return d.id; }, st);
  await app.page.evaluate(([id, st]) => PsyDrafts.saveDraft(id, st, { mode: 'comprehensive', status: 'ready' }, Date.now()), [idA, st]);
  const ids = await app.page.evaluate(() => PsyDrafts.listDrafts(Date.now()).map(d => d.id).sort());
  assert.deepStrictEqual(ids, [idA, idB].sort());
}));

test('storage throws: saveDraft reports failure and storageAvailable() is false', () => withApp(async ({ page }) => {
  const r = await page.evaluate(() => {
    PsyDrafts.setDeviceType('own'); const d = PsyDrafts.createDraft('A', Date.now());
    Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    return { saved: PsyDrafts.saveDraft(d.id, PsyForm.captureForm(), { mode: 'rapid', status: 'ready' }, Date.now()), avail: PsyDrafts.storageAvailable() };
  });
  assert.deepStrictEqual(r, { saved: false, avail: false });
}));
