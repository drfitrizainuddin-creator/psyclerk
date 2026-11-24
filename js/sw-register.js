// Offline install only when served over http(s); opening the file from disk keeps working without it.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline install unavailable; app still works */ }); });
}
