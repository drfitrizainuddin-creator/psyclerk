const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers');
async function withApp(fn) {
  const app = await openApp({ viewport: { width: 1366, height: 800 } });
  try { await app.page.click('#device-own'); await fn(app); } finally { await app.browser.close(); }
}
const isShown = (page, sel) => page.$eval(sel, el => getComputedStyle(el).display !== 'none');

test('add, list and persist a phrase across reload', () => withApp(async ({ page }) => {
  await page.evaluate(() => PsyPhrases.add('Seen with husband, consented to collateral'));
  await page.reload(); await page.waitForTimeout(300);
  assert.deepStrictEqual(await page.evaluate(() => PsyPhrases.list()), ['Seen with husband, consented to collateral']);
}));

test('insertInto puts text at the cursor and updates the note', () => withApp(async ({ page, out }) => {
  await page.fill('#comp_hpi_narrative', 'Low mood. Poor sleep.');
  await page.evaluate(() => { const el = document.getElementById('comp_hpi_narrative'); el.setSelectionRange(10, 10); PsyPhrases.insertInto(el, 'Seen with husband. '); });
  assert.strictEqual(await page.$eval('#comp_hpi_narrative', e => e.value), 'Low mood. Seen with husband. Poor sleep.');
  await page.waitForTimeout(300);
  assert.match(await out(), /Low mood\. Seen with husband\. Poor sleep\./);
}));

test('Phrases button appears on focus and inserts into the focused field', () => withApp(async ({ page }) => {
  await page.evaluate(() => PsyPhrases.add('Collateral from mother'));
  assert.strictEqual(await isShown(page, '#phrases-btn'), false);
  await page.click('#comp_past_psych');
  assert.strictEqual(await isShown(page, '#phrases-btn'), true);
  await page.click('#phrases-btn');
  assert.strictEqual(await isShown(page, '#phrases-popover'), true);
  await page.click('#phrases-list [data-insert="0"]');
  assert.strictEqual(await page.$eval('#comp_past_psych', e => e.value), 'Collateral from mother');
  assert.strictEqual(await isShown(page, '#phrases-popover'), false);
}));

test('save a new phrase from the popover', () => withApp(async ({ page }) => {
  await page.click('#comp_hpi_narrative'); await page.click('#phrases-btn');
  await page.fill('#new-phrase-input', 'No forensic history');
  await page.click('#save-phrase-btn');
  assert.deepStrictEqual(await page.evaluate(() => PsyPhrases.list()), ['No forensic history']);
}));

test('remove deletes a phrase', () => withApp(async ({ page }) => {
  const r = await page.evaluate(() => { PsyPhrases.add('a'); PsyPhrases.add('b'); PsyPhrases.remove(0); return PsyPhrases.list(); });
  assert.deepStrictEqual(r, ['b']);
}));

test('phrases survive End session', () => withApp(async ({ page }) => {
  await page.evaluate(() => PsyPhrases.add('Keep me'));
  await page.fill('#comp_hpi_narrative', 'x'); await page.waitForTimeout(700);
  await page.evaluate(() => { endSession(); document.getElementById('modal-confirm-btn').click(); });
  assert.deepStrictEqual(await page.evaluate(() => PsyPhrases.list()), ['Keep me']);
}));

test('phrase text is shown literally, never as HTML; over-long phrases are trimmed to 500', () => withApp(async ({ page }) => {
  await page.evaluate(() => { PsyPhrases.add('<b>bold</b>'); PsyPhrases.add('x'.repeat(600)); });
  await page.click('#comp_hpi_narrative'); await page.click('#phrases-btn');
  assert.strictEqual(await page.$$eval('#phrases-list b', l => l.length), 0);
  assert.match(await page.$eval('#phrases-list', e => e.textContent), /<b>bold<\/b>/);
  assert.strictEqual(await page.evaluate(() => PsyPhrases.list()[1].length), 500);
}));
