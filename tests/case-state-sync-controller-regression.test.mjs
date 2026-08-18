import assert from 'node:assert/strict';
import { createCaseStateSyncController } from '../js/core/case-state-sync-controller.js';

function createFakeStore(initial){
  let state=structuredClone(initial);
  const listeners=new Set();
  return {
    getState:()=>state,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    update(mutator,{notify=true}={}){const next=structuredClone(state);mutator(next);state=next;if(notify)listeners.forEach(fn=>fn(state));},
    replace(next){state=structuredClone(next);listeners.forEach(fn=>fn(state));}
  };
}

const calls=[];
const client={
  enabled:true,
  async listCases(){return [{id:'remote-2',title:'Remoto',reference:'R2',objectType:'Dano corporal'}];},
  async load(id){assert.equal(id,'remote-2');return {revision:2,payload:{id:'local-2',title:'Caso remoto',context:{matter:'Dano corporal'},scope:'Objeto remoto'}};},
  async createCase(caseData){calls.push(['create',caseData.id]);return {id:'remote-1'};},
  async save(remoteId,{revision,payload}){calls.push(['save',remoteId,revision,payload.id]);return {revision:revision+1,payload};}
};

const store=createFakeStore({version:4,currentCaseId:'local-1',currentTab:'summary',cases:[{id:'local-1',title:'Caso local',context:{matter:'Dano corporal'},scope:'Objeto'}]});
const controller=createCaseStateSyncController({store,client});

await controller.syncAll();
let local=store.getState().cases.find(item=>item.id==='local-1');
assert.equal(local.sync.remoteCaseId,'remote-1');
assert.equal(local.sync.revision,1);
assert.equal(local.sync.status,'synced');
assert.deepEqual(calls,[['create','local-1'],['save','remote-1',0,'local-1']]);

await controller.hydrate();
const hydrated=store.getState().cases.find(item=>item.id==='local-2');
assert.equal(hydrated.title,'Caso remoto');
assert.equal(hydrated.sync.remoteCaseId,'remote-2');
assert.equal(hydrated.sync.revision,2);

controller.destroy();
console.log('Case state sync controller regression suite completed successfully.');
