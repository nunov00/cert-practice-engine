// Service worker: lets the installed app open and run free drills offline.
// - Pages: network first, falling back to the last cached copy.
// - /api/: never cached.
// - Build assets (/_next/static, /icons): cache first; their names change per build.
// Bump VERSION to drop old caches after a change to this file.
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const PRECACHE = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API responses (the private feedback inbox) are never cached.
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(ASSETS)).put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(PAGES)).put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const home = await caches.match("/", { ignoreVary: true });
      if (home) return home;
    }
    throw err;
  }
}
