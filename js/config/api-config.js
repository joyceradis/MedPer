function readMeta(name){
  if(typeof document==='undefined')return'';
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim()||'';
}

const runtimeBase=typeof globalThis.MEDPER_API_URL==='string'?globalThis.MEDPER_API_URL.trim():'';
const metaBase=readMeta('medper-api-url');
const baseUrl=(runtimeBase||metaBase).replace(/\/+$/,'');

export const API_CONFIG=Object.freeze({baseUrl});

export function isApiConfigured(){
  return /^https?:\/\//.test(API_CONFIG.baseUrl);
}
