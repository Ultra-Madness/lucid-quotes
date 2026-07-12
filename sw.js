/* Lucid — service worker.

   Two things here are load-bearing; don't "simplify" them away:

   1. CACHE_PREFIX. Every project you publish to GitHub Pages lives on the SAME
      origin (ultra-madness.github.io), so they all share one cache store. If we
      cleaned up by deleting "every cache that isn't ours", we'd nuke the offline
      cache of your other apps. We only ever delete OUR OWN old caches.

   2. cache: 'reload' on the network fetches. GitHub Pages serves assets with
      max-age=600, so a plain fetch() can be answered from the browser's HTTP
      cache with a stale file for ten minutes after a deploy — which makes a
      "network-first" strategy quietly serve old content. 'reload' bypasses it.

   CI stamps CACHE with a build timestamp on every deploy. */

const CACHE_PREFIX = 'lucid-';
const CACHE = 'lucid-v1.5.0';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './quotes.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 'reload' = go to the network, ignore the HTTP cache. Without this the
      // shell can be cached stale straight out of the browser's own cache.
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)   // ONLY our own
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;      // leave fonts/CDNs alone
  if (!url.pathname.startsWith(new URL('./', location).pathname)) return;  // not our scope

  // Quotes: network-first, bypassing the HTTP cache, so edits from your phone
  // show up on the next open instead of ten minutes later.
  if (url.pathname.endsWith('quotes.js')) {
    e.respondWith(
      fetch(new Request(req.url, { cache: 'reload' }))
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else: cache-first, fall back to network, then cache the result.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
