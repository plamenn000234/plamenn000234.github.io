/* Chefsheet offline cache. Used by the standalone (Google Play) version only. */
const V="bb-v21";
const SHELL=["./","index.html","index.json","learn.json","manifest.json","icon-192.png","icon-512.png","icon-maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET")return;
  const url=new URL(req.url), same=url.origin===self.location.origin;
  if(same&&(/\.json$/.test(url.pathname)||req.mode==="navigate")){
    // network first for data and the page, cache as fallback
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(req,c))}return r}).catch(()=>caches.match(req).then(r=>r||caches.match("index.html"))));
    return;
  }
  // cache first for fonts, scripts and icons
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok||r.type==="opaque"){const c=r.clone();caches.open(V).then(x=>x.put(req,c))}return r})));
});
self.addEventListener("message",e=>{
  const d=e.data||{}; if(d.type!=="cacheAll"||!Array.isArray(d.urls))return;
  e.waitUntil(caches.open(V).then(async c=>{let ok=0;for(const u of d.urls){try{const r=await fetch(u);if(r.ok){await c.put(u,r);ok++}}catch(_){}}
    const cl=await self.clients.matchAll();cl.forEach(x=>x.postMessage({type:"cached",ok,n:d.urls.length}))}));
});
