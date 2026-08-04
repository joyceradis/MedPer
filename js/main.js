import { createStore } from './core/store.js';
import { createApp } from './ui/app.js';
import { installDialogController } from './ui/dialog-controller.js';
import { createAuthController } from './auth/auth-controller.js';

const root=document.querySelector('#app');
const toast=document.querySelector('#toast');
const store=createStore();
let appStarted=false;
let auth=null;

installDialogController(document);

function startApplication(){
  if(appStarted)return;
  appStarted=true;
  root.replaceChildren();
  createApp({store,root,toast,auth});
}

auth=await createAuthController({
  root,
  onAccessGranted:startApplication,
  onAccessRevoked:()=>window.location.reload()
});

if(auth.getState().appStarted)startApplication();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{}));
}
