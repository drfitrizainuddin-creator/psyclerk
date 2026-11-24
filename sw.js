// Offline cache for the app's own files only. Never sees patient data: drafts live in localStorage,
// and this worker only answers same-origin GET requests for the files listed below.
const VERSION = '3.0.0';
const CACHE = 'psyclerk-v3-' + VERSION;
const APP_FILES = [
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'vendor/fontawesome/css/all.min.css',
  'vendor/fontawesome/webfonts/fa-solid-900.woff2',
  'vendor/fontawesome/webfonts/fa-regular-400.woff2',
  'vendor/fontawesome/webfonts/fa-brands-400.woff2',
  'vendor/fontawesome/webfonts/fa-v4compatibility.woff2',
  'js/notes.js',
  'js/drafts-store.js',
  'js/form-state.js',
  'js/drafts-ui.js',
  'js/layout.js',
  'js/phrases.js',
  'js/sw-register.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('psyclerk-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
