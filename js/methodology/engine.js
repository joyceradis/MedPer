import { generalMethod, getProtocol } from './protocols.js';

const has=(o,k)=>{const v=o?.[k];return typeof v==='string'?Boolean(v.trim()):Boolean(v)};

export function auditCase(c){
  const issues=[];
  const g=c.methodology?.general||{}, s=c.methodology?.specific||{}, u=c.methodology?.guided||{}, d=c.methodology?.decision||{};
  if(!has(g,'object'))issues.push({severity:'block',text:'Objeto pericial não delimitado.'});
  if(!has(g,'methodChoice'))issues.push({severity:'block',text:'Escolha metodológica não justificada.'});
  if(!has(g,'availableMaterial'))issues.push({severity:'warning',text:'Material analisado não descrito.'});
  if(!has(g,'objectiveExam')&&c.context?.mode!=='Documental')issues.push({severity:'warning',text:'Exame objetivo não registrado.'});
  if(!has(d,'alternatives'))issues.push({severity:'warning',text:'Hipóteses alternativas não analisadas.'});
  if(!has(d,'certainty'))issues.push({severity:'warning',text:'Grau de sustentação não registrado.'});
  const matter=c.context?.matter;
  if(matter==='Dano estético'){
    if(u.consolidationStatus!=='Sim, com fundamento registrado')issues.push({severity:'block',text:'Sem consolidação fundamentada, não cabe sequela estética permanente definitiva.'});
    if(u.objectiveChange!=='Sim')issues.push({severity:'block',text:'A valoração estética exige alteração morfológica objetivamente demonstrada.'});
    if(!has(s,'topography')||!has(s,'dimensions'))issues.push({severity:'block',text:'Descrição morfológica incompleta: topografia e dimensões são necessárias.'});
    if(u.priorAppearanceStatus==='Não há informação')issues.push({severity:'warning',text:'Ausência de estado estético anterior limita a comparação.'});
    if(has(s,'aipeScore')&&!has(s,'aipeRationale'))issues.push({severity:'warning',text:'AIPE registrada sem fundamentação descritiva.'});
  }
  if(matter==='Incapacidade'){
    if(u.functionalDeficitStatus!=='Sim')issues.push({severity:'block',text:'Diagnóstico isolado não demonstra incapacidade; falta déficit funcional objetivo.'});
    if(u.activityKnown!=='Sim, detalhadamente')issues.push({severity:'block',text:'Atividade habitual e exigências ainda não estão suficientemente caracterizadas.'});
    if(!has(s,'residualCapacity'))issues.push({severity:'warning',text:'Capacidade residual não analisada.'});
  }
  if(matter==='Nexo causal e concausa'){
    if(!['Sim','Parcialmente'].includes(u.eventProof))issues.push({severity:'block',text:'Evento ou exposição não está suficientemente caracterizado.'});
    if(!['Compatível','Parcialmente compatível'].includes(u.temporalResult))issues.push({severity:'block',text:'Compatibilidade temporal insuficiente para conclusão causal positiva.'});
    if(u.alternativesStatus!=='Sim')issues.push({severity:'warning',text:'Causas alternativas não foram integralmente avaliadas.'});
  }
  if(matter==='Responsabilidade profissional'){
    if(!['Sim','Parcialmente'].includes(u.indicationStatus))issues.push({severity:'warning',text:'Indicação técnica não está suficientemente esclarecida.'});
    if(u.damageStatus!=='Sim')issues.push({severity:'block',text:'Dano atual não está objetivamente demonstrado.'});
    if(!['Demonstrado','Possível'].includes(u.nexusStatus))issues.push({severity:'block',text:'Resultado adverso não equivale a erro; falta nexo entre eventual desvio e dano.'});
  }
  return {issues,blocks:issues.filter(x=>x.severity==='block').length,warnings:issues.filter(x=>x.severity==='warning').length};
}

export function completion(c){
  const p=getProtocol(c.context?.matter);
  const g=c.methodology?.general||{}, s=c.methodology?.specific||{}, u=c.methodology?.guided||{};
  const steps=p.steps.map(step=>step.fields.every(f=>f.type==='narrative'?has(s,f.id):has(u,f.id)));
  return {general:generalMethod.map(x=>x.fields.every(f=>has(g,f.id))),specific:steps};
}

export { generalMethod, getProtocol };
