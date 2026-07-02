/* Offline service worker — cache-first for same-origin assets.
   Cross-origin requests (e.g. narration audio on object storage) pass through. */
const CACHE = 'talk-template-v2';
const CORE = [
  './', 'index.html',
  'css/theme-cambridge.css',
  'dist/reset.css', 'dist/reveal.css', 'dist/theme/white.css',
  'dist/reveal.js',
  'dist/plugin/notes.js', 'dist/plugin/highlight.js', 'dist/plugin/zoom.js',
  'dist/plugin/highlight/monokai.css',
  'plugin/menu/menu.js', 'plugin/menu/menu.css',
  'plugin/chalkboard/plugin.js', 'plugin/chalkboard/style.css',
  'js/talk.js', 'js/narration.js',
  'vendor/katex/katex.min.css', 'vendor/katex/katex.min.js',
  'vendor/katex/contrib/auto-render.min.js',
  'vendor/fonts/lmsans-regular.woff', 'vendor/fonts/lmsans-bold.woff',
  'vendor/fonts/lmsans-oblique.woff', 'vendor/fonts/lmsans-boldoblique.woff'
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
