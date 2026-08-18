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

export function createApiAuthClient({baseUrl='',fetchImpl=globalThis.fetch}={}){
  const apiBase=trimSlash(baseUrl);
  const enabled=Boolean(apiBase&&typeof fetchImpl==='function');

  const request=async(path,options={})=>{
    if(!enabled)throw new Error('API MedPer não configurada.');
    try{
      return parseResponse(await fetchImpl(`${apiBase}${path}`,options));
    }catch(error){
      if(error instanceof TypeError)throw new Error('Não foi possível conectar ao servidor MedPer. Tente novamente em instantes.');
      throw error;
    }
  };

  return {
    enabled,
    signIn(email,password){
      const body=new URLSearchParams({username:String(email||'').trim(),password:String(password||'')});
      return request('/auth/token',{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body
      });
    },
    register({fullName='',organizationName='',organizationSlug='',email='',password=''}={}){
      const resolvedFullName=String(fullName||organizationName||'').trim();
      return request('/auth/register',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          full_name:resolvedFullName,
          organization_name:String(organizationName).trim(),
          organization_slug:String(organizationSlug).trim(),
          email:String(email).trim(),
          password:String(password)
        })
      });
    },
    refresh(refreshToken){
      return request('/auth/refresh',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:String(refreshToken||'')})
      });
    },
    logout(refreshToken){
      return request('/auth/logout',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:String(refreshToken||'')})
      });
    }
  };
}
