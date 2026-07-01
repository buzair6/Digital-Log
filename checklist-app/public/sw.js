const CACHE = 'digitallog-v2';
const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)$/;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API requests: network-only with offline fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchAndCache = fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        });
        return cached || fetchAndCache;
      })
    );
    return;
  }

  // Everything else (HTML pages, navigation): network-first
  e.respondWith(
    fetch(e.request)
      .then((res) => res)
      .catch(() => caches.match(e.request))
  );
});
