const CACHE_NAME='medper-shell-v33-20260817';
const APP_SHELL=['./','./index.html','./app.html','./css/marketing.css','./css/design-system.css','./css/styles.css','./css/dashboard.css','./css/inspector.css','./css/methodology.css','./css/guided-methodology.css','./css/context-methodology.css','./css/knowledge.css','./css/auth.css','./css/phase2.css','./js/main.js','./js/core/store.js','./js/core/case-lifecycle.js','./js/core/case-state-sync-controller.js','./js/api/case-state-client.js','./js/api/auth-client.js','./js/config/api-config.js','./js/auth/api-session.js','./js/methodology/context-resolver.js','./js/methodology/protocols.js','./js/methodology/engine.js','./js/methodology/aipe.js','./js/knowledge/library.js','./js/models/checklists.js','./js/ui/workflow.js','./js/ui/dashboard-model.js','./js/ui/dashboard-view.js','./js/ui/surface-controller.js','./js/ui/case-inspector.js','./js/ui/inspector-controller.js','./js/ui/method-context-controller.js','./js/ui/app.js','./js/ui/dialog-controller.js','./js/auth/auth-controller.js','./js/config/supabase-config.js','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const isFreshAsset=url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname.endsWith('.html');
  if(event.request.mode==='navigate'||isFreshAsset){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      const clone=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(event.request,clone));
      return response;
    }).catch(async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      const isAppNavigation=url.pathname.endsWith('/app.html')||url.pathname.includes('/app.html');
      return caches.match(isAppNavigation?'./app.html':'./index.html');
    }));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone()));
    return response;
  })));
});
