import assert from 'node:assert/strict';
import test from 'node:test';
import { CaseRepository } from '../js/v2/repository.js';
import { createCaseRecord } from '../js/v2/case-record.js';

const key='medper:v2:cases';
function fixture(){
  const descriptors=Object.fromEntries(['indexedDB','localStorage','navigator'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const content=new Map(); let tail=Promise.resolve();
  delete globalThis.indexedDB;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:k=>content.get(k)??null,
    setItem:(k,v)=>content.set(k,v)
  }});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{
    request(name,options,callback){
      assert.equal(name,'medper:v2:cases:write');
      assert.equal(options.mode,'exclusive');
      const pending=tail.then(callback);
      tail=pending.catch(()=>{});
      return pending;
    }
  }}});
  return {content,restore(){ for(const [k,d] of Object.entries(descriptors)){ if(d) Object.defineProperty(globalThis,k,d); else delete globalThis[k]; } }};
}

test('independent repositories serialize duplicate imports and preserve winner after reload',async()=>{
  const f=fixture();
  try {
    const value=createCaseRecord({title:'Fictício concorrente'});
    const results=await Promise.allSettled([new CaseRepository().import(JSON.stringify(value)),new CaseRepository().import(JSON.stringify(value))]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.match(results.find(r=>r.status==='rejected').reason.message,/Já existe/);
    assert.equal((await new CaseRepository().list()).length,1);
    await assert.rejects(new CaseRepository().import(JSON.stringify(value)),/Já existe/);
    const other=createCaseRecord({title:'Outro fictício'});
    await Promise.all([new CaseRepository().save(value),new CaseRepository().save(other)]);
    assert.equal((await new CaseRepository().list()).length,2);
  }finally{f.restore();}
});
test('fallback refuses uncoordinated writes and preserves malformed storage',async()=>{
  const f=fixture();
  try {
    delete navigator.locks;
    await assert.rejects(new CaseRepository().save(createCaseRecord()),/coordenação segura/);
    assert.equal(f.content.size,0);
    f.content.set(key,'{broken');
    await assert.rejects(new CaseRepository().list(),SyntaxError);
    assert.equal(f.content.get(key),'{broken');
  }finally{f.restore();}
});
test('restored IndexedDB availability does not silently hide fallback records',async()=>{
  const f=fixture();
  try {
    await new CaseRepository().save(createCaseRecord({title:'Fictício recuperável'}));
    const before=f.content.get(key);
    globalThis.indexedDB={open(){throw new Error('must not open divergent store');}};
    for(const operation of [
      ()=>new CaseRepository().list(),
      ()=>new CaseRepository().save(createCaseRecord()),
      ()=>new CaseRepository().remove('synthetic'),
      ()=>new CaseRepository().export('synthetic')
    ]) await assert.rejects(operation(),/recuperação/);
    assert.equal(f.content.get(key),before);
  }finally{f.restore();}
});
test('IndexedDB write abort rejects without fallback while reads remain functional',async()=>{
  const f=fixture();
  try {
    const original=createCaseRecord({title:'Original fictício'});
    let closes=0;
    globalThis.indexedDB={open(){
      const request={}; queueMicrotask(()=>{
        request.result={
          close(){closes++;},
          transaction(_store,mode){
            const tx={error:null};
            tx.objectStore=()=>({
              getAll(){ const req={result:[original]}; queueMicrotask(()=>tx.oncomplete()); return req; },
              put(){ queueMicrotask(()=>{tx.error=new Error('Quota sintética');tx.onabort();}); return {}; },
              delete(){ queueMicrotask(()=>{tx.error=new Error('Quota sintética');tx.onabort();}); return {}; },
              add(){ queueMicrotask(()=>{tx.error=Object.assign(new Error('duplicate'),{name:'ConstraintError'});tx.onabort();}); return {}; }
            });
            return tx;
          }
        }; request.onsuccess();
      }); return request;
    }};
    const repo=new CaseRepository();
    await assert.rejects(repo.save(original),/Quota sintética/);
    await assert.rejects(repo.remove(original.id),/Quota sintética/);
    await assert.rejects(repo.import(JSON.stringify(original)),/Já existe/);
    assert.equal(f.content.size,0);
    assert.equal((await new CaseRepository().get(original.id)).identity.title,'Original fictício');
    assert.equal(closes,4);
  }finally{f.restore();}
});
