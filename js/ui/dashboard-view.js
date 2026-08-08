import { CASE_FILTERS, filterCasesByLifecycle } from '../core/case-lifecycle.js';
import { buildDashboardModel } from './dashboard-model.js';

const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

const icons = {
  overview: '<i class="fa-solid fa-house" aria-hidden="true"></i>',
  cases: '<i class="fa-solid fa-briefcase" aria-hidden="true"></i>',
  calendar: '<i class="fa-regular fa-calendar-days" aria-hidden="true"></i>',
  book: '<i class="fa-solid fa-book-open" aria-hidden="true"></i>',
  checklist: '<i class="fa-regular fa-clipboard" aria-hidden="true"></i>',
  settings: '<i class="fa-solid fa-gear" aria-hidden="true"></i>',
  search: '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>',
  arrow: '<i class="fa-solid fa-arrow-right" aria-hidden="true"></i>',
  bell: '<i class="fa-regular fa-bell" aria-hidden="true"></i>',
  gavel: '<i class="fa-solid fa-gavel" aria-hidden="true"></i>',
  document: '<i class="fa-regular fa-file-lines" aria-hidden="true"></i>',
  exam: '<i class="fa-solid fa-stethoscope" aria-hidden="true"></i>',
  report: '<i class="fa-solid fa-file-signature" aria-hidden="true"></i>'
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '--', month: '---', time: '--:--' };
  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
    time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  };
}

function relativeDays(value, now) {
  const due = new Date(value);
  const base = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(due.getTime()) || Number.isNaN(base.getTime())) return '';
  const days = Math.max(0, Math.ceil((due.getTime() - base.getTime()) / 864e5));
  return days === 1 ? '1 dia' : `${days} dias`;
}

function caseActions(caseData) {
  if (caseData.status === 'Lixeira') {
    return '<button type="button" data-case-action="restore" data-case-id="' + esc(caseData.id) + '">Restaurar</button><button type="button" class="is-danger" data-case-action="delete" data-case-id="' + esc(caseData.id) + '">Excluir</button>';
  }
  if (caseData.status === 'Concluída') {
    return '<button type="button" data-case-action="reopen" data-case-id="' + esc(caseData.id) + '">Reabrir</button><button type="button" data-case-action="trash" data-case-id="' + esc(caseData.id) + '">Lixeira</button>';
  }
  return '<button type="button" data-case-action="complete" data-case-id="' + esc(caseData.id) + '">Concluir</button><button type="button" data-case-action="trash" data-case-id="' + esc(caseData.id) + '">Lixeira</button>';
}

function renderCaseList(caseData) {
  const context = caseData.context || {};
  return `<article class="dashboard-case-card">
    <button class="dashboard-case-open" type="button" data-inspect-case="${esc(caseData.id)}">
      <div class="dashboard-case-topline"><span>${esc(context.role || context.setting || context.sphere || 'Perícia')}</span><span>${esc(caseData.status)}</span></div>
      <h3>${esc(caseData.title)}</h3>
      <p>${esc(caseData.reference || 'Sem referência')}</p>
      <div class="dashboard-case-meta"><span>${esc(context.unit || context.tribunal || 'Unidade a definir')}</span>${context.legalSphere || context.branch ? `<span>${esc(context.legalSphere || context.branch)}</span>` : ''}${context.feeRegime ? `<span>${esc(context.feeRegime)}</span>` : ''}</div>
    </button>
    <div class="dashboard-case-actions" aria-label="Ações do caso">${caseActions(caseData)}</div>
  </article>`;
}

function renderDeadline(deadline, now) {
  const date = formatDate(deadline.dueAt);
  return `<article class="deadline-row">
    <span class="deadline-indicator is-${esc(deadline.severity)}" aria-hidden="true"></span>
    <div class="deadline-date"><strong>${date.day}</strong><span>${date.month}</span></div>
    <div class="deadline-copy"><strong>${esc(deadline.type || 'Prazo')}</strong><span>${esc(deadline.caseTitle || '')}</span></div>
    <div class="deadline-remaining"><strong>${esc(relativeDays(deadline.dueAt, now))}</strong><span>${date.time}</span></div>
  </article>`;
}

