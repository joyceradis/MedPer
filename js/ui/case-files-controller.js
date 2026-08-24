// Documentos dos autos, na etapa "Autos e evidências".
//
// Por que um controlador separado e não parte de `renderTab`: `js/ui/app.js`
// redesenha por `innerHTML` a cada alteração do caso, de forma síncrona, a
// partir do store. A lista de documentos vive no servidor e chega por rede —
// e, sobretudo, NÃO PODE ENTRAR NO STORE. O store é persistido em
// `localStorage`, e nome de arquivo reidentifica: "prontuario-maria-silva.pdf"
// no disco do dispositivo é exatamente o dado que a cifragem no servidor existe
// para proteger. Aqui os nomes ficam em memória e morrem com a aba.

const esc=(value='')=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

export function formatSize(bytes=0){
  const n=Number(bytes)||0;
  if(n<1024)return `${n} B`;
  if(n<1024*1024)return `${Math.round(n/1024)} KB`;
  return `${(n/(1024*1024)).toFixed(1)} MB`;
}

const TIPOS={'application/pdf':'PDF','text/plain':'Texto'};

// `refusals` e `error` têm vidas diferentes de propósito. A recusa de um envio é
// a única coisa que a perita tem para agir ("converta em PDF") e precisa
// sobreviver à releitura da lista que vem logo depois do envio; a falha de
// listagem é transitória e some na tentativa seguinte. Guardá-las no mesmo campo
// fazia a releitura apagar a recusa antes de ela ser lida — na prática, escolher
// uma fotografia não produzia efeito visível nenhum.
export function buildFilesMarkup({status='idle',files=[],refusals=[],error='',busy=false,synced=true}={}){
  // Perícia que ainda não subiu não tem onde guardar anexo. Mostrar o botão
  // assim mesmo produziria um 404 sem explicação; a etapa diz o que falta.
  if(!synced)return '<p class="notice">Esta perícia ainda não está no servidor. Os documentos dos autos ficam disponíveis assim que a sincronização concluir.</p>';

  const lista=files.length
    ?`<ul class="case-files-list">${files.map(file=>`<li class="case-file"><div><strong>${esc(file.name)}</strong><span>${esc(TIPOS[file.contentType]||file.contentType||'Documento')} · ${esc(formatSize(file.size))}</span></div><button type="button" class="button button-secondary button-small" data-case-file-download="${esc(file.id)}">Baixar</button></li>`).join('')}</ul>`
    :status==='ready'?'<p class="notice">Nenhum documento dos autos anexado.</p>':'';

  const carregando=status==='loading'?'<p class="notice">Carregando documentos…</p>':'';
  const recusado=refusals.length
    ?`<div class="notice notice-danger">${refusals.map(item=>`<p>${esc(item)}</p>`).join('')}</div>`
    :'';
  const falha=error?`<p class="notice notice-danger">${esc(error)}</p>`:'';

  return `<div class="case-files-actions">
      <label class="button button-primary${busy?' is-disabled':''}">${busy?'Enviando…':'Anexar documento'}<input type="file" accept="application/pdf,text/plain,.pdf,.txt" multiple hidden data-case-file-input${busy?' disabled':''}></label>
      <span class="field-help">PDF ou texto. Documento digitalizado como imagem precisa ser convertido em PDF — fotografia não entra nesta fase.</span>
    </div>${recusado}${falha}${carregando}${lista}`;
}

