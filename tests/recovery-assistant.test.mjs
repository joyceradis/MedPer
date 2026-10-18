import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanRecovery, buildBackup, prepareRecovery, recoverWithoutOverwrite, convertLegacy } from '../recovery/recovery.js';

const storage = entries => ({ getItem(key){return Object.hasOwn(entries,key)?entries[key]:null;} });
const oldCase = { id:'case-legacy-1', title:'Caso fictício', scope:'Objeto de exemplo',
  context:{tribunal:'Tribunal fictício'}, evidence:[{id:'f1',note:'Preservar evidência'}], methodology:{general:{object:'Objeto fictício'}},
  customField:{ nested:['conteúdo não mapeado'] } };
const store=storage({'medper.state.v4':JSON.stringify({version:4,cases:[oldCase]}),
 'medper:v2:cases':JSON.stringify({})});

test('backup preserves exact raw legacy payload without rewriting source',()=>{
 const backup=buildBackup('medper.state.v4',store);
 const parsed=JSON.parse(backup.content);
 assert.equal(parsed.raw,store.getItem('medper.state.v4'));
 assert.equal(parsed.origin,'medper.state.v4');
});
test('conversion retains all unknown fields in immutable-shaped original archive',()=>{
 const result=convertLegacy(oldCase,'medper.state.v4',0);
 assert.deepEqual(result.legacyArchive.original,oldCase);
 assert.deepEqual(result.legacyArchive.original.customField.nested,['conteúdo não mapeado']);
 assert.equal(result.context.object,'Objeto fictício');
});
test('conflicting case IDs in same source fail before migration',()=>{
 const duplicate=storage({'medper.state.v4':JSON.stringify({cases:[oldCase,oldCase]})});
 assert.throws(()=>prepareRecovery('medper.state.v4',duplicate),/duplicados/);
});
test('unrecognized legacy structures fail closed',()=>{
 const unknown=storage({'medper.state.v4':JSON.stringify({cases:'bad'})});
 assert.throws(()=>prepareRecovery('medper.state.v4',unknown),/não reconhecida/);
});
test('V2 invalid cases fail closed',()=>{
 const invalid=storage({'medper:v2:cases':JSON.stringify({x:{hello:'world'}})});
 assert.throws(()=>prepareRecovery('medper:v2:cases',invalid),/incompatível/);
});
test('no confirmation rejects writes before IndexedDB access',async()=>{
 await assert.rejects(()=>recoverWithoutOverwrite('medper.state.v4',{backupConfirmed:false,storage:store}),/backup/);
});
test('scan shows local sources and reports missing IndexedDB instead of inventing cases',async()=>{
 const previous=globalThis.indexedDB;
 try {
   delete globalThis.indexedDB;
   const items=await scanRecovery(store);
   assert.equal(items.find(x=>x.key==='medper.state.v4').count,1);
   assert.equal(items.find(x=>x.key==='medper-v2').status,'erro');
 } finally { if(previous!==undefined)globalThis.indexedDB=previous; }
});

test('a changed source invalidates previous backup before IndexedDB access',async()=>{
 const previous='{"cases":[]}';
 const changed=storage({'medper.state.v4':'{"cases":[{"id":"changed"}]}'});
 await assert.rejects(
   ()=>recoverWithoutOverwrite('medper.state.v4',{backupConfirmed:true,backedUpRaw:previous,storage:changed}),
   /mudaram desde o backup/
 );
});
test('a missing exact backup snapshot cannot authorize migration',async()=>{
 await assert.rejects(
   ()=>recoverWithoutOverwrite('medper.state.v4',{backupConfirmed:true,storage:store}),
   /mudaram desde o backup/
 );
});
