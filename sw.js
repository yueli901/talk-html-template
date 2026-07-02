/* Offline service worker — cache-first for same-origin assets.
   Cross-origin requests (e.g. narration audio on object storage) pass through. */
const CACHE = 'talk-template-v1';
const CORE = [
  './', 'index.html',
  'css/theme-cambridge.css',
  'dist/reset.css', 'dist/reveal.css', 'dist/theme/white.css',
  'dist/reveal.js',
  'js/talk.js', 'js/narration.js',
  'vendor/katex/katex.min.css', 'vendor/katex/katex.min.js',
  'vendor/katex/contrib/auto-render.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u)))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // let object-storage audio go to network
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        (await caches.open(CACHE)).put(req, copy);
      }
      return res;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
