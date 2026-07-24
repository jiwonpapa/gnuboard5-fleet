/* global self, caches, fetch, URL, Response */

const CACHE_NAME = "g5-fleet-static-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/g5-fleet-icon.svg"];
const CACHEABLE_DESTINATIONS = new Set(["script", "style", "image", "font"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    isSensitivePath(url.pathname)
  ) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstAppShell(request));
    return;
  }
  if (
    CACHEABLE_DESTINATIONS.has(request.destination) ||
    APP_SHELL.includes(url.pathname)
  ) {
    event.respondWith(cacheFirstStatic(request));
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};
  const title = typeof payload.title === "string" ? payload.title : "G5 Fleet";
  const body = typeof payload.body === "string" ? payload.body : "";
  const actionPath = safeActionPath(payload.action_path);
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/g5-fleet-icon.svg",
      data: { actionPath },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const actionPath = safeActionPath(event.notification.data?.actionPath);
  event.waitUntil(self.clients.openWindow(actionPath));
});

function isSensitivePath(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname === "/healthz" ||
    pathname === "/readyz"
  );
}

function safeActionPath(value) {
  return typeof value === "string" &&
      value.startsWith("/") &&
      !value.startsWith("//")
    ? value
    : "/";
}

async function networkFirstAppShell(request) {
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname === "/") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return (await caches.match("/")) ?? Response.error();
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}
