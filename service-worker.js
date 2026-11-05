/* 11AM Hikam — atomic offline book, page-scope safe, content-hashed releases.
 * External Google Fonts are cached only after online acquisition; font bytes
 * are not copied into the repository. Storage may still be cleared by a device.
 */
const PREFIX = '11am-hikam-reader-';
const CACHE_NAME = PREFIX + '15dcb90c1362';
const FONT_CACHE_NAME = '11am-hikam-cdn-fonts-v1';
const APP_SHELL = [
  './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './og-image.jpg', './404.html', './sitemap.xml', './robots.txt'
];
const SCOPE_URL = new URL(self.registration.scope);

const isAllowedFont = (url) => url.protocol === 'https:' && (
  (url.hostname === 'fonts.googleapis.com' && url.pathname.startsWith('/css2')) ||
  (url.hostname === 'fonts.gstatic.com' && url.pathname.startsWith('/s/'))
);

self.addEventListener('install', (event) => {
  // All required same-origin files must be saved before this version activates.
  event.waitUntil(caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(APP_SHELL))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    // The separate font cache intentionally persists across book releases.
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const statuses = await Promise.all(APP_SHELL.map(async (p) => Boolean(await cache.match(p))));
      event.source?.postMessage({type:'OFFLINE_STATUS', ready:statuses.every(Boolean), items:statuses.filter(Boolean).length, total:statuses.length});
    })());
  }
  if (event.data?.type === 'PREPARE_FONTS') {
    event.waitUntil((async () => {
      const requested = Array.isArray(event.data.urls) ? event.data.urls.slice(0,90) : [];
      const urls = [...new Set(requested.filter((v) => typeof v === 'string' && v.length < 2048))]
        .map((v) => { try { return new URL(v); } catch { return null; } })
        .filter((url) => url && isAllowedFont(url));
      const cache = await caches.open(FONT_CACHE_NAME);
      let stored = 0;
      const outcomes = await Promise.allSettled(urls.map(async (url) => {
        const key = url.href;
        if (await cache.match(key, {ignoreVary:true})) { stored++; return; }
        // Google stylesheets may be opaque; gstatic WOFF2 allows CORS.
        const response = await fetch(key, {mode:url.hostname === 'fonts.gstatic.com' ? 'cors' : 'no-cors',credentials:'omit'});
        if (!response.ok && response.type !== 'opaque') throw new Error('Font CDN response not cacheable');
        await cache.put(key,response);
        stored++;
      }));
      event.ports?.[0]?.postMessage({type:'FONTS_PREPARED',stored,requested:urls.length,failed:outcomes.filter((x) => x.status === 'rejected').length});
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isAllowedFont(url)) {
    // Cache the original remotely licensed font responses as the reader uses them.
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE_NAME);
      const stored = await cache.match(request, {ignoreVary:true});
      if (stored) return stored;
      try {
        const fresh = await fetch(request);
        if (fresh.ok || fresh.type === 'opaque') event.waitUntil(cache.put(request, fresh.clone()));
        return fresh;
      } catch { return Response.error(); }
    })());
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;

  if (request.mode === 'navigate') {
    // Instant offline reading. The newly activated worker serves the updated
    // book on the next reload, announced by offline-reader.js.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match('./index.html');
      if (saved) return saved;
      try { return await fetch(request); } catch { return Response.error(); }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetch(request);
  })());
});
