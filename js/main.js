import { createStore } from './core/store.js';
import { createApp } from './ui/app.js';

const root=document.querySelector('#app');
const toast=document.querySelector('#toast');
const store=createStore();
createApp({store,root,toast});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
