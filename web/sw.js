/* Service worker: deja la app guardada en el celular para abrir rápido y sin señal.
   Estrategia "primero la red": si hay conexión siempre baja la última versión publicada;
   sin conexión usa la copia guardada. Los datos (Supabase) nunca pasan por acá. */
const VERSION = "pyp-2026-10-20-1";
// Sin "index.html": Cloudflare Pages lo redirige a "./" y una respuesta redirigida no sirve para abrir la app.
const ARCHIVOS = ["./", "styles.css", "app.js", "backend.js", "config.js", "vendor/supabase.js",
  "manifest.webmanifest", "privacidad", "icons/icono.svg", "icons/icono-192.png", "icons/icono-512.png",
  "icons/icono-maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  // Uno por uno: si falta un archivo, igual se guardan los demás.
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(ARCHIVOS.map((a) => c.add(a)))).then(() => self.skipWaiting()));
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
      if (r.ok && !r.redirected) { const c = await caches.open(VERSION); await c.put(e.request, r.clone()); }
      return r;
    } catch {
      return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match("./")) || Response.error();
    }
  })());
});
