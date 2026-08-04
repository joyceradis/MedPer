import { createStore } from './core/store.js';
import { createApp } from './ui/app.js';
import { installDialogController } from './ui/dialog-controller.js';
import { createAuthController } from './auth/auth-controller.js';

const root=document.querySelector('#app');
const toast=document.querySelector('#toast');
const store=createStore();
let appStarted=false;

installDialogController(document);

const auth=await createAuthController({root});

function startApplicationWhenAllowed(state=auth.getState()){
  if(appStarted||!state.appStarted)return;
  appStarted=true;
  createApp({store,root,toast,auth});
}

startApplicationWhenAllowed();
auth.subscribe(startApplicationWhenAllowed);

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
