// Files to cache
const CACHE_PREFIX = 'vue-spa-template';
const CACHE_NAME = `${CACHE_PREFIX}-%VERSION%`;
const APP_URL = '%APP_URL%';
const appShellFiles = [
  '/favicon.ico',
  '/index.html',
  '/app.d.ts',
  '/imgs/logo.svg',
  '/utilities/strings.mjs',
  '/utilities/css.mjs',
  '/utilities/dates.mjs',
  '/components/Header.mjs',
  '/components/Page.mjs',
  '/components/Modal.mjs',
  '/components/ExampleModal.mjs',
  '/components/App.mjs',
  '/components/ConfirmModal.mjs',
  '/components/ProgrammaticModals.mjs',
  '/index.mjs',
  '/deps/date-fns.mjs',
  '/deps/route-parser.mjs',
  '/deps/polyfills.mjs',
  '/deps/goober.mjs',
  '/deps/polyfills/anchorPositioning.mjs',
  '/deps/vue.mjs',
  '/pages/Home.mjs',
  '/services/routes.mjs',
  '/services/data/lifecycle.mjs',
  '/services/data/common.mjs',
  '/services/data/viewport.mjs',
];
const contentToCache = appShellFiles;

console.debug(`Service Worker: ${CACHE_NAME}`);

// Installing Service Worker
self.addEventListener('install', (e) => {
  console.debug('[Service Worker] Install');
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    console.debug('[Service Worker] Caching all: app shell and content');
    await cache.addAll(contentToCache);
  })());
});

// Clean up redundant caches
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (CACHE_NAME !== cacheName && cacheName.startsWith(CACHE_PREFIX)) {
            console.debug(`[Service Worker] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
  // Only cache requests that match items in our appShellFiles list
  const url = new URL(e.request.url);
  const requestPath = url.pathname;
  
  // Check if the request path is in our appShellFiles list
  const shouldCache = appShellFiles.some(file => {
    // Convert the relative paths in appShellFiles to pathname format
    const filePath = file.startsWith('/') ? file : `/${file}`;
    return requestPath === filePath;
  });
  
  if (shouldCache) {
    console.debug(`[Service Worker] Handling app shell resource: ${requestPath}`);
    e.respondWith((async () => {
      const r = await caches.match(e.request);
      console.debug(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (r) return r;
      const response = await fetch(e.request);
      const cache = await caches.open(CACHE_NAME);
      console.debug(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })());
  }
  // For all other requests, let the browser handle them normally
  // by not calling e.respondWith()
});
