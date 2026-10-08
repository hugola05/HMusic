// HMusic V6 — les anciens caches doivent être supprimés après une mise à jour.
const CACHE = "hmusic-v6-sortable";
const STATIC = ["./index.html?v=5", "./style.css?v=5", "./app.js?v=5", "./manifest.json?v=5"];
self.addEventListener("install", event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(STATIC);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith("hmusic-") && n!==CACHE).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event=>{
  const req=event.request;
  if(req.method!=="GET" || new URL(req.url).origin !== self.location.origin) return;
  // Réseau d’abord : une nouvelle publication sur GitHub Pages reste récupérable.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {
      const fresh=await fetch(req);
      if(fresh.ok && (req.mode==="navigate" || /\.(?:js|css|html|json)(?:\?|$)/.test(new URL(req.url).pathname))) {
        await cache.put(req,fresh.clone());
      }
      return fresh;
    } catch(e) {
      const saved=await cache.match(req);
      if(saved) return saved;
      if(req.mode==="navigate") return await cache.match("./index.html?v=5") || Response.error();
      return Response.error();
    }
  })());
});
