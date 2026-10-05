// Service Worker：讓 App 可安裝到手機桌面，且離線時仍可看到上次載入的新聞。
const CACHE = 'ai-news-v2';
const SHELL = ['/', '/index.html', '/style.css', '/icon.svg', '/manifest.webmanifest', '/js/common.js', '/js/render.js', '/js/news.js', '/js/tools.js', '/js/playbook.js', '/js/studio.js', '/js/main.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // 一律先走網路，失敗才用快取（新聞要新鮮）
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
