const KEY='medper.api.session.v1';

export function createApiSessionStore(storage=globalThis.localStorage){
  const get=()=>{
    try{
      const raw=storage?.getItem?.(KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      return parsed&&typeof parsed==='object'?parsed:null;
    }catch{return null;}
  };
  return {
    get,
    set(session){
      if(!session?.access_token||!session?.refresh_token)throw new Error('Sessão remota inválida.');
      storage?.setItem?.(KEY,JSON.stringify(session));
      return session;
    },
    clear(){storage?.removeItem?.(KEY);},
    getAccessToken(){return get()?.access_token||'';},
    getRefreshToken(){return get()?.refresh_token||'';}
  };
}
