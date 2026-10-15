// Only a neutral offline page is cached. Never store patient pages or API data.
const CACHE = "ace-fisio-offline-v2";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add("/offline.html")));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("ace-fisio-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.mode !== "navigate" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((self.navigator.onLine === false
    ? Promise.reject(new Error("offline"))
    : fetch(event.request, { cache: "no-store" }))
    .catch(() => caches.match("/offline.html")));
});