export function installCaseFilesController({root,store,client}){
  let destroyed=false;
  let unsubscribe=null;
  // Cache em memória por caso. Sem ele, cada tecla digitada em qualquer campo
  // do caso redesenharia a tela e dispararia uma requisição de listagem.
  const cache=new Map();
  let busy=false;

  const estado=caseId=>cache.get(caseId)||{status:'idle',files:[],refusals:[],error:''};

  const render=()=>{
    if(destroyed||!client?.enabled)return;
    const mount=root.querySelector('[data-case-files]');
    if(!mount)return;
    // `data-case-id` traz o id do SERVIDOR. Vazio significa perícia ainda não
    // sincronizada — e não é caso de adivinhar outro id: qualquer palpite aqui
    // vira requisição para uma perícia que não é esta.
    const caseId=mount.dataset.caseId;
    if(!caseId){mount.innerHTML=buildFilesMarkup({synced:false});return;}
    const atual=estado(caseId);
    mount.innerHTML=buildFilesMarkup({...atual,busy});
    if(atual.status==='idle')void carregar(caseId);
  };

  const carregar=async caseId=>{
    // As recusas do último envio atravessam a releitura: é ela que roda logo
    // depois do envio, e apagá-las aqui apagaria a única explicação da tela.
    cache.set(caseId,{...estado(caseId),status:'loading',error:''});
    render();
    const anterior=estado(caseId);
    try{
      const files=await client.list(caseId);
      cache.set(caseId,{status:'ready',files:Array.isArray(files)?files:[],refusals:anterior.refusals,error:''});
    }catch(error){
      cache.set(caseId,{status:'ready',files:anterior.files,refusals:anterior.refusals,
        error:error.message||'Não foi possível listar os documentos.'});
    }
    render();
  };

  // Envio em série, um arquivo por vez, e o resultado é por arquivo. Enviar em
  // paralelo e abortar no primeiro erro faria uma imagem recusada derrubar os
  // documentos legítimos selecionados junto com ela — a perita perderia o envio
  // inteiro por causa de um arquivo.
  const enviar=async(caseId,arquivos)=>{
    busy=true;
    render();
    const recusas=[];
    for(const arquivo of arquivos){
      try{
        await client.upload(caseId,arquivo);
      }catch(error){
        recusas.push(`${arquivo.name}: ${error.message}`);
      }
    }
    busy=false;
    // A releitura é incondicional: num lote misto, os documentos aceitos
    // precisam aparecer mesmo que um deles tenha sido recusado.
    cache.set(caseId,{...estado(caseId),status:'idle',refusals:recusas});
    render();
  };

  const baixar=async(caseId,fileId)=>{
    const arquivo=estado(caseId).files.find(item=>item.id===fileId);
    try{
      const blob=await client.download(caseId,fileId);
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download=arquivo?.name||'documento';
      link.click();
      // Sem revogar, o conteúdo decifrado do documento fica retido na memória da
      // aba enquanto ela viver.
      setTimeout(()=>URL.revokeObjectURL(url),0);
    }catch(error){
      cache.set(caseId,{...estado(caseId),error:error.message||'Não foi possível baixar o documento.'});
      render();
    }
  };

  const onChange=event=>{
    const input=event.target.closest('[data-case-file-input]');
    if(!input)return;
    const caseId=input.closest('[data-case-files]')?.dataset.caseId;
    const arquivos=[...(input.files||[])];
    input.value='';
    if(!caseId||!arquivos.length)return;
    void enviar(caseId,arquivos);
  };

  const onClick=event=>{
    const botao=event.target.closest('[data-case-file-download]');
    if(!botao)return;
    event.preventDefault();
    const caseId=botao.closest('[data-case-files]')?.dataset.caseId;
    if(caseId)void baixar(caseId,botao.dataset.caseFileDownload);
  };

  root.addEventListener('change',onChange);
  root.addEventListener('click',onClick);
  window.addEventListener('hashchange',render);
  // O store é o sinal de que o DOM foi reconstruído, não a fonte do conteúdo:
  // `js/ui/app.js` reescreve `root.innerHTML` a cada notificação e leva o ponto
  // de montagem junto. Sem reagir a isso, a lista sumia ao digitar em qualquer
  // campo da etapa e só voltava ao navegar. O microtask garante que a remontagem
  // aconteça depois do redesenho do app, que é assinante anterior.
  unsubscribe=store?.subscribe(()=>queueMicrotask(render))||null;
  queueMicrotask(render);

  return{
    render,
    destroy(){
      destroyed=true;
      unsubscribe?.();
      root.removeEventListener('change',onChange);
      root.removeEventListener('click',onClick);
      window.removeEventListener('hashchange',render);
      cache.clear();
    }
  };
}
