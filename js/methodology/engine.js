import { generalMethod, getApplicableProtocols, getProtocol } from './protocols.js';
import { getApplicableInstrumentIds, getContextualProtocolProfile, getMethodologyContext } from './context-resolver.js';
import { functionalBaremaIsAtStake, normalizeFinalidadeId, resolveFunctionalBaremaTrack } from './barema-routing.js';

const has=(o,k)=>{const v=o?.[k];return typeof v==='string'?Boolean(v.trim()):Boolean(v)};

// Cada pendência declara o campo que a originou. É procedência, não classificação:
// severidade, texto e condição continuam decididos aqui e apenas aqui. A interface
// usa esse identificador para saber em qual tela a resposta é registrada, sem
// precisar reinterpretar o significado metodológico da pendência.
const issue=(severity,field,text)=>({severity,field,text});

export function auditCase(c){
  const issues=[];
  const g=c.methodology?.general||{}, s=c.methodology?.specific||{}, u=c.methodology?.guided||{}, d=c.methodology?.decision||{};
  const methodologyContext=getMethodologyContext(c);
  const contextualProfile=getContextualProtocolProfile(c);
  const instrumentIds=new Set(getApplicableInstrumentIds(c));

  if(!has(g,'object'))issues.push(issue('block','object','Objeto pericial não delimitado.'));
  if(!has(g,'methodChoice'))issues.push(issue('block','methodChoice','Escolha metodológica não justificada.'));
  if(!has(g,'availableMaterial'))issues.push(issue('warning','availableMaterial','Material analisado não descrito.'));
  if(!has(g,'objectiveExam')&&c.context?.mode!=='Documental')issues.push(issue('warning','objectiveExam','Exame objetivo não registrado.'));
  if(!has(d,'alternatives'))issues.push(issue('warning','alternatives','Hipóteses alternativas não analisadas.'));
  if(!has(d,'certainty'))issues.push(issue('warning','certainty','Grau de sustentação não registrado.'));

  if(c.context?.legalSphereId&&c.context?.matterId&&!contextualProfile.baseProtocolId){
    issues.push(issue('warning','context','Ainda não existe perfil contextual específico validado para esta combinação de esfera e objeto; mantenha o método geral e selecione protocolos/instrumentos manualmente.'));
  }

  if(!methodologyContext.purposeId){
    issues.push(issue('warning','purpose','Finalidade médico-pericial ainda não definida.'));
  }

  const protocolIds=new Set(getApplicableProtocols(c).map(protocol=>protocol.id));
  if(protocolIds.has('aesthetic')){
    if(u.consolidationStatus!=='Sim, com fundamento registrado')issues.push(issue('block','consolidationStatus','Sem consolidação fundamentada, não cabe sequela estética permanente definitiva.'));
    if(u.objectiveChange!=='Sim')issues.push(issue('block','objectiveChange','A valoração estética exige alteração morfológica objetivamente demonstrada.'));
    if(!has(s,'topography')||!has(s,'dimensions'))issues.push(issue('block','topography','Descrição morfológica incompleta: topografia e dimensões são necessárias.'));
    if(u.priorAppearanceStatus==='Não há informação')issues.push(issue('warning','priorAppearanceStatus','Ausência de estado estético anterior limita a comparação.'));
    if(instrumentIds.has('aipe')&&has(s,'aipeScore')&&!has(s,'aipeRationale'))issues.push(issue('warning','aipeRationale','AIPE registrada sem fundamentação descritiva.'));
    if(!instrumentIds.has('aipe')&&has(s,'aipeScore'))issues.push(issue('warning','aipeScore','Há registro AIPE, mas o instrumento não está ativo para o contexto atual; confirme sua pertinência metodológica ou remova o registro da análise ativa.'));
  }
  if(protocolIds.has('capacity')){
    if(u.functionalDeficitStatus!=='Sim')issues.push(issue('block','functionalDeficitStatus','Diagnóstico isolado não demonstra incapacidade; falta déficit funcional objetivo.'));
    if(u.activityKnown!=='Sim, detalhadamente')issues.push(issue('block','activityKnown','Atividade habitual e exigências ainda não estão suficientemente caracterizadas.'));
    if(!has(s,'residualCapacity'))issues.push(issue('warning','residualCapacity','Capacidade residual não analisada.'));
  }
  if(protocolIds.has('causation')){
    if(!['Sim','Parcialmente'].includes(u.eventProof))issues.push(issue('block','eventProof','Evento ou exposição não está suficientemente caracterizado.'));
    if(!['Compatível','Parcialmente compatível'].includes(u.temporalResult))issues.push(issue('block','temporalResult','Compatibilidade temporal insuficiente para conclusão causal positiva.'));
    if(u.alternativesStatus!=='Sim')issues.push(issue('warning','alternativesStatus','Causas alternativas não foram integralmente avaliadas.'));
  }
  // A seleção do barema funcional é pela finalidade médico-jurídica da perícia,
  // nunca pela causa do trauma (issue #56). Advisória, nunca bloqueio: o motor
  // aponta a lacuna ou a ambiguidade, a escolha permanece da perita.
  //
  // O gatilho não é o protocolo de incapacidade. "Dano corporal" é matéria do
  // cadastro sem protocolo próprio — resolve para o protocolo genérico — e é
  // exatamente a matéria a que a Tabela Brasileira se dirige. Gatear em
  // `capacity` deixava o caso central da issue fora do roteador.
  if(functionalBaremaIsAtStake({matter:c.context?.matter,matterId:c.context?.matterId,protocolIds:[...protocolIds]})){
    const finalidadeId=normalizeFinalidadeId(g.finalidadeChoice);
    if(!finalidadeId){
      issues.push(issue('warning','finalidadeChoice','Finalidade médico-jurídica da perícia não declarada. O barema funcional não deve ser escolhido pela causa do trauma (acidente de trânsito, queda etc.); declare a finalidade no passo Delimitação, em Exame e método.'));
    }else{
      const dpvatQuesitoExplicit=(Array.isArray(c.questions)?c.questions:[]).some(question=>/dpvat/i.test(String(question?.text||'')));
      const barema=resolveFunctionalBaremaTrack({finalidadeId,dpvatQuesitoExplicit});
      if(barema.requiresManualChoice)issues.push(issue('warning','finalidadeChoice',barema.rationale));
    }
  }
  if(protocolIds.has('liability')){
    if(!['Sim','Parcialmente'].includes(u.indicationStatus))issues.push(issue('warning','indicationStatus','Indicação técnica não está suficientemente esclarecida.'));
    if(u.damageStatus!=='Sim')issues.push(issue('block','damageStatus','Dano atual não está objetivamente demonstrado.'));
    if(!['Demonstrado','Possível'].includes(u.nexusStatus))issues.push(issue('block','nexusStatus','Resultado adverso não equivale a erro; falta nexo entre eventual desvio e dano.'));
  }
  return {issues,blocks:issues.filter(x=>x.severity==='block').length,warnings:issues.filter(x=>x.severity==='warning').length};
}

export function completion(c){
  const p=getProtocol(c.context?.matter);
  const applicable=getApplicableProtocols(c);
  const g=c.methodology?.general||{}, s=c.methodology?.specific||{}, u=c.methodology?.guided||{};
  // Um campo pode declarar o próprio critério de resposta; sem isso, basta valor.
  const answered=(bag,f)=>f.answeredBy?Boolean(f.answeredBy(bag?.[f.id])):has(bag,f.id);
  const stepCompletion=protocol=>protocol.steps.map(step=>step.fields.every(f=>f.type==='narrative'?answered(s,f):answered(u,f)));
  const specificByProtocol=Object.fromEntries(applicable.map(protocol=>[protocol.id,stepCompletion(protocol)]));
  return {
    general:generalMethod.map(x=>x.fields.every(f=>answered(g,f))),
    specific:specificByProtocol[p.id]||stepCompletion(p),
    specificByProtocol
  };
}

export { generalMethod, getProtocol };
