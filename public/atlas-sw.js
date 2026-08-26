const ATLAS_OFFLINE_CACHE = "atlas-offline-shell-v2";
const ATLAS_OFFLINE_PAGE = "/atlas-offline.html";
const ATLAS_LOCAL_PAGE = "/atlas-local.html";
const ATLAS_LOCAL_MANIFEST = "/atlas-local.webmanifest";
const ATLAS_LOCAL_ICON = "/atlas-icon.svg";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ATLAS_OFFLINE_CACHE)
      .then((cache) => cache.addAll([
        new Request(ATLAS_OFFLINE_PAGE, { cache: "reload" }),
        new Request(ATLAS_LOCAL_PAGE, { cache: "reload" }),
        new Request(ATLAS_LOCAL_MANIFEST, { cache: "reload" }),
        new Request(ATLAS_LOCAL_ICON, { cache: "reload" }),
      ]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("atlas-offline-shell-") && key !== ATLAS_OFFLINE_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === ATLAS_LOCAL_MANIFEST || url.pathname === ATLAS_LOCAL_ICON) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return fetch(request);
    })());
    return;
  }

  if (request.mode !== "navigate") return;

  if (url.pathname === ATLAS_LOCAL_PAGE) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
        const fallback = await caches.match(ATLAS_LOCAL_PAGE);
        return fallback ?? response;
      } catch {
        const fallback = await caches.match(ATLAS_LOCAL_PAGE);
        return fallback ?? new Response("Atlas Local is unavailable on this device.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
    return;
  }

  if (!url.pathname.startsWith("/dashboard")) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok || response.status < 500) return response;
      const fallback = await caches.match(ATLAS_OFFLINE_PAGE);
      return fallback ?? response;
    } catch {
      const fallback = await caches.match(ATLAS_OFFLINE_PAGE);
      return fallback ?? new Response("Atlas is offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  })());
});
