import { CASE_FILTERS, filterCasesByLifecycle } from '../core/case-lifecycle.js';
import { buildDashboardModel } from './dashboard-model.js';

const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

const icons = {
  overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5z"/></svg>',
  cases: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M3 11h18"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23z"/></svg>',
  checklist: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9l1.5 1.5L12 8M8 14l1.5 1.5L12 13M14 9h2M14 14h2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>'
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

export function renderDashboardHome(state, filter = 'active', options = {}) {
  const now = options.now || new Date();
  const displayName = options.displayName || 'Dra. Joyce';
  const model = buildDashboardModel(state.cases || [], now);
  const visible = filterCasesByLifecycle(state.cases || [], filter);
  const continueCase = model.continueCase;
  const deadlines = model.deadlines.slice(0, 3);
  const counts = model.counts;

  const continueContent = continueCase ? `<article class="continue-card">
    <div class="continue-card-kicker">${esc(continueCase.context?.role || 'Atuação médico-pericial')}</div>
    <h3>${esc(continueCase.title)}</h3>
    <p>${esc(continueCase.reference || 'Sem referência')}</p>
    <div class="continue-card-meta"><span>${esc(continueCase.context?.unit || continueCase.context?.tribunal || 'Unidade a definir')}</span>${continueCase.context?.legalSphere || continueCase.context?.branch ? `<span>${esc(continueCase.context?.legalSphere || continueCase.context?.branch)}</span>` : ''}${continueCase.context?.feeRegime ? `<span>${esc(continueCase.context.feeRegime)}</span>` : ''}</div>
    <button type="button" class="dashboard-primary-action" data-open-case="${esc(continueCase.id)}">Abrir perícia ${icons.arrow}</button>
  </article>` : '<div class="dashboard-empty-state"><strong>Nenhuma perícia em andamento</strong><span>Crie uma nova perícia para iniciar o fluxo estruturado.</span></div>';

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
        <button type="button" data-scroll-target="dashboard-cases"><span class="shortcut-icon">${icons.cases}</span><span><strong>Meus casos</strong><small>Acompanhe suas perícias</small></span>${icons.arrow}</button>
        <button type="button" data-scroll-target="dashboard-deadlines"><span class="shortcut-icon">${icons.calendar}</span><span><strong>Agenda e prazos</strong><small>Prazos e compromissos</small></span>${icons.arrow}</button>
        <button type="button" data-scroll-target="dashboard-references"><span class="shortcut-icon">${icons.book}</span><span><strong>Referências técnicas</strong><small>Biblioteca e normas</small></span>${icons.arrow}</button>
      </section>

      <section class="dashboard-operational-grid">
        <div class="dashboard-panel"><header><div><h2>Continuar trabalhando</h2><p>Seu último caso ativo</p></div></header>${continueContent}</div>
        <div id="dashboard-deadlines" class="dashboard-panel"><header><div><h2>Próximos prazos</h2><p>Prioridade temporal dos casos ativos</p></div><span>${model.deadlines.length}</span></header>${deadlineContent}</div>
      </section>

      <section class="dashboard-pending" aria-label="Pendências"><span class="pending-signal ${model.pendingCount ? 'has-pending' : ''}"></span><div><strong>${model.pendingCount ? `Você tem ${model.pendingCount} pendência${model.pendingCount === 1 ? '' : 's'}` : 'Sem pendências registradas'}</strong><span>${model.pendingCount ? 'Revise os itens vinculados aos casos ativos.' : 'O que exigir ação aparecerá aqui.'}</span></div></section>

      <section id="dashboard-cases" class="dashboard-cases-section">
        <header class="dashboard-section-head"><div><h2>Meus casos</h2><p>Localize rapidamente pelo estado do trabalho.</p></div><nav class="case-filters" aria-label="Filtrar perícias">${CASE_FILTERS.map(item => `<button class="case-filter ${filter === item.id ? 'is-active' : ''}" data-case-filter="${esc(item.id)}"><span>${esc(item.label)}</span><small>${counts[item.id]}</small></button>`).join('')}</nav></header>
        <div class="dashboard-case-grid">${caseContent}</div>
      </section>

      <section id="dashboard-references" class="dashboard-reference-note"><strong>Referências técnicas</strong><span>A biblioteca contextual permanece separada do motor decisório e será aberta em superfície própria.</span></section>
    </main>
  </div>`;
}
