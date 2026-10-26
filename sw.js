// Service Worker: Spiel offline verfügbar machen (Home-Bildschirm, unterwegs).
// Bei jeder Veröffentlichung VERSION erhöhen (macht veroeffentlichen.sh automatisch).
const VERSION = 'a3b3767-20261026111944';
const CACHE = 'darts-rechnen-' + VERSION;
const FILES = ['./', 'index.html', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('darts-rechnen-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Netz zuerst (damit Updates ankommen), nach 3 s oder ohne Netz aus dem Speicher
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Zeitüberschreitung')), 3000))
      ]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true })
        || (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
      if (hit) return hit;
      throw err;
    }
  })());
});
