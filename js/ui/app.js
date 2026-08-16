import { normalizeCase } from '../core/store.js';
import { applyLifecycleAction } from '../core/case-lifecycle.js';
import { auditCase, completion, generalMethod } from '../methodology/engine.js';
import { getApplicableProtocols, getProtocol, getSuggestedProtocolIds, protocols } from '../methodology/protocols.js';
import { AIPE_CATEGORIES, AIPE_CONTEXTS, AIPE_CRITERIA, AIPE_IMPACT_BANDS } from '../methodology/aipe.js';
import { getKnowledgeSource, getRelevantDivergences, getRelevantKnowledge, REFERENCE_CLASSES } from '../knowledge/library.js';
import { normalizeWorkflowTab, stageForAuditField, WORKFLOW_STAGES } from './workflow.js';
import { renderDashboardHome } from './dashboard-view.js';

const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
const uid=p=>`${p}_${crypto.randomUUID?.()||Date.now()}`;
const tabs=WORKFLOW_STAGES.map(({id,label})=>[id,label]);
const branches={Judicial:['Cível','Trabalhista','Previdenciário','Criminal','Família','Fazenda Pública','Justiça Federal','Outro'],Administrativa:['Junta médica','Servidor público','Processo disciplinar','Concurso ou ingresso','Avaliação funcional','Outro'],Previdenciária:['INSS / RGPS','Regime próprio','Benefício assistencial','Revisão de benefício','Outro'],'Trabalhista e ocupacional':['Reclamação trabalhista','Acidente de trabalho','Doença ocupacional','Capacidade laborativa','Outro'],Securitária:['Seguro de pessoas','Acidente pessoal','Invalidez','Cobertura contratual','Outro'],'Ético-profissional':['Processo ético-profissional','Análise de conduta','Responsabilidade médica','Outro'],'Extrajudicial / particular':['Parecer pré-processual','Assistência técnica','Avaliação de dano corporal','Consultoria','Outro']};
const matters=['Dano estético','Dano corporal','Incapacidade','Nexo causal e concausa','Responsabilidade profissional','Acidente de trabalho','Doença ocupacional','Invalidez securitária','Benefício previdenciário','Capacidade civil ou funcional','Outro'];

