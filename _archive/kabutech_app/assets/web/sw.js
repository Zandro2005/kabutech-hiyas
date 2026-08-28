const CACHE_NAME = 'kabutech-hiyas-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './loading_screen/screen.png',
  './assets/tailwind.js',
  './assets/material-symbols.css',
  './assets/plus-jakarta-sans.css',
  './assets/fonts/material-symbols-outlined-100.ttf',
  './assets/fonts/material-symbols-outlined-200.ttf',
  './assets/fonts/material-symbols-outlined-300.ttf',
  './assets/fonts/material-symbols-outlined-400.ttf',
  './assets/fonts/material-symbols-outlined-500.ttf',
  './assets/fonts/material-symbols-outlined-600.ttf',
  './assets/fonts/material-symbols-outlined-700.ttf',
  './assets/fonts/plus-jakarta-sans-300.ttf',
  './assets/fonts/plus-jakarta-sans-400.ttf',
  './assets/fonts/plus-jakarta-sans-500.ttf',
  './assets/fonts/plus-jakarta-sans-600.ttf',
  './assets/fonts/plus-jakarta-sans-700.ttf',
  './assets/fonts/plus-jakarta-sans-800.ttf'
];

const CDN_ASSETS = [];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell and Static Assets');
      // Pre-cache static assets and key CDN assets
      return Promise.all(
        [...STATIC_ASSETS, ...CDN_ASSETS].map((url) => {
          return fetch(url)
            .then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
              throw new Error(`Failed to fetch ${url}`);
            })
            .catch((err) => {
              console.warn(`[Service Worker] Pre-cache failed for ${url}:`, err);
            });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Caching Strategy:
  // 1. For Google Fonts font files (from fonts.gstatic.com), use Cache-First Strategy
  if (requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. For local index.html or root, use Network-First Strategy to ensure users get updates when online
  const isLocalHtml = requestUrl.origin === self.location.origin && 
                      (requestUrl.pathname === '/' || requestUrl.pathname.endsWith('index.html'));
  
  if (isLocalHtml) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. For all other resources (static/CDN), use Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Ignore network errors for stale-while-revalidate
        });

      return cachedResponse || fetchPromise;
    })
  );
});
