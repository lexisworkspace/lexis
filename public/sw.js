const CACHE_NAME = "lexis-v5";
const PRECACHE = ["/lexis-logo.png", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Navigation requests (HTML pages) — ALWAYS go to network, never cache
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request));
    return;
  }

  // Static assets — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then((r) =>
      r || fetch(e.request).then((res) => {
        // Only cache same-origin and successful responses
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
    )
  );
});

/* ── Push Notifications ──────────────────────────────────────── */
self.addEventListener("push", (e) => {
  if (!e.data) return;
  let payload;
  try {
    payload = e.data.json();
  } catch {
    payload = { title: "Lexis", body: e.data.text() };
  }
  const options = {
    body: payload.body || "",
    icon: "/lexis-logo.png",
    badge: "/lexis-logo.png",
    tag: payload.tag || "lexis-reminder",
    data: { href: payload.href || "/" },
    vibrate: [100, 50, 100],
    silent: false,
  };
  e.waitUntil(self.registration.showNotification(payload.title || "Lexis", options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const href = e.notification.data?.href || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(href);
          return;
        }
      }
      return self.clients.openWindow(href);
    })
  );
});

self.addEventListener("sync", (e) => {
  if (e.tag === "lexis-sync") {
    e.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "sync-triggered" }));
      })
    );
  }
});
