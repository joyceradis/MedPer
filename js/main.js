import { createStore } from './core/store.js';
import { createCaseStateSyncController } from './core/case-state-sync-controller.js';
import { createCaseStateClient } from './api/case-state-client.js';
import { createCaseFilesClient } from './api/case-files-client.js';
import { API_CONFIG } from './config/api-config.js';
import { createApp } from './ui/app.js';
import { installDialogController } from './ui/dialog-controller.js';
import { installInspectorController } from './ui/inspector-controller.js';
import { installSurfaceController } from './ui/surface-controller.js';
import { installMethodContextController } from './ui/method-context-controller.js';
import { installCaseFilesController } from './ui/case-files-controller.js';
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
let caseFiles=null;
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

// Documentos dos autos só existem com servidor: eles são gravados cifrados lá e
// nunca neste dispositivo. Sem conexão, o controlador não monta e a etapa mostra
// o aviso que já vem no HTML, em vez de um botão de anexar que não anexaria.
function installCaseFiles(){
  if(caseFiles||!auth?.getAccessToken)return;
  const client=createCaseFilesClient({baseUrl:API_CONFIG.baseUrl,getAccessToken:()=>auth.getAccessToken()});
  if(!client.enabled)return;
  caseFiles=installCaseFilesController({root,store,client});
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
  installCaseFiles();
}

auth=await createAuthController({
  root,
  onAccessGranted:startApplication,
  onAccessRevoked:()=>{
    sync?.destroy();
    inspector?.destroy();
    surfaces?.destroy();
    methodContext?.destroy();
    caseFiles?.destroy();
    window.location.reload();
  }
});

if(auth.getState().appStarted)startApplication();

window.addEventListener('pagehide',()=>{void sync?.syncAll();});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{}));
}
