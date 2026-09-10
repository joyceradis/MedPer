const CACHE_NAME='medper-v2-shell-20260910';
const APP_SHELL=[
  './','./index.html','./app.html','./manifest.webmanifest','./icon.svg',
  './css/marketing.css','./css/v2.css',
  './js/v2/app.js','./js/v2/case-record.js','./js/v2/repository.js','./js/v2/method-router.js','./js/v2/document.js',
  './js/methodology/aipe.js','./js/methodology/posas.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  const fresh=/\.(?:js|css|html)$/.test(url.pathname)||event.request.mode==='navigate';
  if(fresh){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone()));
      return response;
    }).catch(async()=>await caches.match(event.request)||await caches.match(url.pathname.includes('app.html')?'./app.html':'./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone()));return response;})));
});
