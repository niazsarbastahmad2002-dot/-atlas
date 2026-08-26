const ATLAS_OFFLINE_CACHE = "atlas-offline-shell-v1";
const ATLAS_OFFLINE_PAGE = "/atlas-offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ATLAS_OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(ATLAS_OFFLINE_PAGE, { cache: "reload" })))
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
  if (request.mode !== "navigate" || request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/dashboard")) return;

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
