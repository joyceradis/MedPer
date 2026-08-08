import {
  getMethodologyContext,
  getContextualProtocolProfile,
  getApplicableInstrumentIds
} from '../methodology/context-resolver.js';

const LABELS={
  personal_damage_assessment:'Avaliação de dano pessoal',
  medicolegal_assessment:'Avaliação médico-legal',
  occupational_medicolegal_assessment:'Avaliação médico-pericial trabalhista/ocupacional',
  social_security_assessment:'Avaliação médico-pericial previdenciária',
  forensic_assessment:'Avaliação médico-pericial'
};

const esc=(value='')=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

function currentCase(store){
  const id=window.location.hash.match(/^#\/case\/([^/]+)/)?.[1];
  return id?store.getState().cases.find(caseData=>caseData.id===id)||null:null;
}

function instrumentRow(caseData,profile,instrumentId){
  const active=new Set(caseData.methodology?.activeInstrumentIds||[]);
  const dismissed=new Set(caseData.methodology?.dismissedInstrumentIds||[]);
  const suggested=new Set(profile.suggestedInstrumentIds||[]);
  const isActive=active.has(instrumentId);
  const isDismissed=dismissed.has(instrumentId);
  const isSuggested=suggested.has(instrumentId);
  const label=instrumentId==='aipe'?'AIPE':instrumentId;
  const status=isActive?'Ativo':isDismissed?'Não selecionado':isSuggested?'Sugerido':'Disponível';
  const rationale=instrumentId==='aipe'
    ? (isSuggested?'Instrumento possível neste perfil; a adoção depende de confirmação médica.':'Não é sugerido automaticamente neste perfil. Pode ser incluído apenas mediante decisão metodológica explícita.')
    : 'Instrumento auxiliar disponível para seleção médica.';

  return `<div class="method-instrument-row">
    <div><strong>${esc(label)}</strong><span>${esc(rationale)}</span></div>
    <span class="method-instrument-status">${esc(status)}</span>
    <div class="method-instrument-actions">
      ${!isActive?`<button type="button" data-instrument-accept="${esc(instrumentId)}">${isDismissed?'Reconsiderar':'Usar neste caso'}</button>`:''}
      ${!isDismissed?`<button type="button" class="is-secondary" data-instrument-dismiss="${esc(instrumentId)}">${isActive?'Remover':'Não usar'}</button>`:''}
    </div>
  </div>`;
}

function buildCard(caseData){
  const context=getMethodologyContext(caseData);
  const profile=getContextualProtocolProfile(caseData);
  const instruments=new Set([...(profile.suggestedInstrumentIds||[]),...(caseData.methodology?.activeInstrumentIds||[])]);
  if(caseData.context?.matterId==='aesthetic_damage')instruments.add('aipe');
  const purposeLabel=LABELS[context.purposeId]||context.purposeId||'A definir';
  const sphere=caseData.context?.legalSphere||caseData.context?.branch||'A definir';
  const role=caseData.context?.role||'A definir';
  const active=getApplicableInstrumentIds(caseData);

  return `<section class="method-context-card" data-method-context-card>
    <header>
      <div><span class="eyebrow">Contexto metodológico</span><h3>${esc(profile.title)}</h3></div>
      <span class="method-context-badge">${esc(sphere)}</span>
    </header>
    <div class="method-context-grid">
      <div><span>Finalidade</span><strong>${esc(purposeLabel)}</strong></div>
      <div><span>Papel profissional</span><strong>${esc(role)}</strong></div>
      <div><span>Perfil contextual</span><strong>${esc(profile.id)}</strong></div>
      <div><span>Instrumentos ativos</span><strong>${active.length?esc(active.join(', ')):'Nenhum'}</strong></div>
    </div>
    ${profile.priorities?.length?`<div class="method-context-priorities"><span>Prioridades deste contexto</span><p>${profile.priorities.map(esc).join(' · ')}</p></div>`:''}
    ${profile.cautions?.length?`<div class="method-context-cautions">${profile.cautions.map(item=>`<p>${esc(item)}</p>`).join('')}</div>`:''}
    ${instruments.size?`<div class="method-instruments"><div class="method-instruments-head"><strong>Instrumentos auxiliares</strong><span>Sugestão não equivale a adoção.</span></div>${[...instruments].map(id=>instrumentRow(caseData,profile,id)).join('')}</div>`:''}
  </section>`;
}

export function installMethodContextController({root,store}){
  let destroyed=false;
  let unsubscribe=null;

  const render=()=>{
    if(destroyed)return;
    const old=root.querySelector('[data-method-context-card]');
    if(!window.location.hash.match(/^#\/case\/[^/]+\/method$/)){
      old?.remove();
      return;
    }
    const caseData=currentCase(store);
    const selector=root.querySelector('.protocol-selector');
    if(!caseData||!selector)return;
    const wrapper=document.createElement('div');
    wrapper.innerHTML=buildCard(caseData);
    const next=wrapper.firstElementChild;
    if(old)old.replaceWith(next);else selector.parentElement?.insertBefore(next,selector);
  };

  const mutateInstrument=(instrumentId,accepted)=>{
    const caseData=currentCase(store);
    if(!caseData)return;
    store.update(state=>{
      const target=state.cases.find(item=>item.id===caseData.id);
      if(!target)return;
      target.methodology||={};
      const active=new Set(target.methodology.activeInstrumentIds||[]);
      const dismissed=new Set(target.methodology.dismissedInstrumentIds||[]);
      if(accepted){active.add(instrumentId);dismissed.delete(instrumentId);}else{active.delete(instrumentId);dismissed.add(instrumentId);}
      target.methodology.activeInstrumentIds=[...active];
      target.methodology.dismissedInstrumentIds=[...dismissed];
    });
  };

  const onClick=event=>{
    const accept=event.target.closest('[data-instrument-accept]');
    if(accept){event.preventDefault();mutateInstrument(accept.dataset.instrumentAccept,true);return;}
    const dismiss=event.target.closest('[data-instrument-dismiss]');
    if(dismiss){event.preventDefault();mutateInstrument(dismiss.dataset.instrumentDismiss,false);}
  };

  root.addEventListener('click',onClick);
  window.addEventListener('hashchange',render);
  unsubscribe=store.subscribe(()=>queueMicrotask(render));
  queueMicrotask(render);

  return{
    destroy(){
      destroyed=true;
      unsubscribe?.();
      root.removeEventListener('click',onClick);
      window.removeEventListener('hashchange',render);
      root.querySelector('[data-method-context-card]')?.remove();
    }
  };
}
