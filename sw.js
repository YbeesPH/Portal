// YBEES Employee Portal — Service Worker
// Purpose: make the app installable (PWA) and let the shell load instantly /
// offline. It deliberately does NOT cache calls to the Apps Script backend —
// those always go to the network, so employee/attendance data is never stale.

const CACHE_NAME = "ybees-portal-shell-v2";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache/intercept calls to the Google Apps Script backend —
  // always hit the network so login, employee, and attendance data stay live.
  if (url.hostname.includes("script.google.com") || url.hostname.includes("script.googleusercontent.com")) {
    return; // let the browser handle it normally
  }

  // Only handle GET requests for our own shell files.
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline: fall back to whatever's cached

      // Cache-first for instant loads; refresh the cache in the background.
      return cached || networkFetch;
    })
  );
});
