import { OPERATIONAL_LETTERS } from '../models/letters.js';

const SURFACES=new Set(['overview','cases','deadlines','indicators','references','models']);

function currentSurface(){
  const match=window.location.hash.match(/^#\/dashboard\/([^/]+)/);
  return match&&SURFACES.has(match[1])?match[1]:'overview';
}

function navigate(surface){
  if(!SURFACES.has(surface))return;
  const next=`#/dashboard/${surface}`;
  if(window.location.hash===next){
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash=next;
}

export function installSurfaceController({root,store}){
  let destroyed=false;

  const onClick=event=>{
    if(destroyed)return;

    const backToCases=event.target.closest('.back-link[data-home]');
    if(backToCases&&window.location.hash.startsWith('#/case/')){
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate('cases');
      return;
    }

    // Copiar um documento operacional. O texto vem do módulo de dados, não do
    // DOM — o que a perita cola é exatamente o rascunho declarado em letters.js.
    const copyButton=event.target.closest('[data-copy-letter]');
    if(copyButton){
      event.preventDefault();
      event.stopImmediatePropagation();
      const letter=OPERATIONAL_LETTERS.find(item=>item.id===copyButton.dataset.copyLetter);
      if(!letter)return;
      const confirm=()=>{
        const original=copyButton.textContent;
        copyButton.textContent='Copiado';
        copyButton.disabled=true;
        setTimeout(()=>{if(!destroyed){copyButton.textContent=original;copyButton.disabled=false;}},1600);
      };
      const fallback=()=>{
        const area=document.createElement('textarea');
        area.value=letter.body;
        area.setAttribute('readonly','');
        area.style.position='fixed';
        area.style.opacity='0';
        document.body.appendChild(area);
        area.select();
        try{document.execCommand('copy');confirm();}catch{/* sem clipboard disponível */}
        area.remove();
      };
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(letter.body).then(confirm).catch(fallback);
      else fallback();
      return;
    }

    const caseButton=event.target.closest('[data-conference-case]');
    if(caseButton){
      event.preventDefault();
      event.stopImmediatePropagation();
      const id=caseButton.dataset.conferenceCase;
      window.location.hash=id?`#/dashboard/models/${encodeURIComponent(id)}`:'#/dashboard/models';
      return;
    }

    const surfaceButton=event.target.closest('[data-surface]');
    if(!surfaceButton)return;
    const surface=surfaceButton.dataset.surface;
    if(!SURFACES.has(surface))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(surface);
  };

  // A marcação é registro da perita sobre o próprio trabalho. Persiste pelo store,
  // que segue sendo o único dono do estado — o controlador não escreve na camada
  // de armazenamento persistente diretamente.
  //
  // `notify:false` é deliberado, e é o mesmo idioma que o workspace já usa para
  // digitação: um re-render completo a cada item marcado fecharia o acordeão e
  // devolveria a perita ao topo da lista. O contador e a barra são atualizados no
  // lugar, para que o estado visível continue verdadeiro sem reconstruir a tela.
  const refreshProgress=()=>{
    const rows=[...root.querySelectorAll('.conf-row')];
    let done=0,total=0;
    for(const row of rows){
      const boxes=[...row.querySelectorAll('[data-conference-item]')];
      const marked=boxes.filter(b=>b.checked).length;
      done+=marked;total+=boxes.length;
      const count=row.querySelector('.conf-count');
      if(count)count.textContent=`${marked}/${boxes.length}`;
      row.classList.toggle('is-complete',boxes.length>0&&marked===boxes.length);
    }
    const head=root.querySelector('.conf-meter-head');
    const bar=root.querySelector('.conf-meter-track span');
    const track=root.querySelector('.conf-meter-track');
    if(head&&bar&&total){
      const pct=Math.round(done/total*100);
      head.innerHTML='';
      const strong=document.createElement('strong');
      strong.textContent=`${done} de ${total} conferidos`;
      const span=document.createElement('span');
      span.textContent=`${pct}%`;
      head.append(strong,span);
      bar.style.width=`${pct}%`;
      if(track)track.setAttribute('aria-valuenow',String(done));
    }
  };

  const onChange=event=>{
    if(destroyed||!store)return;
    const box=event.target.closest('[data-conference-item]');
    if(!box)return;
    const itemId=box.dataset.conferenceItem;
    const raw=(window.location.hash.match(/^#\/dashboard\/models\/([^/]+)/)||[])[1];
    if(!raw)return;
    const caseId=decodeURIComponent(raw);
    const marked=box.checked;
    box.closest('.conf-item')?.classList.toggle('is-checked',marked);
    store.update(state=>{
      const target=(state.cases||[]).find(c=>c.id===caseId);
      if(!target)return;
      target.conference={...(target.conference||{})};
      if(marked)target.conference[itemId]=true;
      else delete target.conference[itemId];
    },{notify:false});
    refreshProgress();
  };

  root.addEventListener('click',onClick,true);
  root.addEventListener('change',onChange,true);

  return{
    currentSurface,
    destroy(){
      destroyed=true;
      root.removeEventListener('click',onClick,true);
      root.removeEventListener('change',onChange,true);
    }
  };
}
