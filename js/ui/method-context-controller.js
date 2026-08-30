import {
  getMethodologyContext,
  getContextualProtocolProfile,
  getApplicableInstrumentIds
} from '../methodology/context-resolver.js';
import { evaluatePersonalDamageCase } from '../methodology/personal-damage.js';
import { buildPosasAssessmentFromGuided } from '../methodology/posas.js';
import { instrumentGuidance } from '../methodology/instrument-guide.js';

const LABELS={
  personal_damage_assessment:'Avaliação de dano pessoal',
  medicolegal_assessment:'Avaliação médico-legal',
  occupational_medicolegal_assessment:'Avaliação médico-pericial trabalhista/ocupacional',
  social_security_assessment:'Avaliação médico-pericial previdenciária',
  forensic_assessment:'Avaliação médico-pericial'
};

const STAGE_LABELS={
  object:'Objeto',
  damage:'Dano demonstrável',
  causation:'Nexo causal',
  temporary:'Danos temporários',
  permanent:'Eixos permanentes'
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
  // A justificativa vem do guia de instrumentos, não de um texto genérico.
  // Diretriz da Founder (30/08/2026): ninguém grava qual tabela serve para qual
  // área — o sistema diz o que o instrumento mede, quando é adequado e o que
  // ele NÃO faz, para AUXILIAR a escolha. A escolha continua sendo da perita.
  const guide=instrumentGuidance(instrumentId);
  const label=guide?.label||(instrumentId==='aipe'?'AIPE':instrumentId);
  const status=isActive?'Ativo':isDismissed?'Não selecionado':isSuggested?'Sugerido':'Disponível';
  const rationale=guide
    ? `${guide.construct} ${guide.whenAdequate}`
    : 'Instrumento auxiliar disponível para seleção médica.';
  const limites=guide?.boundaries?.length
    ? `<small class="method-instrument-limits">${guide.boundaries.map(esc).join(' · ')}</small>`
    : '';

  return `<div class="method-instrument-row">
    <div><strong>${esc(label)}</strong><span>${esc(rationale)}</span>${limites}</div>
    <span class="method-instrument-status">${esc(status)}</span>
    <div class="method-instrument-actions">
      ${!isActive?`<button type="button" data-instrument-accept="${esc(instrumentId)}">${isDismissed?'Reconsiderar':'Usar neste caso'}</button>`:''}
      ${!isDismissed?`<button type="button" class="is-secondary" data-instrument-dismiss="${esc(instrumentId)}">${isActive?'Remover':'Não usar'}</button>`:''}
    </div>
  </div>`;
}

function personalDamageGateBlock(caseData,profile){
  if(profile.baseProtocolId!=='bodily_damage')return'';
  const gate=evaluatePersonalDamageCase(caseData);
  const state=STAGE_LABELS[gate.stage]||gate.stage||'A definir';
  const flags=[
    gate.canValueTemporary?'temporários disponíveis':'temporários bloqueados',
    gate.canValuePermanent?'permanentes disponíveis':'permanentes bloqueados'
  ].join(' · ');
  return `<div class="method-context-priorities" data-personal-damage-gate>
    <span>Motor de dano pessoal · ${esc(state)}</span>
    <p><strong>Próximo passo:</strong> ${esc(gate.nextStep||'Complete os gates metodológicos.')}</p>
    <p>${esc(flags)}</p>
  </div>`;
}

function personalDamageDerivedBlock(caseData,profile){
  if(profile.baseProtocolId!=='bodily_damage')return'';
  const guided=caseData.methodology?.guided||{};
  if(guided.scarQualityStatus!=='Sim')return'';
  const posas=buildPosasAssessmentFromGuided(guided);
  const patient=posas.patient.total===null?'incompleto':`${posas.patient.total}/60`;
  const observer=posas.observer.total===null?'incompleto':`${posas.observer.total}/60`;
  const patientGlobal=posas.patient.global===null?'—':`${posas.patient.global}/10`;
  const observerGlobal=posas.observer.global===null?'—':`${posas.observer.global}/10`;
  return `<div class="method-context-priorities" data-personal-damage-derived>
    <span>Resultados derivados · POSAS 2.0</span>
    <p><strong>Patient ${esc(patient)}</strong> · opinião global ${esc(patientGlobal)}</p>
    <p><strong>Observer ${esc(observer)}</strong> · opinião global ${esc(observerGlobal)}</p>
    <p>Patient e Observer permanecem independentes; POSAS descreve qualidade cicatricial e não é pontuação de dano estético.</p>
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
    ${personalDamageGateBlock(caseData,profile)}
    ${personalDamageDerivedBlock(caseData,profile)}
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
