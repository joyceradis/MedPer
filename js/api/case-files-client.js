// Documentos dos autos: prontuário, laudo anterior, CAT, boletim de ocorrência.
//
// O que NÃO entra nesta fase é fotografia do periciado (`docs/DATA_HANDLING_PILOT.md`
// §1). A recusa é do servidor e é decidida pelos BYTES do arquivo, não pelo tipo
// declarado — este cliente não filtra nada por conta própria. Filtrar aqui daria
// a impressão de garantia sem ser garantia: qualquer cliente que não seja este
// (curl, script, outra aba) continuaria mandando. O `accept` do campo de arquivo
// é conveniência de seleção; a regra vive em `backend/app/storage.py`.

function trimSlash(value=''){
  return String(value||'').trim().replace(/\/+$/,'');
}

// O corpo de erro do MedPer é JSON com `detail`, e é nele que está a mensagem
// acionável ("converta em PDF antes de anexar"). Perdê-la e mostrar "HTTP 415"
// transformaria uma instrução clara num código que a perita não tem como
// interpretar.
async function failure(response){
  const payload=await response.json().catch(()=>null);
  const error=new Error(payload?.detail||payload?.message||`HTTP ${response.status}`);
  error.status=response.status;
  error.payload=payload;
  return error;
}

export function createCaseFilesClient({baseUrl='',getAccessToken=()=>'',fetchImpl=globalThis.fetch}={}){
  const apiBase=trimSlash(baseUrl);
  const enabled=Boolean(apiBase&&typeof fetchImpl==='function');

  const send=async(path,options={})=>{
    if(!enabled)throw new Error('Documentos dos autos exigem conexão com o servidor MedPer.');
    const token=await getAccessToken();
    if(!token)throw new Error('Sessão remota indisponível.');
    let response;
    try{
      response=await fetchImpl(`${apiBase}${path}`,{
        ...options,
        headers:{...(options.headers||{}),Authorization:`Bearer ${token}`}
      });
    }catch(error){
      if(error instanceof TypeError)throw new Error('Não foi possível conectar ao servidor MedPer. Tente novamente em instantes.');
      throw error;
    }
    if(!response.ok)throw await failure(response);
    return response;
  };

  return {
    enabled,

    async list(caseId){
      const response=await send(`/cases/${encodeURIComponent(caseId)}/files`,{headers:{Accept:'application/json'}});
      return response.json();
    },

    async upload(caseId,file){
      const form=new FormData();
      form.append('upload',file,file?.name||'arquivo');
      // Sem `Content-Type` de propósito: quem monta multipart precisa gerar o
      // boundary, e declará-lo à mão quebra a leitura do corpo no servidor.
      const response=await send(`/cases/${encodeURIComponent(caseId)}/files`,{
        method:'POST',
        headers:{Accept:'application/json'},
        body:form
      });
      return response.json();
    },

    // Devolve o conteúdo decifrado como Blob. O arquivo em repouso está cifrado
    // no disco do servidor; o que chega aqui já passou pela rota, que confere a
    // organização antes de decifrar.
    async download(caseId,fileId){
      const response=await send(`/cases/${encodeURIComponent(caseId)}/files/${encodeURIComponent(fileId)}`);
      return response.blob();
    }
  };
}