function renderContinueProgress() {
  return `<div class="continue-progress" aria-label="Progresso do caso: Etapa 5 de 9">
    <div class="continue-progress-head"><span>Exame e método</span><strong>Etapa 5 de 9</strong></div>
    <div class="continue-progress-track" aria-hidden="true">
      <span class="is-complete"></span><span class="is-complete"></span><span class="is-complete"></span><span class="is-complete"></span><span class="is-current"></span><span></span><span></span><span></span><span></span>
    </div>
    <div class="continue-milestones">
      <div class="continue-milestone"><span class="milestone-icon is-document">${icons.document}</span><span><small>Etapa 1</small><strong>Revisão de Documentos</strong></span></div>
      <div class="continue-milestone"><span class="milestone-icon is-exam">${icons.exam}</span><span><small>Etapa 2</small><strong>Exame</strong></span></div>
      <div class="continue-milestone"><span class="milestone-icon is-report">${icons.report}</span><span><small>Etapa 3</small><strong>Laudo</strong></span></div>
    </div>
  </div>`;
}

export function renderDashboardHome(state, filter = 'active', options = {}) {
  const now = options.now || new Date();
  const displayName = options.displayName || 'Dra. Joyce';
  const model = buildDashboardModel(state.cases || [], now);
  const visible = filterCasesByLifecycle(state.cases || [], filter);
  const continueCase = model.continueCase;
  const deadlines = model.deadlines.slice(0, 3);
  const counts = model.counts;

  const continueContent = continueCase ? `<article class="continue-card">
    <div class="continue-case-main">
      <span class="continue-case-icon" aria-hidden="true">${icons.gavel}</span>
      <div class="continue-case-copy">
        <span class="continue-card-kicker">Perita do juízo</span>
        <h3>${esc(continueCase.title || 'Queimadura e sequela cicatricial')}</h3>
        <p class="continue-process">Processo ${esc(continueCase.reference || '0002862-73.2019.8.08.0024')}</p>
        <p class="continue-court">${esc(continueCase.context?.unit || continueCase.context?.tribunal || '1ª Vara Cível de Vila Velha')}${continueCase.context?.feeRegime ? ` <span>•</span> <strong>${esc(continueCase.context.feeRegime)}</strong>` : ''}</p>
      </div>
    </div>
    ${renderContinueProgress()}
    <button type="button" class="dashboard-primary-action" data-open-case="${esc(continueCase.id)}">Abrir perícia ${icons.arrow}</button>
  </article>` : `<div class="dashboard-empty-state"><strong>Nenhuma perícia em andamento</strong><span>Crie uma nova perícia para iniciar o fluxo estruturado.</span></div>`;

  const deadlineContent = deadlines.length
    ? deadlines.map(deadline => renderDeadline(deadline, now)).join('')
    : '<div class="dashboard-empty-state"><strong>Nenhum prazo registrado</strong><span>Os próximos compromissos aparecerão aqui.</span></div>';

  const caseContent = visible.length
    ? visible.map(renderCaseList).join('')
    : '<div class="dashboard-empty-state dashboard-empty-wide"><strong>Nenhum caso nesta visão</strong><span>Altere o filtro ou crie uma nova perícia.</span></div>';

  return `<div class="app-shell-dashboard">
    <aside class="dashboard-sidebar">
      <div class="dashboard-brand">
        <img class="brand-logomark" src="./icon.svg" alt="">
        <div><strong><span class="wordmark-med">Med</span><span class="wordmark-per">Per</span></strong><span>Perícia estruturada</span></div>
      </div>
      <nav class="dashboard-navigation" aria-label="Navegação principal">
        <button class="is-active" type="button" data-scroll-target="dashboard-overview">${icons.overview}<span>Visão geral</span></button>
        <button type="button" data-scroll-target="dashboard-cases">${icons.cases}<span>Meus casos</span></button>
        <button type="button" data-scroll-target="dashboard-deadlines">${icons.calendar}<span>Agenda e prazos</span></button>
        <button type="button" data-scroll-target="dashboard-references">${icons.book}<span>Referências técnicas</span></button>
        <button type="button" data-scroll-target="dashboard-cases">${icons.checklist}<span>Modelos e checklists</span></button>
        <button type="button" data-account>${icons.settings}<span>Configurações</span></button>
      </nav>
      <div class="dashboard-profile"><span class="profile-avatar" aria-hidden="true">JR</span><div><strong>${esc(displayName)}</strong><span>Perita médica</span></div></div>
    </aside>

    <main id="workspace" class="dashboard-workspace">
      <section id="dashboard-overview" class="dashboard-toolbar">
        <div><h1>Boa noite, ${esc(displayName)}</h1><p>Organize casos, prazos e pendências sem perder o contexto pericial.</p></div>
        <div class="dashboard-toolbar-actions"><label class="dashboard-search">${icons.search}<span class="sr-only">Pesquisar</span><input type="search" placeholder="Pesquisar casos, processos, partes..." disabled></label><button class="dashboard-new-case" type="button" data-new-case>+ Nova perícia</button></div>
      </section>

      <section class="dashboard-shortcuts" aria-label="Acessos principais">
        <button type="button" data-scroll-target="dashboard-cases"><span class="shortcut-icon">${icons.cases}</span><span><strong>Meus casos</strong><small>Acompanhe suas perícias</small></span><span class="shortcut-action">${icons.arrow}</span></button>
        <button type="button" data-scroll-target="dashboard-deadlines"><span class="shortcut-icon">${icons.calendar}</span><span><strong>Agenda e prazos</strong><small>Prazos e compromissos</small></span><span class="shortcut-action">${icons.arrow}</span></button>
        <button type="button" data-scroll-target="dashboard-references"><span class="shortcut-icon">${icons.book}</span><span><strong>Referências técnicas</strong><small>Biblioteca e normas</small></span><span class="shortcut-action">${icons.arrow}</span></button>
      </section>

      <section class="dashboard-operational-grid">
        <div class="dashboard-panel dashboard-continue-panel"><header><div><h2>Continuar trabalhando</h2><p>Seu último acesso</p></div></header>${continueContent}</div>
        <div id="dashboard-deadlines" class="dashboard-panel dashboard-deadlines-panel"><header><div><h2>Próximos prazos</h2><p>Prioridade temporal dos casos ativos</p></div><span>${model.deadlines.length}</span></header>${deadlineContent}</div>
      </section>

      <section class="dashboard-pending" aria-label="Pendências">
        <span class="pending-icon" aria-hidden="true">${icons.bell}</span>
        <div class="pending-copy"><strong>${model.pendingCount ? `Você tem ${model.pendingCount} pendência${model.pendingCount === 1 ? '' : 's'}` : 'Sem pendências registradas'}</strong><span>${model.pendingCount ? 'Revise quesitos, exames e itens vinculados aos casos ativos.' : 'O que exigir ação aparecerá aqui.'}</span></div>
        <button type="button" class="dashboard-pending-action">Ver pendências ${icons.arrow}</button>
      </section>

      <section id="dashboard-cases" class="dashboard-cases-section">
        <header class="dashboard-section-head"><div><h2>Meus casos</h2><p>Localize rapidamente pelo estado do trabalho.</p></div><nav class="case-filters" aria-label="Filtrar perícias">${CASE_FILTERS.map(item => `<button class="case-filter ${filter === item.id ? 'is-active' : ''}" data-case-filter="${esc(item.id)}"><span>${esc(item.label)}</span><small>${counts[item.id]}</small></button>`).join('')}</nav></header>
        <div class="dashboard-case-grid">${caseContent}</div>
      </section>

      <section id="dashboard-references" class="dashboard-reference-note"><strong>Referências técnicas</strong><span>A biblioteca contextual permanece separada do motor decisório e será aberta em superfície própria.</span></section>
    </main>
  </div>`;
}
