import { createStore } from './core/store.js';
import { createApp } from './ui/app.js';
import { installDialogController } from './ui/dialog-controller.js';

const root=document.querySelector('#app');
const toast=document.querySelector('#toast');
const store=createStore();

installDialogController(document);
createApp({store,root,toast});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
