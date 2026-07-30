// YBEES Employee Portal — Service Worker
// Purpose: make the app installable (PWA) and let the shell load instantly /
// offline. It deliberately does NOT cache calls to the Apps Script backend —
// those always go to the network, so employee/attendance data is never stale.
//
// IMPORTANT: bump CACHE_NAME every time you deploy a change. Browsers only
// check for a new service worker when the file's bytes differ from what
// they already have — changing this string is what triggers that check.
const CACHE_NAME = "ybees-portal-shell-v3";
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
      .then(() => self.skipWaiting()) // don't wait for old tabs to close
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim()) // take control of already-open tabs now
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

  // Navigations (loading/reloading the HTML shell) — network-first, so
  // updates show up immediately instead of serving a stale cached page.
  // Falls back to the cached shell only if the network is unreachable.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Everything else (icons, manifest, etc.) — cache-first is fine since
  // these rarely change; refresh the cache quietly in the background.
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
      return cached || networkFetch;
    })
  );
});
