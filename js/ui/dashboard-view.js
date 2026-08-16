import { CASE_FILTERS, filterCasesByLifecycle } from '../core/case-lifecycle.js';
import { buildDashboardModel, caseStageProgress } from './dashboard-model.js';
import { KNOWLEDGE_SOURCES, REFERENCE_CLASSES } from '../knowledge/library.js';
import { CONFERENCE_PROTOCOL, CONFERENCE_SEVERITY, conferenceItemId, conferenceProgress } from '../models/checklists.js';

const esc=(value='')=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

const svg=(paths,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
const icons={
  overview:svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>'),
  cases:svg('<rect x="3.5" y="6.5" width="17" height="13" rx="2"/><path d="M8 6.5V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5"/><path d="M3.5 11.5h17"/>'),
  calendar:svg('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>'),
  book:svg('<path d="M4 4.5A3.5 3.5 0 0 1 7.5 4H11v16H7.5A3.5 3.5 0 0 0 4 20.5z"/><path d="M20 4.5A3.5 3.5 0 0 0 16.5 4H13v16h3.5a3.5 3.5 0 0 1 3.5.5z"/>'),
  checklist:svg('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h6"/><path d="m7 8 .5.5L8.5 7.5m-1.5 4.5.5.5 1-1m-1.5 4.5.5.5 1-1"/>'),
  settings:svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.18.35.4.69.6 1 .18.3.5.55.9.6h.1v4h-.1a1.7 1.7 0 0 0-1.5.4z"/>'),
  search:svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'),
  arrow:svg('<path d="M5 12h14M14 7l5 5-5 5"/>'),
  bell:svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'),
  document:svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>'),
  exam:svg('<path d="M5 4v6a5 5 0 0 0 10 0V4"/><path d="M8 4v4M12 4v4M15 15v1a4 4 0 0 0 4 4"/><circle cx="19" cy="17" r="2"/>'),
  report:svg('<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>')
};

const SURFACES=new Set(['overview','cases','deadlines','references','models']);

export function conferenceCaseFromHash(hash=''){
  const match=String(hash||'').match(/^#\/dashboard\/models\/([^/]+)/);
  return match?decodeURIComponent(match[1]):'';
}

function surfaceFromHash(hash=''){
  const match=String(hash||'').match(/^#\/dashboard\/([^/]+)/);
  return match&&SURFACES.has(match[1])?match[1]:'overview';
}

function formatDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return{day:'--',month:'---',time:'--:--'};return{day:new Intl.DateTimeFormat('pt-BR',{day:'2-digit'}).format(d),month:new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(d).replace('.','').toUpperCase(),time:new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(d)};}
function relativeDays(value,now){const due=new Date(value),base=now instanceof Date?now:new Date(now);if(Number.isNaN(due.getTime())||Number.isNaN(base.getTime()))return'';const days=Math.max(0,Math.ceil((due-base)/864e5));return days===0?'hoje':days===1?'1 dia':`${days} dias`;}

function caseActions(c){if(c.status==='Lixeira')return `<button type="button" data-case-action="restore" data-case-id="${esc(c.id)}">Restaurar</button><button type="button" class="is-danger" data-case-action="delete" data-case-id="${esc(c.id)}">Excluir</button>`;if(c.status==='Concluída')return `<button type="button" data-case-action="reopen" data-case-id="${esc(c.id)}">Reabrir</button><button type="button" data-case-action="trash" data-case-id="${esc(c.id)}">Lixeira</button>`;return `<button type="button" data-case-action="complete" data-case-id="${esc(c.id)}">Concluir</button><button type="button" data-case-action="trash" data-case-id="${esc(c.id)}">Lixeira</button>`;}
function renderCase(c){const ctx=c.context||{};return `<article class="dashboard-case-card"><button class="dashboard-case-open" type="button" data-inspect-case="${esc(c.id)}"><div class="dashboard-case-topline"><span>${esc(ctx.role||ctx.setting||'Perícia')}</span><span>${esc(c.status)}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.reference||'Sem referência')}</p><div class="dashboard-case-meta"><span>${esc(ctx.unit||ctx.tribunal||'Unidade a definir')}</span>${ctx.legalSphere||ctx.branch?`<span>${esc(ctx.legalSphere||ctx.branch)}</span>`:''}${ctx.feeRegime?`<span>${esc(ctx.feeRegime)}</span>`:''}${ctx.matter?`<span>${esc(ctx.matter)}</span>`:''}</div></button><div class="dashboard-case-actions">${caseActions(c)}</div></article>`;}
function renderDeadline(d,now){const date=formatDate(d.dueAt);return `<article class="deadline-row"><span class="deadline-indicator is-${esc(d.severity)}" aria-hidden="true"></span><div class="deadline-date"><strong>${date.day}</strong><span>${date.month}</span></div><div class="deadline-copy"><strong>${esc(d.type||'Prazo')}</strong><span>${esc(d.caseTitle||'')}</span></div><div class="deadline-remaining"><strong>${esc(relativeDays(d.dueAt,now))}</strong><span>${date.time}</span></div></article>`;}

function nav(active){const items=[['overview','Visão geral',icons.overview],['cases','Meus casos',icons.cases],['deadlines','Agenda e prazos',icons.calendar],['references','Referências técnicas',icons.book],['models','Modelos e checklists',icons.checklist]];return `<nav class="dashboard-navigation" aria-label="Navegação principal">${items.map(([id,label,icon])=>`<button type="button" data-surface="${id}" class="${active===id?'is-active':''}">${icon}<span>${label}</span></button>`).join('')}<button type="button" data-account>${icons.settings}<span>Configurações</span></button></nav>`;}
function shell(content,active,displayName){return `<div class="app-shell-dashboard" data-dashboard-surface="${active}"><aside class="dashboard-sidebar"><div class="dashboard-brand"><img class="brand-logomark" src="./icon.svg" alt=""><div><strong><span class="wordmark-med">Med</span><span class="wordmark-per">Per</span></strong><span>Perícia estruturada</span></div></div>${nav(active)}<div class="dashboard-profile"><span class="profile-avatar">JR</span><div><strong>${esc(displayName)}</strong><span>Perita médica</span></div></div></aside><main id="workspace" class="dashboard-workspace">${content}</main></div>`;}
function pageHeader(title,subtitle,{search=true,newCase=true}={}){return `<header class="dashboard-toolbar"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="dashboard-toolbar-actions">${search?`<label class="dashboard-search">${icons.search}<span class="sr-only">Pesquisar</span><input type="search" placeholder="Pesquisar casos, processos, partes..." disabled></label>`:''}${newCase?'<button class="dashboard-new-case" type="button" data-new-case>+ Nova perícia</button>':''}</div></header>`;}

function caseProgress(c){
  const p=caseStageProgress(c);
  return `<div class="work-progress"><div class="work-progress-head"><strong>${p.currentLabel}</strong><span>${p.started} de ${p.total} etapas com registro</span></div><div class="work-progress-track" aria-hidden="true">${p.done.map((d,i)=>`<span class="${d?'is-done':i===p.currentIndex?'is-current':''}"></span>`).join('')}</div></div>`;
}
// O dashboard mostra o trabalho, não o inventário do aplicativo. Os três cards de
// atalho que ficavam no topo repetiam a barra lateral inteira; e dois painéis
// vazios ocupavam metade da tela para dizer que não havia nada. O caso em aberto
// é a âncora; o que está vazio se anuncia em uma linha.
function overview(state,filter,options){
  const now=options.now||new Date(),model=buildDashboardModel(state.cases||[],now),c=model.continueCase;
  const deadlines=model.deadlines.slice(0,3);
  const work=c?`<article class="work-card"><header><span class="work-role">${esc(c.context?.role||'Perita do juízo')}</span><h2>${esc(c.title||'Perícia sem título')}</h2><p class="work-meta">${[c.reference&&`Processo ${c.reference}`,c.context?.unit||c.context?.tribunal,c.context?.matter].filter(Boolean).map(esc).join(' · ')}</p></header>${caseProgress(c)}<button type="button" class="work-open" data-open-case="${esc(c.id)}">Abrir perícia ${icons.arrow}</button></article>`
    :`<article class="work-card work-card-empty"><h2>Nenhuma perícia em andamento</h2><p class="work-meta">Crie uma perícia para iniciar o fluxo estruturado.</p><button type="button" class="work-open" data-new-case>Nova perícia ${icons.arrow}</button></article>`;
  const alerts=[
    model.deadlines.length?null:'nenhum prazo registrado',
    model.pendingCount?null:'nenhuma pendência registrada'
  ].filter(Boolean);
  const deadlineBlock=deadlines.length
    ?`<section class="work-side"><h3>Próximos prazos</h3><div class="deadline-list">${deadlines.map(d=>renderDeadline(d,now)).join('')}</div></section>`:'';
  const pendingBlock=model.pendingCount
    ?`<section class="work-side"><h3>Pendências</h3><button type="button" class="work-pending" data-surface="cases"><strong>${model.pendingCount} ${model.pendingCount===1?'pendência aguarda ação':'pendências aguardam ação'}</strong><span>Quesitos, exames ou providências.</span>${icons.arrow}</button></section>`:'';
  const quiet=alerts.length===2?`<p class="work-quiet">Sem prazos e sem pendências registradas — o que exigir ação aparece aqui.</p>`
    :alerts.length===1?`<p class="work-quiet">${esc(alerts[0].charAt(0).toUpperCase()+alerts[0].slice(1))}.</p>`:'';
  const outros=(state.cases||[]).filter(item=>item.status==='Em andamento'&&item.id!==c?.id).slice(0,6);
  const listaBlock=outros.length?`<section class="work-side"><h3>Outras perícias em andamento</h3><ul class="work-cases">${outros.map(item=>{const p=caseStageProgress(item);return `<li><button type="button" data-open-case="${esc(item.id)}"><span class="work-case-title">${esc(item.title||'Perícia sem título')}</span><span class="work-case-meta">${esc([item.reference,item.context?.matter].filter(Boolean).join(' · '))}</span><span class="work-case-stage">${esc(p.currentLabel)}<small>${p.started}/${p.total}</small></span></button></li>`;}).join('')}</ul></section>`:'';
  return `${pageHeader(`Boa noite, ${options.displayName||'Dra. Joyce'}`,'Priorize o trabalho sem perder o contexto médico-pericial.')}<div class="work-layout">${work}${deadlineBlock}${pendingBlock}${listaBlock}${quiet}</div>`;
}

function casesSurface(state,filter,options){const model=buildDashboardModel(state.cases||[],options.now||new Date()),visible=filterCasesByLifecycle(state.cases||[],filter);return `${pageHeader('Meus casos','Organize por estado do trabalho, atuação, esfera e unidade.')}<section class="surface-panel"><header class="dashboard-section-head"><div><h2>Perícias</h2><p>${visible.length} nesta visão</p></div><nav class="case-filters">${CASE_FILTERS.map(i=>`<button class="case-filter ${filter===i.id?'is-active':''}" data-case-filter="${i.id}"><span>${esc(i.label)}</span><small>${model.counts[i.id]}</small></button>`).join('')}</nav></header><div class="dashboard-case-grid">${visible.length?visible.map(renderCase).join(''):'<div class="dashboard-empty-state dashboard-empty-wide"><strong>Nenhum caso nesta visão</strong><span>Altere o filtro ou crie uma nova perícia.</span></div>'}</div></section>`;}
function deadlinesSurface(state,filter,options){const now=options.now||new Date(),model=buildDashboardModel(state.cases||[],now);return `${pageHeader('Agenda e prazos','Compromissos periciais ordenados por criticidade.',{search:false})}<section class="surface-panel surface-deadlines"><header class="dashboard-section-head"><div><h2>Próximos compromissos</h2><p>${model.deadlines.length} prazo(s) registrado(s)</p></div></header>${model.deadlines.length?model.deadlines.map(d=>renderDeadline(d,now)).join(''):'<div class="dashboard-empty-state"><strong>Nenhum prazo registrado</strong><span>Adicione prazos aos casos para vê-los aqui.</span></div>'}</section>`;}
function referencesSurface(){return `${pageHeader('Referências técnicas','Consulte a base documental sem misturá-la ao motor decisório.',{search:false,newCase:false})}<section class="reference-library"><header><span class="eyebrow">Biblioteca auditável</span><h2>Conhecimento contextual</h2><p>Natureza, autoridade, versão, âmbito e limitações permanecem explícitos. Uma referência não altera automaticamente o método nem produz conclusão.</p></header><div class="reference-library-grid">${KNOWLEDGE_SOURCES.map(s=>`<article class="reference-source-card"><div class="reference-source-class">${(s.classes||[]).map(c=>esc(REFERENCE_CLASSES[c]||c)).join(' · ')}</div><h3>${esc(s.title)}</h3><p>${esc(s.scope)}</p><dl><div><dt>Autoridade</dt><dd>${esc(s.authority)}</dd></div><div><dt>Versão</dt><dd>${esc(s.version)}</dd></div><div><dt>Limitação</dt><dd>${esc(s.limitation)}</dd></div></dl></article>`).join('')}</div></section>`;}
function severityLegend(){return `<div class="checklist-severity-legend">${Object.values(CONFERENCE_SEVERITY).map(s=>`<span class="checklist-severity checklist-severity-${esc(s.id)}" title="${esc(s.meaning)}"><strong>${esc(s.label)}</strong><small>${esc(s.meaning)}</small></span>`).join('')}</div>`;}

function conferenceRow(d,checked,progress,open,interactive=true){const p=progress.byDimension[d.code]||{done:0,total:d.items.length};const complete=p.done===p.total;return `<details class="conf-row${complete?' is-complete':''}"${open?' open':''}><summary><span class="conf-code">${esc(d.code)}</span><span class="conf-title">${esc(d.title)}</span><span class="conf-count">${p.done}/${p.total}</span></summary><div class="conf-body"><p class="conf-why">${esc(d.why)}</p><ul class="conf-items">${d.items.map((text,i)=>{const id=conferenceItemId(d.code,i);const on=Boolean(checked[id]);return `<li><label class="conf-item${on?' is-checked':''}"><input type="checkbox" data-conference-item="${esc(id)}"${on?' checked':''}${interactive?'':' disabled'}><span>${esc(text)}</span></label></li>`;}).join('')}</ul>${d.redFlag?`<p class="conf-flag"><strong>Sinal de alerta</strong>${esc(d.redFlag)}</p>`:''}</div></details>`;}

function conferencePicker(state,activeId){const cases=(state.cases||[]).filter(c=>c.status!=='Lixeira');if(!cases.length)return '<p class="conf-empty">Nenhuma perícia aberta. A conferência fica disponível assim que existir um caso.</p>';return `<div class="conf-picker"><span>Conferindo</span><div class="conf-picker-options">${cases.map(c=>`<button type="button" class="conf-case${activeId===c.id?' is-active':''}" data-conference-case="${esc(c.id)}">${esc(c.title)}</button>`).join('')}${activeId?`<button type="button" class="conf-case conf-case-clear" data-conference-case="">Ver como modelo</button>`:''}</div></div>`;}

function modelsSurface(state,options={}){
  const p=CONFERENCE_PROTOCOL;
  const activeId=options.conferenceCaseId||'';
  const active=(state.cases||[]).find(c=>c.id===activeId&&c.status!=='Lixeira')||null;
  const checked=active?(active.conference||{}):{};
  const progress=conferenceProgress(checked,p);
  const pct=progress.total?Math.round(progress.done/progress.total*100):0;
  const meter=active
    ? `<div class="conf-meter"><div class="conf-meter-head"><strong>${progress.done} de ${progress.total} conferidos</strong><span>${pct}%</span></div><div class="conf-meter-track" role="progressbar" aria-valuenow="${progress.done}" aria-valuemin="0" aria-valuemax="${progress.total}"><span style="width:${pct}%"></span></div></div>`
    : '<p class="conf-hint">Escolha uma perícia para marcar a conferência. Sem caso selecionado, o protocolo aparece como modelo de leitura.</p>';
  return `${pageHeader('Modelos e checklists','Instrumentos de apoio. Nada aqui altera protocolo, pontuação ou conclusão.',{search:false,newCase:false})}<section class="conf-surface"><header class="conf-head"><div><span class="eyebrow">Instrumento de conferência</span><h2>${esc(p.title)}</h2></div><details class="conf-about"><summary>Critérios e limites</summary><ul>${p.basis.map(b=>`<li>${esc(b)}</li>`).join('')}</ul><p class="conf-scope">${esc(p.scopeLimit)}</p></details></header>${conferencePicker(state,active?active.id:'')}${meter}${severityLegend()}<div class="conf-list">${p.dimensions.map((d,i)=>conferenceRow(d,checked,progress,!active&&i===0,Boolean(active))).join('')}</div></section>`;
}

export function renderDashboardSurface(state,surface='overview',filter='active',options={}){const safe=SURFACES.has(surface)?surface:'overview';const displayName=options.displayName||'Dra. Joyce';const content=safe==='cases'?casesSurface(state,filter,options):safe==='deadlines'?deadlinesSurface(state,filter,options):safe==='references'?referencesSurface():safe==='models'?modelsSurface(state,options):overview(state,filter,{...options,displayName});return shell(content,safe,displayName);}
export function renderDashboardHome(state,filter='active',options={}){const hash=options.hash??(typeof window!=='undefined'?window.location.hash:'');return renderDashboardSurface(state,surfaceFromHash(hash),filter,{...options,conferenceCaseId:options.conferenceCaseId??conferenceCaseFromHash(hash)});}
