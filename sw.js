const CACHE_PREFIX='medper-v2-shell-';
const CACHE_NAME=`${CACHE_PREFIX}20261020-pro-adapter`;
const APP_SHELL=[
  './','./index.html','./app.html','./manifest.webmanifest','./icon.svg',
  './css/marketing.css','./css/context-methodology.css','./css/v2.css','./css/v2-premium.css',
  './js/v2/app.js','./js/v2/case-record.js','./js/v2/repository.js','./js/v2/repository-selector.js','./js/v2/remote-repository.js','./js/v2/method-router.js','./js/v2/document.js',
  './js/methodology/aipe.js','./js/methodology/posas.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  // Authenticated professional UI, session logic and configuration MUST never
  // be served from the offline cache, including an offline navigation fallback.
  if(url.pathname.endsWith('/professional.html') ||
     url.pathname.includes('/js/professional/') ||
     url.pathname.endsWith('/js/v2/remote-repository.js') ||
     url.pathname.endsWith('/js/v2/repository-selector.js')) {
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }
  const fresh=/\.(?:js|css|html)$/.test(url.pathname)||event.request.mode==='navigate';
  if(fresh){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response.ok){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)));
      }
      return response;
    }).catch(async error=>{
      const cache=await caches.open(CACHE_NAME);
      const cached=await cache.match(event.request);
      if(cached) return cached;
      if(event.request.mode==='navigate'){
        const fallback=await cache.match(url.pathname.endsWith('/app.html')?'./app.html':'./index.html');
        if(fallback) return fallback;
      }
      throw error;
    }));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(async cache=>{
    const cached=await cache.match(event.request);
    if(cached) return cached;
    const response=await fetch(event.request);
    if(response.ok){
      const copy=response.clone();
      event.waitUntil(cache.put(event.request,copy));
    }
    return response;
  }));
});
