const CACHE_VERSION = "hi-ax-shell-v6";
const INDEX_URL = "/index.html";
const APP_SHELL = [
  "/",
  INDEX_URL,
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const PRIVATE_PATH_PREFIXES = [
  "/functions/",
  "/rest/",
  "/auth/",
  "/storage/",
  "/agent",
  "/health",
  "/repair",
];

async function cacheBuiltShell() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(APP_SHELL);
  const response = await fetch(INDEX_URL, { cache: "reload" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put(INDEX_URL, response);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
    .map((match) => match[1]);
  await Promise.all([...new Set(assets)].map(async (asset) => {
    const assetResponse = await fetch(asset, { cache: "reload" });
    if (assetResponse.ok) await cache.put(asset, assetResponse);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheBuiltShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("hi-ax-shell-") && name !== CACHE_VERSION)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

function mustUseNetwork(request, url) {
  return request.headers.has("Authorization") ||
    PRIVATE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(INDEX_URL, response.clone());
    return response;
  } catch {
    return (await cache.match(INDEX_URL)) ?? (await cache.match("/offline.html"));
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request).then(async (response) => {
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || mustUseNetwork(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (["script", "style", "font", "image"].includes(request.destination) ||
      url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
