import { normalizeCaseRecord, serializeCaseRecord, importCaseRecord, touchCase } from './case-record.js';

const DB_NAME='medper-v2';
const STORE='cases';
const LS_KEY='medper:v2:cases';
const LOCK_NAME='medper:v2:cases:write';
const duplicate = () => new Error('Já existe um caso com este identificador. Nada foi substituído; preserve o backup original.');

function readLocal(){
  const raw=localStorage.getItem(LS_KEY);
  const map=raw === null ? {} : JSON.parse(raw);
  if(!map || typeof map !== 'object' || Array.isArray(map))
    throw new Error('Armazenamento local inválido. Preserve o conteúdo original para recuperação.');
  return map;
}
function useIndexedDb(){
  if(typeof indexedDB === 'undefined') return false;
  // Never hide an earlier fallback store after IndexedDB becomes available again.
  if(typeof localStorage !== 'undefined' && Object.keys(readLocal()).length)
    throw new Error('Há registros locais que exigem recuperação antes de usar IndexedDB. Nada foi alterado; preserve os dois armazenamentos.');
  return true;
}
async function mutateLocal(fn){
  if(!globalThis.navigator?.locks?.request)
    throw new Error('Gravação local indisponível sem coordenação segura entre abas. Preserve seu backup e use um navegador com IndexedDB.');
  return navigator.locks.request(LOCK_NAME, {mode:'exclusive'}, () => {
    const map=readLocal();
    const result=fn(map);
    localStorage.setItem(LS_KEY, JSON.stringify(map));
    return result;
  });
}
async function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function idbTx(mode, fn){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    let tx, req;
    try {
      tx=db.transaction(STORE,mode);
      tx.oncomplete=()=>{ db.close(); resolve(req?.result); };
      tx.onabort=()=>{ db.close(); reject(tx.error || new Error('Transação cancelada; nada foi salvo.')); };
      tx.onerror=()=>{ /* Abort is the terminal failure event. */ };
      req=fn(tx.objectStore(STORE));
    } catch(err){
      if(tx) { try { tx.abort(); } catch {} }
      db.close(); reject(err);
    }
  });
}
export class CaseRepository {
  async list(){
    const values=useIndexedDb()
      ? await idbTx('readonly',store=>store.getAll())
      : Object.values(readLocal());
    return values.map(normalizeCaseRecord).sort((a,b)=>b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));
  }
  async get(id){ const all=await this.list(); return all.find(c=>c.id===id)||null; }
  async create(record){
    const value=touchCase(record);
    if(useIndexedDb()){
      try { await idbTx('readwrite',store=>store.add(value)); }
      catch(error){ if(error?.name==='ConstraintError') throw duplicate(); throw error; }
    } else {
      await mutateLocal(map=>{
        if(Object.hasOwn(map,value.id)) throw duplicate();
        Object.defineProperty(map,value.id,{value,enumerable:true,writable:true,configurable:true});
      });
    }
    return value;
  }
  async save(record){
    const value=touchCase(record);
    if(useIndexedDb()) await idbTx('readwrite',store=>store.put(value));
    else await mutateLocal(map=>{
      Object.defineProperty(map,value.id,{value,enumerable:true,writable:true,configurable:true});
    });
    return value;
  }
  async remove(id){
    if(useIndexedDb()) await idbTx('readwrite',store=>store.delete(id));
    else await mutateLocal(map=>{ delete map[id]; });
  }
  async export(id){ const value=await this.get(id); if(!value) throw new Error('Caso não encontrado.'); return serializeCaseRecord(value); }
  async import(payload){ return this.create(importCaseRecord(payload)); }
}

export function downloadCaseBackup(record){
  const blob=new Blob([serializeCaseRecord(record)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`medper-${record.id}.json`; a.click(); URL.revokeObjectURL(url);
}
