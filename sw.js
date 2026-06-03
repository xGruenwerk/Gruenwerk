/* ============================================================
   GrünWerk – Service Worker (echtes Offline)
   Cacht die App + Schriften. Beim ersten Online-Start einmal
   laden, danach läuft alles ohne Internet.
   ============================================================ */
const CACHE = "gruenwerk-v1";

/* Dateien, die zur App selbst gehören */
const CORE = [
  "./",
  "./index.html",
];

/* Beim Installieren: App-Dateien in den Cache legen */
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {})
  );
});

/* Alte Caches aufräumen, sobald eine neue Version aktiv wird */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Anfragen abfangen:
   - App/Schriften: erst Cache, dann Netz; Netz-Antworten werden gecacht
   - so sind die Google-Fonts nach dem ersten Laden dauerhaft offline da */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isFont =
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com");
  const isFirebaseSdk = url.hostname === "www.gstatic.com" && url.pathname.includes("/firebasejs/");
  const isSameOrigin = url.origin === self.location.origin;

  // KI-Backend und Firestore-Datenverkehr niemals abfangen (immer live ans Netz)
  if (isSameOrigin && url.pathname.startsWith("/api/")) return;
  if (url.hostname.includes("googleapis.com") && !isFont) return;
  if (url.hostname.includes("firebaseio.com") || url.hostname.includes("firebaseapp.com")) return;

  if (!isFont && !isFirebaseSdk && !isSameOrigin) return; // sonstige fremde Anfragen nicht anfassen

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // erfolgreiche Antworten in den Cache legen (auch Fonts)
          if (res && (res.status === 200 || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // offline & nicht im Cache: für Seiten-Navigation index.html zeigen
          if (req.mode === "navigate") return caches.match("./index.html");
          return new Response("", { status: 504 });
        });
    })
  );
});
