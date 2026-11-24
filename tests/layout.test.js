const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers');
const PHONE = { width: 390, height: 844 }, PC = { width: 1366, height: 768 };

async function withApp(viewport, fn) {
  const app = await openApp({ viewport });
  try { await app.page.evaluate(() => { try { PsyDrafts.setDeviceType('own'); } catch {} document.getElementById('device-modal').style.display = 'none'; }); await fn(app); }
  finally { await app.browser.close(); }
}
const isVisible = (page, sel) => page.$eval(sel, el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden');
const statusOf = (page, name) => page.evaluate(n => sectionStatus(document.querySelector(`#view-${currentMode} [data-section="${n}"], [data-section="${n}"]`)), name);

test('phone: note hidden until Note tab chosen; bottom bar visible', () => withApp(PHONE, async ({ page }) => {
  assert.strictEqual(await isVisible(page, '#output-textarea'), false);
  assert.strictEqual(await isVisible(page, '#bottom-bar'), true);
  await page.evaluate(() => setPhoneTab('note'));
  assert.strictEqual(await isVisible(page, '#output-textarea'), true);
  assert.strictEqual(await isVisible(page, '#comp_pc'), false);
}));

test('phone: every visible chip is at least 40 px tall', () => withApp(PHONE, async ({ page }) => {
  await page.evaluate(() => document.querySelectorAll('[data-section]').forEach(s => setCollapsed(s, false)));
  const small = await page.$$eval('.chip-toggle', els => els.filter(e => e.offsetParent && e.getBoundingClientRect().height < 40).map(e => e.textContent.trim()));
  assert.deepStrictEqual(small, []);
}));

test('PC: form and note side by side; bottom bar hidden', () => withApp(PC, async ({ page }) => {
  assert.strictEqual(await isVisible(page, '#output-textarea'), true);
  assert.strictEqual(await isVisible(page, '#comp_pc'), true);
  assert.strictEqual(await isVisible(page, '#bottom-bar'), false);
}));

test('sectionStatus: risk card incomplete when blank, complete after sample case', () => withApp(PC, async ({ page }) => {
  const risk = () => page.evaluate(() => sectionStatus(document.getElementById('sec-formulation-mgmt')));
  assert.strictEqual(await risk(), 'risk-incomplete');
  await page.evaluate(() => loadSampleCase());
  assert.strictEqual(await risk(), 'complete');
}));

test('sectionStatus: history card empty when blank, started after typing', () => withApp(PC, async ({ page }) => {
  const past = () => page.evaluate(() => sectionStatus(document.getElementById('sec-past-background')));
  assert.strictEqual(await past(), 'empty');
  await page.fill('#comp_past_psych', 'One prior admission');
  assert.strictEqual(await past(), 'started');
}));

test('section menu lists sections of the active mode with status dots', () => withApp(PC, async ({ page }) => {
  const items = await page.$$eval('#section-menu [data-target]', l => l.map(e => e.dataset.status));
  assert.ok(items.length >= 9, 'expected demographics + 8 comprehensive sections, got ' + items.length);
  assert.ok(items.includes('risk-incomplete'));
  await page.evaluate(() => switchTemplateMode('followup'));
  const fu = await page.$$eval('#section-menu [data-target]', l => l.length);
  assert.ok(fu >= 4 && fu < items.length);
}));

test('Alt+N jumps to the first empty or risk-incomplete section and expands it', () => withApp(PHONE, async ({ page }) => {
  await page.keyboard.press('Alt+N'); await page.waitForTimeout(400);
  const r = await page.evaluate(() => { const s = PsyLayout.lastJump; return s ? { st: sectionStatus(s), collapsed: s.dataset.collapsed === '1' } : null; });
  assert.ok(r); assert.ok(['empty', 'risk-incomplete'].includes(r.st)); assert.strictEqual(r.collapsed, false);
}));

test('Alt+C runs the copy gate (blocked while risk incomplete)', () => withApp(PC, async ({ page }) => {
  await page.keyboard.press('Alt+C'); await page.waitForTimeout(200);
  assert.match(await page.$eval('#toast-msg', e => e.textContent), /^Incomplete/);
}));

test('Alt+1 / Alt+3 switch mode', () => withApp(PC, async ({ page }) => {
  await page.keyboard.press('Alt+1'); assert.strictEqual(await page.evaluate(() => currentMode), 'rapid');
  await page.keyboard.press('Alt+3'); assert.strictEqual(await page.evaluate(() => currentMode), 'followup');
}));

test('cleaner look: no pulsing dot, no gradient strip, no HIPAA claim', () => withApp(PC, async ({ page }) => {
  assert.strictEqual(await page.$$eval('.animate-pulse', l => l.length), 0);
  assert.strictEqual(await page.$$eval('[class*="bg-gradient"]', l => l.length), 0);
  assert.ok(!(await page.content()).includes('HIPAA'));
}));

test('dictation hint under HPI, interval notes and MSE notes', () => withApp(PC, async ({ page }) => {
  const n = await page.$$eval('.dictation-hint', l => l.map(e => e.dataset.for).sort());
  assert.deepStrictEqual(n, ['comp_hpi_narrative', 'fu_interval_text', 'full_mse_notes']);
}));
