const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers'); const { serve } = require('./serve');

test('served over localhost: service worker takes control and the app works offline', async () => {
  const { server, url } = await serve();
  const app = await openApp({ offline: false, url: url + 'index.html' });
  try {
    await app.page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('no service worker within 5 s')), 5000))]));
    await app.page.reload(); await app.page.waitForTimeout(500);
    assert.ok(await app.page.evaluate(() => !!navigator.serviceWorker.controller), 'page not controlled by SW');
    await app.context.setOffline(true);
    server.close();
    await app.page.reload(); await app.page.waitForTimeout(500);
    const r = await app.page.evaluate(() => { loadSampleCase(); return { note: document.getElementById('output-textarea').value, radius: getComputedStyle(document.querySelector('.chip-toggle')).borderTopLeftRadius }; });
    assert.match(r.note, /Major Depressive Disorder/);
    assert.notStrictEqual(r.radius, '0px', 'CSS not served from cache');
    assert.deepStrictEqual(app.errors, []);
  } finally { await app.browser.close(); server.close(); }
});

test('manifest is valid and its icons exist', async () => {
  const { server, url } = await serve();
  const app = await openApp({ offline: false, url: url + 'index.html' });
  try {
    const href = await app.page.$eval('link[rel="manifest"]', l => l.href);
    const m = await app.page.evaluate(async (h) => (await fetch(h)).json(), href);
    assert.strictEqual(m.display, 'standalone'); assert.ok(m.name && m.start_url);
    for (const icon of m.icons) { const ok = await app.page.evaluate(async (s) => (await fetch(s)).ok, new URL(icon.src, href).href); assert.ok(ok, icon.src); }
    assert.deepStrictEqual(m.icons.map(i => i.sizes).sort(), ['192x192', '512x512']);
  } finally { await app.browser.close(); server.close(); }
});

test('file:// load registers no service worker and throws no error', async () => {
  const app = await openApp();
  try {
    assert.strictEqual(await app.page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), false);
    assert.deepStrictEqual(app.errors, []);
  } finally { await app.browser.close(); }
});

test('service worker caches every app file it is told about', async () => {
  const fs = require('fs'); const path = require('path');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const listed = JSON.parse(sw.match(/const APP_FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  const missing = listed.filter(f => !fs.existsSync(path.join(__dirname, '..', f)));
  assert.deepStrictEqual(missing, []);
  const scripts = [...fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').matchAll(/(?:src|href)="((?:js|css|vendor|icons)\/[^"]+|manifest\.webmanifest)"/g)].map(m => m[1]);
  assert.deepStrictEqual(scripts.filter(s => !listed.includes(s)), [], 'index.html references a file the SW does not cache');
});
