const CACHE = "only-us-v5";
const SHELL = ["manifest.webmanifest", "icon.svg", "temple-couple.jpg"];

async function cacheAppShell() {
  const cache = await caches.open(CACHE);
  const home = new URL("./", self.registration.scope);
  const response = await fetch(home, { cache: "no-store" });
  if (!response.ok) throw new Error("首页预缓存失败");
  await cache.put(home, response.clone());
  const html = await response.text();
  const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], home))
    .filter((url) => url.origin === home.origin);
  await Promise.allSettled(
    [...SHELL.map((path) => new URL(path, home)), ...assetUrls].map((url) =>
      cache.add(url)
    )
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(cacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
        ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          caches.match(new URL("./", self.registration.scope))
        )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then(async (response) => {
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      });
      return cached || network;
    })
  );
});
