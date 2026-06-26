const CACHE_NAME = "studio-pilates-cache-v4";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/dashboard.html",

  "/app.js",

  "/js/utils/date.js",
  "/js/utils/format.js",
  "/js/utils/id.js",
  "/js/utils/dom.js",

  "/js/core/supabase.js",
  "/js/core/db.js",
  "/js/state/state.js",

  "/js/modules/clienti.js",

  "/manifest.json",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request);
    })
  );
});
