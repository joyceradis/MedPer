import { normalizeCaseRecord, serializeCaseRecord, importCaseRecord, touchCase } from './case-record.js';

const DB_NAME='medper-v2';
const STORE='cases';
const LS_KEY='medper:v2:cases';

function hasIndexedDb(){ return typeof indexedDB !== 'undefined'; }
function readLocal(){ try { return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); } catch { return {}; } }
function writeLocal(map){ localStorage.setItem(LS_KEY, JSON.stringify(map)); }

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
    const tx=db.transaction(STORE,mode); const store=tx.objectStore(STORE); let result;
    try { result=fn(store); } catch(err){ db.close(); reject(err); return; }
    tx.oncomplete=()=>{ db.close(); resolve(result); };
    tx.onerror=()=>{ db.close(); reject(tx.error); };
  });
}

export class CaseRepository {
  async list(){
    if(!hasIndexedDb()) return Object.values(readLocal()).map(normalizeCaseRecord).sort((a,b)=>b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));
    try {
      const db=await openDb();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly'); const req=tx.objectStore(STORE).getAll();
        req.onsuccess=()=>{ const out=req.result.map(normalizeCaseRecord).sort((a,b)=>b.metadata.updatedAt.localeCompare(a.metadata.updatedAt)); db.close(); resolve(out); };
        req.onerror=()=>{ db.close(); reject(req.error); };
      });
    } catch { return Object.values(readLocal()).map(normalizeCaseRecord); }
  }
  async get(id){ const all=await this.list(); return all.find(c=>c.id===id)||null; }
  async create(record){ return this.save(record); }
  async save(record){
    const value=touchCase(record);
    if(hasIndexedDb()) { try { await idbTx('readwrite',store=>store.put(value)); return value; } catch {} }
    const map=readLocal(); map[value.id]=value; writeLocal(map); return value;
  }
  async remove(id){
    if(hasIndexedDb()) { try { await idbTx('readwrite',store=>store.delete(id)); } catch {} }
    const map=readLocal(); delete map[id]; writeLocal(map);
  }
  async export(id){ const value=await this.get(id); if(!value) throw new Error('Caso não encontrado.'); return serializeCaseRecord(value); }
  async import(payload){ const value=importCaseRecord(payload); await this.save(value); return value; }
}

export function downloadCaseBackup(record){
  const blob=new Blob([serializeCaseRecord(record)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`medper-${record.id}.json`; a.click(); URL.revokeObjectURL(url);
}
