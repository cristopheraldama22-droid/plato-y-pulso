/* Service worker: deja la app guardada en el celular para abrir rápido y sin señal.
   Estrategia "primero la red": si hay conexión siempre baja la última versión publicada;
   sin conexión usa la copia guardada. Los datos (Supabase) nunca pasan por acá. */
const VERSION = "pyp-2026-10-13-1";
const ARCHIVOS = ["./", "index.html", "styles.css", "app.js", "backend.js", "config.js", "vendor/supabase.js",
  "manifest.webmanifest", "icons/icono.svg", "icons/icono-192.png", "icons/icono-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const r = await fetch(e.request, { cache: "no-cache" });
      if (r.ok) { const c = await caches.open(VERSION); c.put(e.request, r.clone()); }
      return r;
    } catch {
      return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match("index.html")) || Response.error();
    }
  })());
});
