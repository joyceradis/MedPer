import { createStore } from './core/store.js';
import { createCaseStateSyncController } from './core/case-state-sync-controller.js';
import { createCaseStateClient } from './api/case-state-client.js';
import { API_CONFIG } from './config/api-config.js';
import { createApp } from './ui/app.js';
import { installDialogController } from './ui/dialog-controller.js';
import { installInspectorController } from './ui/inspector-controller.js';
import { installSurfaceController } from './ui/surface-controller.js';
import { installMethodContextController } from './ui/method-context-controller.js';
import { createAuthController } from './auth/auth-controller.js';
import { installOnboardingEnhancer } from './auth/onboarding-enhancer.js';

const root=document.querySelector('#app');
const toast=document.querySelector('#toast');
const store=createStore();
let appStarted=false;
let auth=null;
let inspector=null;
let surfaces=null;
let methodContext=null;
let sync=null;

installDialogController(document);
installOnboardingEnhancer(document);

function showSyncStatus(event){
  if(!toast||!event)return;
  if(event.status==='conflict'){
    toast.textContent='Há uma versão mais recente deste caso no servidor. O conteúdo local foi preservado.';
    toast.classList.add('is-visible');
  }else if(event.status==='error'){
    toast.textContent='O caso continua salvo neste dispositivo; a sincronização remota será tentada novamente.';
    toast.classList.add('is-visible');
  }
}

function installSync(){
  if(sync||!auth?.getAccessToken)return;
  const client=createCaseStateClient({baseUrl:API_CONFIG.baseUrl,getAccessToken:()=>auth.getAccessToken()});
  if(!client.enabled)return;
  sync=createCaseStateSyncController({store,client,onStatus:showSyncStatus});
  void sync.hydrate().then(()=>sync.syncAll()).catch(error=>showSyncStatus({status:'error',error}));
}

function startApplication(){
  if(appStarted)return;
  appStarted=true;
  root.replaceChildren();
  createApp({store,root,toast,auth});
  inspector=installInspectorController({root,store});
  surfaces=installSurfaceController({root,store});
  methodContext=installMethodContextController({root,store});
  installSync();
}

auth=await createAuthController({
  root,
  onAccessGranted:startApplication,
  onAccessRevoked:()=>{
    sync?.destroy();
    inspector?.destroy();
    surfaces?.destroy();
    methodContext?.destroy();
    window.location.reload();
  }
});

if(auth.getState().appStarted)startApplication();

window.addEventListener('pagehide',()=>{void sync?.syncAll();});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{}));
}
