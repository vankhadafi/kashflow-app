const CACHE_NAME = 'kashflow-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Hanya cache request GET statis, jangan cache API call ke backend Aiven
  if (e.request.url.includes('/api')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).catch(() => cached);
    })
  );
});
