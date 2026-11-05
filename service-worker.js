/* 11AM Hikam — offline-first single-page study book.
 * Entire chapter corpus lives in ./index.html. All same-origin app assets
 * are pre-cached atomically at installation; a failed precache leaves the
 * previous installed version intact. Update version at each book build.
 * Browser storage can still be cleared/evicted by the OS; not a guarantee. */
const PREFIX = '11am-hikam-reader-';
const CACHE_NAME = PREFIX + '0ed351d61082';
const APP_SHELL = [
  './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];
const SCOPE_URL = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(APP_SHELL))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith(PREFIX) && n !== CACHE_NAME).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const statuses = await Promise.all(APP_SHELL.map(async p => Boolean(await cache.match(p))));
      event.source?.postMessage({type:'OFFLINE_STATUS',ready:statuses.every(Boolean),items:statuses.filter(Boolean).length,total:statuses.length});
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // GitHub Pages app lives under /11am-hikam/, never intercept other projects.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;
  if (request.mode === 'navigate') {
    // Offline-first and immediate; on a fresh deployment the browser's SW
    // update check replaces this version with the new atomically cached book.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match('./index.html');
      if (saved) return saved;
      try {return await fetch(request);} catch {return Response.error();}
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetch(request); // no silent cache of arbitrary third-party content
  })());
});
