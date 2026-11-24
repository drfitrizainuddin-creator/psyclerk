const { chromium } = require('playwright');
const path = require('path');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');

// Opens the app from disk with all http(s) requests aborted (simulates an offline ward PC).
async function openApp({ offline = true, viewport, url = APP, context: ctxOpts = {} } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, ...ctxOpts });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const requests = []; page.on('request', r => requests.push(r.url()));
  if (offline) await page.route(/^https?:/, r => r.abort());
  await page.goto(url); await page.waitForTimeout(300);
  const out = () => page.$eval('#output-textarea', e => e.value);
  const click = (sel, names) => page.evaluate(([sel, names]) => [...document.querySelectorAll(sel)].filter(s => names.includes(s.textContent.trim())).forEach(s => s.click()), [sel, names]);
  const set = (o) => page.evaluate(o => { for (const [k, v] of Object.entries(o)) document.getElementById(k).value = v; generateNotes(); }, o);
  const flags = () => page.evaluate(() => getConsistencyFlags());
  return { browser, context, page, errors, requests, out, click, set, flags };
}
module.exports = { openApp, APP };
