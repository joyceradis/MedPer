(() => {
  'use strict';

  const CONFIG_KEY = 'medper.api.config.v2';
  const defaultConfig = { baseUrl: '', accessToken: '', refreshToken: '' };

  function loadConfig() {
    try { return { ...defaultConfig, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') }; }
    catch { return { ...defaultConfig }; }
  }
  function saveConfig(config) { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }
  function configure(baseUrl) { const config=loadConfig(); saveConfig({...config,baseUrl:String(baseUrl||'').replace(/\/$/,'')}); }
  function requireBaseUrl() {
    const config=loadConfig();
    if(!config.baseUrl) throw new Error('A nuvem do MedPer ainda não foi configurada.');
    return config;
  }
  async function request(path, options={}, allowRefresh=true) {
    const config=requireBaseUrl();
    const headers=new Headers(options.headers||{});
    if(config.accessToken) headers.set('Authorization',`Bearer ${config.accessToken}`);
    if(!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
    let response=await fetch(`${config.baseUrl}${path}`,{...options,headers});
    if(response.status===401 && allowRefresh && config.refreshToken){
      const refreshed=await fetch(`${config.baseUrl}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:config.refreshToken})});
      if(refreshed.ok){
        const tokens=await refreshed.json();
        saveConfig({...config,accessToken:tokens.access_token,refreshToken:tokens.refresh_token});
        response=await request(path,options,false);
      }
    }
    return response;
  }
  async function login(email,password){
    const config=requireBaseUrl();
    const response=await fetch(`${config.baseUrl}/auth/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:email,password})});
    if(!response.ok) throw new Error('Não foi possível entrar.');
    const tokens=await response.json();
    saveConfig({...config,accessToken:tokens.access_token,refreshToken:tokens.refresh_token});
    return tokens;
  }
  async function logout(){
    const config=loadConfig();
    if(config.baseUrl && config.refreshToken){
      await fetch(`${config.baseUrl}/auth/logout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:config.refreshToken})}).catch(()=>{});
    }
    saveConfig({...config,accessToken:'',refreshToken:''});
  }
  window.MedPerAPI={request,login,logout,configure,loadConfig};
})();