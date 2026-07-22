// MASHENSTEIN service worker: the game is never stale.
//
// The problem it exists for: added to an iPhone Home Screen, the game is
// launched from a saved snapshot and iOS is extremely relaxed about ever
// checking for a new one — players kept opening a build from weeks ago. GitHub
// Pages will not let us set Cache-Control headers to argue with that, so the
// page fetches itself instead.
//
// Policy: NETWORK-FIRST for anything on our own origin, with `cache: 'no-store'`
// so the request skips the HTTP cache the standalone app is hoarding. The cache
// is a fallback for being offline, never the first answer. Cross-origin (the
// Google Fonts CSS and its woff2 files) is cache-first, because those URLs are
// content-addressed and re-fetching them every launch buys nothing.
//
// Version is stamped in by build/build.js from a hash of the built page, so
// this file's bytes change whenever the game does — which is what makes the
// browser notice a new worker at all.
const VERSION = '__VERSION__';
const CACHE = `mashenstein-${VERSION}`;

self.addEventListener('install', (e) => {
  // No waiting for every tab to close: an update the player cannot see is the
  // bug this worker was written to fix.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) {
    // Fonts: serve from cache, refresh in the background.
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const live = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
        return res;
      }).catch(() => null);
      return hit || (await live) || Response.error();
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Refetch by URL rather than replaying the Request: a navigation request
      // cannot be re-inited without tripping over its own 'navigate' mode, and
      // 'no-store' is the whole point — it walks past the stale copy iOS is
      // holding instead of revalidating it politely.
      const fresh = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin' });
      if (fresh && fresh.ok) {
        // Index is cached under './' as well so an offline launch of the bare
        // directory URL still finds it.
        cache.put(req, fresh.clone()).catch(() => {});
        if (req.mode === 'navigate') cache.put('./', fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      // Offline. Anything we have beats a browser error page.
      const hit = await cache.match(req) || (req.mode === 'navigate' ? await cache.match('./') : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
