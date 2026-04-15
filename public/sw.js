const CACHE_NAME = 'hellofinity-react-v3';

self.addEventListener('install', event => {
  // Skip precaching — let the fetch handler cache on demand.
  // This avoids installation failures if any URL is temporarily unreachable.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  // Don't call clients.claim() — it can trigger unexpected page reloads when
  // a new SW activates. Pages that reload naturally will pick up the new SW.
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never intercept Supabase API calls
  if (url.hostname.includes('supabase')) return;

  // For HTML navigation requests — always network first so users get fresh
  // HTML (and therefore fresh JS bundle references) on every page load.
  // Only fall back to cache if the network is completely unavailable.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For all other static assets — cache first, update in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
