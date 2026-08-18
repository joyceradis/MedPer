function now(){return new Date().toISOString();}

function syncMeta(caseData){
  caseData.sync ||= {};
  return caseData.sync;
}

export function createCaseStateSyncController({store,client,onStatus=()=>{},debounceMs=600}={}){
  let destroyed=false;
  let timer=null;
  let syncing=false;
  let pending=false;

  const enabled=Boolean(store&&client?.enabled);

  async function syncCase(caseData){
    if(!enabled||destroyed)return;
    const localId=caseData.id;
    let current=store.getState().cases.find(item=>item.id===localId);
    if(!current)return;
    let meta=syncMeta(current);
    let remoteCaseId=meta.remoteCaseId||'';

    if(!remoteCaseId){
      const created=await client.createCase(current);
      remoteCaseId=created.id;
      store.update(state=>{
        const target=state.cases.find(item=>item.id===localId);
        if(!target)return;
        const targetMeta=syncMeta(target);
        targetMeta.remoteCaseId=remoteCaseId;
        targetMeta.revision=0;
        targetMeta.status='pending';
        targetMeta.lastError='';
      },{notify:false});
    }

    current=store.getState().cases.find(item=>item.id===localId);
    meta=syncMeta(current);
    try{
      const saved=await client.save(remoteCaseId,{revision:Number(meta.revision)||0,payload:current});
      store.update(state=>{
        const target=state.cases.find(item=>item.id===localId);
        if(!target)return;
        const targetMeta=syncMeta(target);
        targetMeta.remoteCaseId=remoteCaseId;
        targetMeta.revision=saved.revision;
        targetMeta.status='synced';
        targetMeta.lastSyncedAt=now();
        targetMeta.lastError='';
        targetMeta.conflict=false;
      },{notify:false});
      onStatus({caseId:localId,status:'synced',revision:saved.revision});
    }catch(error){
      store.update(state=>{
        const target=state.cases.find(item=>item.id===localId);
        if(!target)return;
        const targetMeta=syncMeta(target);
        targetMeta.status=error?.status===409?'conflict':'error';
        targetMeta.conflict=error?.status===409;
        targetMeta.lastError=error?.message||'Falha de sincronização';
      },{notify:false});
      onStatus({caseId:localId,status:error?.status===409?'conflict':'error',error});
    }
  }

  async function syncAll(){
    if(!enabled||destroyed||syncing){pending=true;return;}
    syncing=true;
    try{
      const cases=[...store.getState().cases];
      for(const caseData of cases)await syncCase(caseData);
    }finally{
      syncing=false;
      if(pending&&!destroyed){pending=false;await syncAll();}
    }
  }

  async function hydrate(){
    if(!enabled||destroyed)return;
    const remoteCases=await client.listCases();
    for(const remote of remoteCases){
      const local=store.getState().cases.find(item=>item.sync?.remoteCaseId===remote.id);
      if(local)continue;
      try{
        const state=await client.load(remote.id);
        const payload=state?.payload&&typeof state.payload==='object'?structuredClone(state.payload):null;
        if(!payload?.id)continue;
        payload.sync={...(payload.sync||{}),remoteCaseId:remote.id,revision:state.revision,status:'synced',lastSyncedAt:now(),lastError:'',conflict:false};
        store.update(rootState=>{
          if(rootState.cases.some(item=>item.id===payload.id||item.sync?.remoteCaseId===remote.id))return;
          rootState.cases.push(payload);
        },{notify:false});
      }catch(error){
        onStatus({remoteCaseId:remote.id,status:'hydrate-error',error});
      }
    }
    store.notify?.();
  }

  function schedule(){
    if(!enabled||destroyed)return;
    clearTimeout(timer);
    timer=setTimeout(()=>{void syncAll();},debounceMs);
  }

  const unsubscribe=enabled?store.subscribe(schedule):()=>{};

  return {
    enabled,
    hydrate,
    syncAll,
    destroy(){
      destroyed=true;
      clearTimeout(timer);
      unsubscribe?.();
    }
  };
}
