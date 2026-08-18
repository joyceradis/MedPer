import { createStore } from './core/store.js';
import { createApp } from './ui/app.js';
import { installDialogController } from './ui/dialog-controller.js';
import { installInspectorController } from './ui/inspector-controller.js';
import { installSurfaceController } from './ui/surface-controller.js';
import { installMethodContextController } from './ui/method-context-controller.js';
import { createAuthController } from './auth/auth-controller.js';
import installGreeting from './ui/greeting.js';

const root=document.querySelector('#app');
const toast=document.querySelector('#toast');
const store=createStore();
let appStarted=false;
let auth=null;
let inspector=null;
let surfaces=null;
let methodContext=null;

installDialogController(document);

function startApplication(){
  if(appStarted)return;
  appStarted=true;
  root.replaceChildren();
  createApp({store,root,toast,auth});
  inspector=installInspectorController({root,store});
  surfaces=installSurfaceController({root,store});
  methodContext=installMethodContextController({root,store});
}

auth=await createAuthController({
  root,
  onAccessGranted:startApplication,
  onAccessRevoked:()=>{
    inspector?.destroy();
    surfaces?.destroy();
    methodContext?.destroy();
    window.location.reload();
  }
});

installGreeting({auth, root});

if(auth.getState().appStarted)startApplication();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{}));
}
