const ATLAS_OFFLINE_CACHE = "atlas-offline-shell-v4";
const ATLAS_OFFLINE_PAGE = "/atlas-offline.html";
const ATLAS_LOCAL_PAGE = "/atlas-local.html";
const ATLAS_LOCAL_SCRIPT = "/atlas-local.js";
const ATLAS_LOCAL_MANIFEST = "/atlas-local.webmanifest";
const ATLAS_LOCAL_ICON = "/atlas-icon.svg";

const ATLAS_LOCAL_ASSETS = new Set([
  ATLAS_LOCAL_SCRIPT,
  ATLAS_LOCAL_MANIFEST,
  ATLAS_LOCAL_ICON,
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ATLAS_OFFLINE_CACHE)
      .then((cache) => cache.addAll([
        new Request(ATLAS_OFFLINE_PAGE, { cache: "reload" }),
        new Request(ATLAS_LOCAL_PAGE, { cache: "reload" }),
        new Request(ATLAS_LOCAL_SCRIPT, { cache: "reload" }),
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

async function networkFirstLocalAsset(request) {
  const cache = await caches.open(ATLAS_OFFLINE_CACHE);
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached ?? new Response("Atlas Local asset is unavailable on this device.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (ATLAS_LOCAL_ASSETS.has(url.pathname)) {
    event.respondWith(networkFirstLocalAsset(request));
    return;
  }

  if (request.mode !== "navigate") return;

  if (url.pathname === ATLAS_LOCAL_PAGE) {
    event.respondWith((async () => {
      const cache = await caches.open(ATLAS_OFFLINE_CACHE);
      try {
        const response = await fetch(new Request(request, { cache: "no-store" }));
        if (response.ok) {
          await cache.put(ATLAS_LOCAL_PAGE, response.clone());
          return response;
        }
        const fallback = await cache.match(ATLAS_LOCAL_PAGE);
        return fallback ?? response;
      } catch {
        const fallback = await cache.match(ATLAS_LOCAL_PAGE);
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
