// Service worker minimal: membuat aplikasi bisa dipasang (PWA) dan cangkangnya cepat dimuat.
// Data TIDAK di-cache di sini (privasi): hanya berkas statis aplikasi.
const CACHE = 'ols-shell-v1';
const SHELL = ['./', './index.html', './css/base.css', './css/theme-kawaii.css', './css/theme-manifest.css', './css/theme-messenger.css', './css/theme-coquette.css'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // jangan sentuh API/storage Supabase
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ch => ch.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
