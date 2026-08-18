function trimSlash(value=''){
  return String(value||'').trim().replace(/\/+$/,'');
}

async function parseResponse(response){
  const payload=await response.json().catch(()=>null);
  if(response.ok)return payload;
  const detail=payload?.detail||payload?.message||`HTTP ${response.status}`;
  const error=new Error(detail);
  error.status=response.status;
  error.payload=payload;
  throw error;
}

export function createCaseStateClient({baseUrl='',getAccessToken=()=>'',fetchImpl=globalThis.fetch}={}){
  const apiBase=trimSlash(baseUrl);
  const enabled=Boolean(apiBase&&typeof fetchImpl==='function');

  const request=async(path,options={})=>{
    if(!enabled)throw new Error('Sincronização remota não configurada.');
    const token=await getAccessToken();
    if(!token)throw new Error('Sessão remota indisponível.');
    const headers={Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{}),Authorization:`Bearer ${token}`};
    return parseResponse(await fetchImpl(`${apiBase}${path}`,{...options,headers}));
  };

  return {
    enabled,
    load(caseId){
      return request(`/cases/${encodeURIComponent(caseId)}/state`);
    },
    save(caseId,{revision=0,payload={}}={}){
      return request(`/cases/${encodeURIComponent(caseId)}/state`,{
        method:'PUT',
        body:JSON.stringify({revision,payload})
      });
    }
  };
}
