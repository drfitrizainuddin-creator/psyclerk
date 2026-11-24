const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers');

test('styled with network blocked', async () => {
  const app = await openApp();
  try {
    const r = await app.page.evaluate(() => ({
      radius: getComputedStyle(document.querySelector('.chip-toggle')).borderTopLeftRadius,
      headerBg: getComputedStyle(document.querySelector('header')).backgroundColor,
    }));
    assert.notStrictEqual(r.radius, '0px', 'chips unstyled: Tailwind not loaded');
    assert.strictEqual(r.headerBg, 'rgb(255, 255, 255)');
  } finally { await app.browser.close(); }
});

test('no external requests', async () => {
  const app = await openApp();
  try {
    const external = app.requests.filter(u => /^https?:/.test(u));
    assert.deepStrictEqual(external, []);
    assert.deepStrictEqual(app.errors, []);
  } finally { await app.browser.close(); }
});