function route(){const m=location.hash.match(/^#\/case\/([^/]+)\/(\w+)/);return m?{caseId:m[1],tab:normalizeWorkflowTab(m[2])}:{caseId:null,tab:'home'};}
function findCase(state,id){return state.cases.find(c=>c.id===id)||null;}
function setPath(obj,path,value){const parts=path.split('.');let node=obj;for(let i=0;i<parts.length-1;i++){node[parts[i]]??={};node=node[parts[i]];}node[parts.at(-1)]=value;}
function header(){return`<header class="topbar"><div class="topbar-inner"><button class="brand" data-home><span class="brand-copy"><strong>MedPer</strong><span>Perícia estruturada</span></span></button><div class="top-actions"><span class="save-state">Salvo neste dispositivo</span><button class="button button-secondary" data-account>Entrar</button><button class="button button-primary" data-new-case>Nova perícia</button></div></div></header>`;}
function panel(title,help,body,full=true){return`<section class="panel ${full?'panel-full':''}"><div class="panel-head"><div><h2>${esc(title)}</h2>${help?`<p>${esc(help)}</p>`:''}</div></div>${body}</section>`;}
function textarea(path,label,value,help=''){return`<label class="field"><span>${esc(label)}</span><textarea data-bind="${esc(path)}" placeholder="${esc(help)}">${esc(value||'')}</textarea>${help?`<small class="field-help">${esc(help)}</small>`:''}</label>`;}
// Quando o título do painel já nomeia o campo, repetir o rótulo e ainda ecoar o
// texto de apoio dentro e fora do campo é ruído: a mesma frase aparecia três vezes
// em pouco mais de um palmo de tela. Aqui o rótulo continua existindo para leitores
// de tela e o texto de apoio aparece uma única vez, como placeholder.
function bareField(path,label,value,help=''){return`<label class="field field-bare"><span class="sr-only">${esc(label)}</span><textarea data-bind="${esc(path)}" placeholder="${esc(help)}">${esc(value||'')}</textarea></label>`;}
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
// Sair do campo de objeto pericial re-renderiza a tela — é assim que o bloqueio
// correspondente deixa de aparecer. Mas o re-render destrói o DOM, e uma lista que a
// médica acabou de abrir voltava fechada. O estado de abertura é preferência de
// leitura, não dado do caso: vive aqui, fora do store, e sobrevive ao re-render.
const viewState={auditAheadOpen:false};
// Um valor já registrado que não consta mais da lista de opções — porque a escala foi
// corrigida depois — não pode simplesmente sumir da tela: o dado continua no caso e a
// perita precisa vê-lo para decidir se reclassifica. Ele é exibido ao final, marcado
// como registro anterior, em vez de deixar a pergunta aparentando nunca ter sido
// respondida. Nada é reescrito automaticamente; a reclassificação é decisão dela.
function choices(path,label,value,options){const legacy=value&&!options.includes(value);const list=legacy?[...options,value]:options;return`<fieldset class="guided-question"><legend>${esc(label)}</legend><div class="guided-choices">${list.map(o=>`<label class="guided-choice${legacy&&o===value?' is-legacy':''}"><input type="radio" name="${esc(path)}" data-bind="${esc(path)}" value="${esc(o)}" ${value===o?'checked':''}><span>${esc(o)}${legacy&&o===value?'<small>registro anterior — fora da escala atual</small>':''}</span></label>`).join('')}</div></fieldset>`;}

function renderHome(state,filter='active'){return renderDashboardHome(state,filter);}

function sidebar(c,tab){return`<aside class="case-sidebar"><button class="back-link" data-home>← Todos os casos</button><div class="case-identity"><span class="eyebrow">${esc(c.context?.sphere||'Perícia')}</span><h2>${esc(c.title)}</h2><p>${esc(c.reference||'Sem referência')}</p></div><nav class="case-nav">${tabs.map(([id,label])=>`<button data-tab="${id}" class="${tab===id?'is-active':''}"><span>${label}</span></button>`).join('')}</nav></aside>`;}
function caseHeader(c,tab){return`<header class="case-head"><div><span class="eyebrow">${esc(c.context?.role||'Atuação médico-pericial')}</span><h1 class="case-title">${esc(tabs.find(x=>x[0]===tab)?.[1]||'Caso')}</h1><div class="meta-line"><span>${esc(c.context?.branch||'')}</span><span>${esc(c.context?.matter||'')}</span><span>${esc(c.context?.mode||'')}</span></div></div><button class="button button-secondary button-small" data-export>Exportar JSON</button></header>`;}
// A base técnica vem depois do trabalho da etapa, não antes. Como referência de
// consulta, ela empurrava a única tarefa da tela para fora do campo de visão; a
// posição agora corresponde ao papel que ela declara ter.
function renderCase(c,tab){const currentIndex=tabs.findIndex(([id])=>id===tab);return`<div class="shell">${header()}<main id="workspace" class="main case-layout">${sidebar(c,tab)}<section class="case-content">${caseHeader(c,tab)}<div class="stage-progress"><span class="stage-progress-label">Etapa ${currentIndex+1} de ${tabs.length}</span><div class="stage-status" role="img" aria-label="Etapa ${currentIndex+1} de ${tabs.length}: ${esc(tabs[currentIndex]?.[1]||'')}">${tabs.map(([id],index)=>`<span class="${index<currentIndex?'is-complete':index===currentIndex?'is-current':''}" title="${esc(tabs[index][1])}"></span>`).join('')}</div></div>${renderTab(c,tab)}${renderKnowledgePanel(c,tab)}</section></main></div>`;}

function renderKnowledgePanel(c,tab){
  const items=getRelevantKnowledge(c,{stageId:tab}),divergences=getRelevantDivergences(c,{stageId:tab});
  if(!items.length&&!divergences.length)return'';
  const cards=items.map((entry,index)=>{const source=getKnowledgeSource(entry.sourceId),classes=(source?.classes||[]).map(id=>REFERENCE_CLASSES[id]||id);return`<details class="knowledge-card" ${index===0?'open':''}><summary><span><small>${esc(classes.join(' + '))}</small><strong>${esc(entry.title)}</strong></span><span class="knowledge-disclosure" aria-hidden="true">›</span></summary><div class="knowledge-card-body"><p>${esc(entry.summary)}</p><dl><div><dt>Finalidade</dt><dd>${esc(entry.purpose)}</dd></div><div><dt>Força</dt><dd>${esc(entry.strength)}</dd></div><div><dt>Limitação</dt><dd>${esc(entry.limitation)}</dd></div></dl><div class="knowledge-source"><strong>${esc(source?.title||'Fonte')}</strong><span>${esc(source?.citation||'')}</span><span><b>Versão:</b> ${esc(source?.version||'')}</span><span><b>Âmbito:</b> ${esc(source?.scope||'')}</span><span><b>Localização:</b> ${esc(entry.locator)}</span>${source?.note?`<em>${esc(source.note)}</em>`:''}</div></div></details>`;}).join('');
  const conflicts=divergences.map(entry=>`<div class="knowledge-divergence"><strong>Divergência preservada · ${esc(entry.title)}</strong><p>${esc(entry.description)}</p><span>${esc(entry.handling)}</span></div>`).join('');
  return`<section class="knowledge-panel" aria-label="Base técnica contextual"><header class="knowledge-head"><div><span class="eyebrow">Base técnica contextual</span><h2>Referências para esta etapa</h2><p>Selecionadas pelo assunto do caso. Servem para consulta e conferência; não alteram o método nem produzem conclusões.</p></div>${items.length?`<span class="knowledge-count">${items.length}</span>`:''}</header>${conflicts}${cards?`<div class="knowledge-grid">${cards}</div>`:''}</section>`;
}

function renderTab(c,tab){if(tab==='delimitation')return renderSummary(c);if(tab==='evidence')return renderDocuments(c);if(tab==='timeline')return renderTimeline(c);if(tab==='hypotheses')return renderHypotheses(c);if(tab==='method')return renderMethod(c);if(tab==='reasoning')return renderReasoning(c);if(tab==='conclusion')return renderConclusion(c);if(tab==='questions')return renderQuestions(c);return renderReport(c);}
function auditItems(issues){return issues.map(i=>`<div class="audit-item ${i.severity}">${esc(i.text)}</div>`).join('');}
function frameStrip(c){return`<div class="case-frame">${[['Esfera',c.context?.sphere],['Ramo',c.context?.branch],['Papel da médica',c.context?.role],['Matéria',c.context?.matter],['Modalidade',c.context?.mode],['Situação',c.status]].map(([l,v])=>`<span class="case-frame-item"><small>${esc(l)}</small><b>${esc(v||'A definir')}</b></span>`).join('')}</div>`;}
// A tela abria com referência bibliográfica, enquadramento e nove pendências antes
// de mostrar o único campo que se preenche aqui. A ordem agora é: a tarefa, o
// contexto que a enquadra e só então a situação metodológica.
//
// A auditoria continua completa — o total de bloqueios e ressalvas do caso é
// declarado em texto e a lista integral permanece a um clique — mas em primeiro
// plano ficam apenas as pendências que se resolvem nesta etapa. Um caso recém-aberto
// exibia cinco bloqueios sobre exame, consolidação e morfologia antes de a médica
// escrever a primeira palavra; isso ensina a ignorar bloqueio, que é o oposto do
// que a auditoria existe para fazer. Nenhuma regra de engine.js foi alterada.
function renderSummary(c){
  const a=auditCase(c);
  const here=a.issues.filter(i=>stageForAuditField(i.field)==='delimitation');
  const ahead=a.issues.filter(i=>stageForAuditField(i.field)!=='delimitation');
  const totals=`<p class="audit-totals">${plural(a.blocks,'bloqueio','bloqueios')} e ${plural(a.warnings,'ressalva','ressalvas')} no caso · ${plural(c.evidence.length,'fonte','fontes')} · ${plural(c.facts.length,'fato','fatos')}</p>`;
  const current=here.length?`<div class="audit-list">${auditItems(here)}</div>`:'<p class="notice">Nada pendente nesta etapa.</p>';
  const upcoming=ahead.length?`<details class="audit-ahead"${viewState.auditAheadOpen?' open':''}><summary>${plural(ahead.length,'pendência registrada','pendências registradas')} para etapas seguintes</summary><div class="audit-list">${auditItems(ahead)}</div></details>`:'';
  return`<div class="content-grid">${panel('Objeto pericial','A pergunta técnica que o laudo precisa responder. Todo o restante do caso é medido por ela.',bareField('scope','Objeto pericial',c.scope,'Transcreva ou sintetize o objeto nos limites da nomeação ou contratação.'))}${panel('Enquadramento','Contexto que define o método e o documento final.',frameStrip(c))}${panel('Situação metodológica','Bloqueios impedem conclusão definitiva; ressalvas limitam seu alcance.',`${totals}${current}${upcoming}`)}</div>`;
}
function renderDocuments(c){return`<div class="content-grid">${panel('Fontes','Cadastre documentos e elementos examinados.',`<button class="button button-primary" data-add="evidence">Adicionar fonte</button><div class="item-list" style="margin-top:14px">${c.evidence.map(e=>`<div class="list-item"><h3>${esc(e.title)}</h3><p>${esc(e.description||'')}</p><div class="item-meta"><span>${esc(e.pages||'Sem páginas')}</span></div></div>`).join('')||'<p class="notice">Nenhuma fonte cadastrada.</p>'}</div>`)}${panel('Fatos médico-periciais','Cada fato deve indicar a fonte da qual foi extraído.',`<button class="button button-primary" data-add="fact">Adicionar fato</button><div class="item-list" style="margin-top:14px">${c.facts.map(f=>`<div class="list-item"><h3>${esc(f.text)}</h3><p>${esc(f.nature||'')}</p><div class="item-meta"><span>${esc(f.page||'Sem página')}</span></div></div>`).join('')||'<p class="notice">Nenhum fato extraído.</p>'}</div>`)}</div>`;}
function renderTimeline(c){return panel('Cronologia','Organize eventos clínicos, documentais e processuais.',`<button class="button button-primary" data-add="event">Adicionar evento</button><div class="timeline" style="margin-top:14px">${c.events.map(e=>`<div class="timeline-item"><div class="timeline-date">${esc(e.date||'Data incerta')}<span class="timeline-kind">${esc(e.kind||'Evento')}</span></div><div><strong>${esc(e.title)}</strong><p>${esc(e.description||'')}</p></div></div>`).join('')||'<p class="notice">Nenhum evento registrado.</p>'}</div>`);}
function renderAipeReference(){
  return`<section class="aipe-workspace"><header><div><span class="eyebrow">AIPE</span><h3>Tabelas de referência</h3><p>Consulta aberta para apoiar a valoração. A categoria e a pontuação permanecem uma decisão médico-pericial fundamentada.</p></div></header><div class="aipe-table-wrap"><table class="aipe-table"><thead><tr><th>Critério</th><th>0</th><th>1</th><th>2</th></tr></thead><tbody>${AIPE_CRITERIA.map(row=>`<tr><th>${esc(row.label)}</th>${row.options.map(option=>`<td>${esc(option)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="aipe-table-wrap"><table class="aipe-table aipe-category-table"><thead><tr><th>Categoria</th><th>Faixa</th><th>Graduação dentro da faixa</th></tr></thead><tbody>${AIPE_CATEGORIES.map(category=>`<tr><th>${esc(category.label)}</th><td><strong>${category.range[0]===category.range[1]?category.range[0]:`${category.range[0]}–${category.range[1]}`}</strong></td><td>${(AIPE_IMPACT_BANDS[category.id]||[]).map(([level,points])=>`<span class="aipe-band"><span>${esc(level)}</span><strong>${esc(points)}</strong></span>`).join('')||'<span class="field-help">Sem graduação adicional</span>'}</td></tr>`).join('')}</tbody></table></div><div class="aipe-contexts"><span class="field-help">Contextos complementares previstos</span>${AIPE_CONTEXTS.map(context=>`<span>${esc(context.label)}</span>`).join('')}</div><p class="aipe-source">Referência documental: Fernandes et al., Saúde Debate. 2016;40(108):118–130 — AIPE/Brasil, quadros 1–4, pp. 122–125. Eventuais divergências da publicação são mantidas explícitas na base técnica.</p></section>`;
}
function protocolSelector(c,applicable){
  const primaryId=getProtocol(c.context?.matter).id,applicableIds=new Set(applicable.map(p=>p.id)),suggestedIds=new Set(getSuggestedProtocolIds(c));
  return`<div class="protocol-selector">${Object.values(protocols).map(protocol=>{const selected=applicableIds.has(protocol.id),primary=protocol.id===primaryId,suggested=suggestedIds.has(protocol.id);return`<button type="button" class="protocol-chip ${selected?'is-active':''}" data-protocol-toggle="${esc(protocol.id)}" ${primary?'disabled':''}><span>${esc(protocol.title)}</span><small>${primary?'Principal':suggested?'Sugerido':selected?'Adicionado':'Adicionar'}</small></button>`;}).join('')}</div>`;
}
function renderMethod(c){
  const applicable=getApplicableProtocols(c),done=completion(c);
  const general=generalMethod.map((phase,i)=>panel(phase.title,'Método geral obrigatório.',`<div class="form-grid">${phase.fields.map(f=>textarea(`methodology.general.${f.id}`,f.label,c.methodology.general[f.id],f.help)).join('')}</div><p class="notice">${done.general[i]?'Etapa concluída':'Etapa em andamento'}</p>`)).join('');
  const selector=panel('Métodos aplicáveis','O MedPer sugere pelo contexto e pelo objeto. Você mantém o controle sobre os módulos adicionais.',protocolSelector(c,applicable));
  const specific=applicable.map(p=>panel(`Protocolo · ${p.title}`,p.id==='aesthetic'?'AIPE disponível neste caso.':'Somente as etapas pertinentes a este objeto ficam abertas.',`${p.id==='aesthetic'?renderAipeReference():''}<div class="guided-methodology">${p.steps.map((s,i)=>`<details class="guided-step" ${i===0?'open':''}><summary><span>${esc(s.title)}</span><small>${done.specificByProtocol?.[p.id]?.[i]?'Concluído':'Em andamento'}</small></summary><div class="guided-step-body">${s.fields.map(f=>f.type==='narrative'?textarea(`methodology.specific.${f.id}`,f.label,c.methodology.specific[f.id],f.help):choices(`methodology.guided.${f.id}`,f.label,c.methodology.guided[f.id],f.options)).join('')}</div></details>`).join('')}</div>`)).join('');
  return`<div class="methodology-stack">${general}${selector}${specific}</div>`;
}
function renderHypotheses(c){const d=c.methodology.decision;return`<div class="content-grid">${panel('Hipóteses a testar','Explicite a proposição principal e as explicações concorrentes antes da conclusão.',`<div class="form-grid">${textarea('methodology.decision.claim','Proposição técnico-pericial',d.claim,'Qual hipótese está sendo testada?')}${textarea('methodology.decision.alternatives','Hipóteses alternativas',d.alternatives,'Quais outras explicações razoáveis precisam ser confrontadas?')}</div>`)}${panel('Necessidades de diligência','Registre o que ainda falta para responder ao objeto.',textarea('documentGaps','Lacunas e diligências necessárias',c.documentGaps,'Documentos, imagens, exame presencial, avaliação especializada ou esclarecimentos necessários.'))}</div>`;}
function renderReasoning(c){const d=c.methodology.decision;return panel('Fundamentação técnico-científica','Confronte os dados favoráveis e contrários, hipóteses alternativas e limitações.',`<div class="form-grid">${textarea('methodology.decision.favorable','Elementos favoráveis',d.favorable,'Dados que sustentam a proposição.')}${textarea('methodology.decision.contrary','Elementos contrários',d.contrary,'Dados que enfraquecem a proposição.')}${textarea('methodology.decision.alternatives','Hipóteses alternativas',d.alternatives,'Compare explicações concorrentes.')}${textarea('methodology.decision.limits','Limitações relevantes',d.limits,'Restrições documentais, temporais, técnicas ou de examinabilidade.')}</div>`);}
function renderConclusion(c){const a=auditCase(c),d=c.methodology.decision;return`<div class="content-grid">${panel('Conclusão admissível','A linguagem deve ser proporcional à suficiência real dos elementos.',`<div class="form-grid">${textarea('methodology.decision.certainty','Grau de sustentação',d.certainty,'Suficiente, limitado, inconclusivo ou incompatível.')}${textarea('methodology.decision.admissibleConclusion','Conclusão',d.admissibleConclusion,'Responda ao objeto sem extrapolar os dados.')}</div>`)}${panel('Controle de suficiência','Bloqueios impedem conclusão definitiva; ressalvas limitam seu alcance.',`<div class="audit-list">${a.issues.map(i=>`<div class="audit-item ${i.severity}"><strong>${i.severity==='block'?'Bloqueio':'Ressalva'}:</strong> ${esc(i.text)}</div>`).join('')||'<p class="notice">Método apto para conclusão.</p>'}</div>`)}</div>`;}
function renderQuestions(c){return panel('Quesitos','Responda diretamente e fundamente.',`<button class="button button-primary" data-add="question">Adicionar quesito</button><div class="question-list" style="margin-top:14px">${c.questions.map((q,i)=>`<div class="list-item"><h3>${esc(q.text)}</h3>${textarea(`questions.${i}.answer`,'Resposta',q.answer,'Resposta direta e fundamentada.')}</div>`).join('')||'<p class="notice">Nenhum quesito cadastrado.</p>'}</div>`);}
function renderReport(c){const a=auditCase(c),g=c.methodology.general,d=c.methodology.decision;return panel('Documento final','Prévia derivada do estado estruturado.',`<div class="report-preview">${a.blocks?`<div class="notice notice-danger"><strong>Documento preliminar:</strong> há ${a.blocks} bloqueio(s) metodológico(s).</div>`:''}<h2>${esc(c.context?.role==='Perita do juízo'?'LAUDO MÉDICO-PERICIAL':'PARECER MÉDICO-PERICIAL')}</h2><h3>OBJETO</h3><p>${esc(c.scope||g.object||'Não registrado.')}</p><h3>METODOLOGIA</h3><p>${esc(g.methodChoice||'Não registrada.')}</p><h3>MATERIAL ANALISADO</h3><p>${esc(g.availableMaterial||'Não registrado.')}</p><h3>ANÁLISE TÉCNICO-CIENTÍFICA</h3><p>${esc(d.favorable||'Não registrada.')}</p><h3>HIPÓTESES ALTERNATIVAS</h3><p>${esc(d.alternatives||'Não registradas.')}</p><h3>LIMITAÇÕES</h3><p>${esc(d.limits||'Não registradas.')}</p><h3>GRAU DE SUSTENTAÇÃO</h3><p>${esc(d.certainty||'Não registrado.')}</p><h3>CONCLUSÃO</h3><p>${esc(d.admissibleConclusion||'Não formulada.')}</p><h3>QUESITOS</h3>${c.questions.map(q=>`<p><strong>${esc(q.text)}</strong><br>${esc(q.answer||'Sem resposta.')}</p>`).join('')||'<p>Não apresentados.</p>'}</div>`);}

function demoCase(){return normalizeCase({id:uid('case'),title:'Caso demonstrativo · dano estético',reference:'DEMO-001',status:'Em preparação',context:{sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano estético',mode:'Presencial e documental'},scope:'Apurar a existência de dano estético e sua extensão.',evidence:[{id:uid('ev'),title:'Prontuário inicial',pages:'43–51',description:'Atendimento inicial.'}],facts:[{id:uid('fact'),text:'Queimadura facial documentada.',nature:'Documentado',page:'47'}],events:[{id:uid('event'),date:'2019-03-14',kind:'Clínico',title:'Atendimento inicial'}]});}

export function createApp({store,root,toast}){
  let wizard=null;
  let caseFilter='active';
  const render=()=>{const state=store.getState(),r=route(),c=r.caseId?findCase(state,r.caseId):null;root.innerHTML=c?renderCase(c,r.tab):renderHome(state,caseFilter);};
  const commitBoundValue=(target,{notify=true}={})=>{
    const path=target?.dataset?.bind;
    if(!path)return;
    const r=route();
    store.update(s=>{
      const c=findCase(s,r.caseId);
      if(!c)return;
      setPath(c,path,target.value);
    },{notify});
  };
  store.subscribe(render);
  const notify=msg=>{toast.textContent=msg;toast.classList.add('is-visible');setTimeout(()=>toast.classList.remove('is-visible'),2200);};
  root.addEventListener('click',e=>{const disclosure=e.target.closest('.audit-ahead>summary');if(disclosure){viewState.auditAheadOpen=!disclosure.parentElement.open;return;}const b=e.target.closest('button');if(!b)return;if(b.dataset.home!==undefined){location.hash='';render();return;}if(b.dataset.scrollTarget){document.getElementById(b.dataset.scrollTarget)?.scrollIntoView({behavior:'smooth',block:'start'});return;}if(b.dataset.caseFilter){caseFilter=b.dataset.caseFilter;render();return;}if(b.dataset.caseAction){handleCaseAction(b.dataset.caseId,b.dataset.caseAction);return;}if(b.dataset.openCase){location.hash=`#/case/${b.dataset.openCase}/delimitation`;return;}if(b.dataset.tab){const r=route();location.hash=`#/case/${r.caseId}/${b.dataset.tab}`;return;}if(b.dataset.protocolToggle){toggleProtocol(b.dataset.protocolToggle);return;}if(b.dataset.newCase!==undefined){openWizard();return;}if(b.dataset.demo!==undefined){store.update(s=>{const c=demoCase();s.cases.unshift(c);s.currentCaseId=c.id;});location.hash=`#/case/${store.getState().cases[0].id}/delimitation`;return;}if(b.dataset.add){addEntity(b.dataset.add);return;}if(b.dataset.export!==undefined){const r=route(),c=findCase(store.getState(),r.caseId);const blob=new Blob([JSON.stringify(c,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${c.id}.json`;a.click();URL.revokeObjectURL(a.href);}});
  root.addEventListener('input',e=>{
    const path=e.target?.dataset?.bind;
    if(!path)return;
    commitBoundValue(e.target,{notify:e.target.type==='radio'});
  });
  // Sair de um campo de texto redesenha a tela — é assim que o bloqueio correspondente
  // deixa de aparecer. Só que o blur acontece no mousedown: o redesenho destruía o
  // elemento sob o ponteiro antes do mouseup, e o clique que causou o blur nunca
  // chegava ao destino. Na prática, depois de escrever qualquer campo, o primeiro
  // clique era engolido — ao trocar de etapa, ao abrir uma lista, ao adicionar uma
  // fonte. O valor continua sendo gravado na hora; apenas o redesenho espera o
  // ponteiro ser solto, e ocorre depois de o clique ter produzido seu efeito.
  let renderQueued=false,pointerDown=false;
  const flushRender=()=>{pointerDown=false;if(!renderQueued)return;renderQueued=false;setTimeout(render,0);};
  document.addEventListener('pointerdown',()=>{pointerDown=true;},true);
  document.addEventListener('pointerup',flushRender,true);
  document.addEventListener('pointercancel',flushRender,true);
  root.addEventListener('change',e=>{
    const path=e.target?.dataset?.bind;
    if(!path||e.target.type==='radio')return;
    commitBoundValue(e.target,{notify:false});
    if(pointerDown){renderQueued=true;return;}
    render();
  });
  window.addEventListener('hashchange',render);

  function handleCaseAction(caseId,action){
    if(action==='delete'){
      const c=findCase(store.getState(),caseId);
      if(!c)return;
      const accepted=window.confirm(`Excluir definitivamente “${c.title}”? Esta ação não pode ser desfeita.`);
      if(!accepted)return;
      store.update(s=>{s.cases=s.cases.filter(item=>item.id!==caseId);if(s.currentCaseId===caseId)s.currentCaseId=null;});
      notify('Perícia excluída definitivamente.');
      return;
    }
    store.update(s=>{const c=findCase(s,caseId);if(c)applyLifecycleAction(c,action);});
    const messages={complete:'Perícia marcada como concluída.',reopen:'Perícia reaberta.',trash:'Perícia movida para a lixeira.',restore:'Perícia restaurada.'};
    notify(messages[action]||'Perícia atualizada.');
  }

  function toggleProtocol(protocolId){
    const r=route();
    store.update(s=>{
      const c=findCase(s,r.caseId);
      if(!c)return;
      c.methodology.activeProtocolIds=Array.isArray(c.methodology.activeProtocolIds)?c.methodology.activeProtocolIds:[];
      c.methodology.dismissedProtocolIds=Array.isArray(c.methodology.dismissedProtocolIds)?c.methodology.dismissedProtocolIds:[];
      const primaryId=getProtocol(c.context?.matter).id;
      if(protocolId===primaryId)return;
      const activeIndex=c.methodology.activeProtocolIds.indexOf(protocolId);
      const currentlyApplicable=getApplicableProtocols(c).some(protocol=>protocol.id===protocolId);
      if(activeIndex>=0||currentlyApplicable){
        if(activeIndex>=0)c.methodology.activeProtocolIds.splice(activeIndex,1);
        if(!c.methodology.dismissedProtocolIds.includes(protocolId))c.methodology.dismissedProtocolIds.push(protocolId);
        return;
      }
      c.methodology.dismissedProtocolIds=c.methodology.dismissedProtocolIds.filter(id=>id!==protocolId);
      c.methodology.activeProtocolIds.push(protocolId);
    });
  }

  function openWizard(){wizard={sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano estético',mode:'Presencial e documental',title:'',reference:''};showWizard();}
  function showWizard(){const wrap=document.createElement('dialog');wrap.className='modal';wrap.innerHTML=`<form method="dialog"><header class="modal-header"><div><span class="eyebrow">Nova perícia</span><h2>Defina o contexto</h2><p>O contexto jurídico-pericial orientará os métodos disponíveis.</p></div></header><div class="form-grid"><label class="field"><span>Esfera</span><select name="sphere">${Object.keys(branches).map(x=>`<option ${x===wizard.sphere?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>Ramo</span><select name="branch">${branches[wizard.sphere].map(x=>`<option ${x===wizard.branch?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>Papel da médica</span><select name="role">${['Perita do juízo','Assistente técnica da parte autora','Assistente técnica da parte ré','Parecerista independente','Perita administrativa','Médica revisora'].map(x=>`<option ${x===wizard.role?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>Matéria</span><select name="matter">${matters.map(x=>`<option ${x===wizard.matter?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>Modalidade</span><select name="mode">${['Presencial e documental','Documental','Presencial','Indireta','Revisão de laudo anterior'].map(x=>`<option ${x===wizard.mode?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>Título</span><input name="title" required></label><label class="field"><span>Processo ou referência</span><input name="reference"></label></div><footer class="modal-footer modal-footer-end"><button class="button button-secondary" value="cancel">Cancelar</button><button class="button button-primary" value="confirm">Criar caso</button></footer></form>`;document.body.appendChild(wrap);wrap.addEventListener('change',e=>{wizard[e.target.name]=e.target.value;if(e.target.name==='sphere'){wizard.branch=branches[wizard.sphere][0];wrap.close();wrap.remove();showWizard();}});wrap.addEventListener('close',()=>{if(wrap.returnValue==='confirm'){const fd=new FormData(wrap.querySelector('form'));for(const [k,v] of fd)wizard[k]=v;if(!wizard.title.trim()){notify('Informe o título do caso.');wrap.remove();showWizard();return;}const c=normalizeCase({id:uid('case'),title:wizard.title,reference:wizard.reference,context:{sphere:wizard.sphere,branch:wizard.branch,role:wizard.role,matter:wizard.matter,mode:wizard.mode}});store.update(s=>{s.cases.unshift(c);s.currentCaseId=c.id;});location.hash=`#/case/${c.id}/delimitation`;}wrap.remove();});wrap.showModal();}
  function addEntity(kind){const r=route();const prompts={evidence:['Título da fonte','Páginas ou identificação'],fact:['Fato médico-pericial','Página ou trecho'],event:['Título do evento','Data (AAAA-MM-DD)'],question:['Texto do quesito','']};const [label,second]=prompts[kind];const d=document.createElement('dialog');d.className='modal modal-small';d.innerHTML=`<form method="dialog"><header class="modal-header"><div><h2>${esc(label)}</h2></div></header><div class="form-stack"><label class="field"><span>${esc(label)}</span><textarea name="primary" required></textarea></label>${second?`<label class="field"><span>${esc(second)}</span><input name="secondary"></label>`:''}</div><footer class="modal-footer modal-footer-end"><button class="button button-secondary" value="cancel">Cancelar</button><button class="button button-primary" value="confirm">Salvar</button></footer></form>`;document.body.appendChild(d);d.addEventListener('close',()=>{if(d.returnValue==='confirm'){const fd=new FormData(d.querySelector('form')),primary=String(fd.get('primary')||'').trim(),secondary=String(fd.get('secondary')||'').trim();if(primary)store.update(s=>{const c=findCase(s,r.caseId);if(kind==='evidence')c.evidence.push({id:uid('ev'),title:primary,pages:secondary,description:''});if(kind==='fact')c.facts.push({id:uid('fact'),text:primary,page:secondary,nature:'Documentado'});if(kind==='event')c.events.push({id:uid('event'),title:primary,date:secondary,kind:'Evento'});if(kind==='question')c.questions.push({id:uid('q'),text:primary,answer:''});});}d.remove();});d.showModal();}
  render();
}

// Superfície de caso exposta como função pura para regressão: a mesma string que o
// navegador renderiza pode ser verificada sem DOM.
export { renderCase as renderCaseSurface };
