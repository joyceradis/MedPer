// Presentation-only layer for the V2 workspace: progress, insights, command
// palette, shortcuts and writing aids. It never reads or writes case
// storage and never mutates case data; actions are delegated to the buttons
// app.js already renders, so save/navigation rules stay in one place.

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const filled = value => typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
const DAY = 86400000;
let lastView = '';

// Structural completeness per step. It reflects what was registered, not the
// quality or correctness of any medico-legal judgement.
const STEP_FIELDS = {
  summary: c => [c.identity.title, c.identity.processNumber, c.examinedPerson?.name, c.deadlines.reportDeadline, c.context.object],
  context: c => [c.identity.professionalRole, c.context.legalContext, c.identity.court, c.context.specialty, c.context.object, c.analysis.medicoLegalQuestion],
  sources: c => [c.sources.length > 0],
  timeline: c => [c.timeline.length > 0],
  history: c => [c.history.summary, c.history.antecedents, c.history.treatments, c.history.complaints, c.history.limitations],
  exam: c => [c.examination.summary, c.examination.positives, c.examination.negatives, c.examination.measurements, c.examination.limitations],
  methods: c => [c.methodology.notes || Object.values(c.methodology.aipe || {}).some(filled) || Object.values(c.methodology.posas || {}).some(filled)],
  analysis: c => [c.analysis.medicoLegalQuestion, c.analysis.favorable, c.analysis.contrary, c.analysis.priorState, c.analysis.alternatives, c.analysis.limitations, c.analysis.reasoning],
  questions: c => c.questions.length ? c.questions.map(question => question.status === 'nao_aplicavel' || filled(question.answer)) : [false],
  conclusion: c => [c.conclusion.summary, c.conclusion.nexus, c.conclusion.incapacity, c.conclusion.prognosis],
  // The document title ships pre-filled, so it does not count as progress.
  document: c => [c.document.introduction, c.document.discussion, c.document.signature]
};

export function stepProgress(caseRecord) {
  const result = {};
  for (const [step, pick] of Object.entries(STEP_FIELDS)) {
    let values = [];
    try { values = pick(caseRecord); } catch { values = []; }
    const done = values.filter(filled).length;
    const ratio = values.length ? done / values.length : 0;
    result[step] = { ratio, status: ratio >= 1 ? 'done' : ratio > 0 ? 'partial' : 'empty' };
  }
  const ratios = Object.values(result).map(item => item.ratio);
  result.overall = Math.round(ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 100);
  return result;
}

export function caseInsights(cases, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const insights = { total: cases.length, overdue: 0, dueSoon: 0, concluded: 0 };
  for (const caseRecord of cases) {
    if (['concluido', 'arquivado'].includes(caseRecord.identity?.status)) { insights.concluded++; continue; }
    const deadline = caseRecord.deadlines?.reportDeadline;
    if (!deadline) continue;
    const days = Math.round((new Date(`${deadline}T12:00:00`).setHours(0, 0, 0, 0) - today) / DAY);
    if (days < 0) insights.overdue++;
    else if (days <= 7) insights.dueSoon++;
  }
  return insights;
}

export function enhanceDashboard(root, cases) {
  lastView = '';
  const heading = root.querySelector('.dashboard-register-head h2');
  if (heading && !root.querySelector('.insight-strip')) {
    const data = caseInsights(cases);
    const tiles = [
      [data.total === 1 ? 'caso' : 'casos', data.total, ''],
      [data.overdue === 1 ? 'prazo vencido' : 'prazos vencidos', data.overdue, data.overdue ? 'is-danger' : ''],
      ['vencem em até 7 dias', data.dueSoon, data.dueSoon ? 'is-warning' : ''],
      [data.concluded === 1 ? 'concluído ou arquivado' : 'concluídos ou arquivados', data.concluded, '']
    ];
    heading.insertAdjacentHTML('afterend', `<section class="insight-strip" aria-label="Indicadores dos casos">${tiles.map(([label, value, tone]) =>
      `<div class="insight ${tone}${value ? '' : ' is-zero'}"><span class="insight-label">${esc(label)}</span><span class="insight-value">${value}</span></div>`).join('')}</section>`);
  }
  enhanceCommandLauncher(root);
}

function enhanceCommandLauncher(root) {
  const topbar = root.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.command-launcher')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn ghost command-launcher';
  button.innerHTML = '<span aria-hidden="true">⌘</span><span class="command-label">Comandos</span>';
  button.setAttribute('aria-label', 'Abrir paleta de comandos');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
  button.onclick = openPalette;
  topbar.appendChild(button);
}

function ring(percent) {
  const radius = 17;
  const length = 2 * Math.PI * radius;
  return `<svg class="progress-ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="progress-ring-track" cx="20" cy="20" r="${radius}"></circle><circle class="progress-ring-value" cx="20" cy="20" r="${radius}" stroke-dasharray="${length.toFixed(2)}" stroke-dashoffset="${(length * (1 - percent / 100)).toFixed(2)}"></circle></svg>`;
}

export function refreshWorkspaceProgress(root, caseRecord) {
  if (!caseRecord) return;
  const progress = stepProgress(caseRecord);
  root.querySelectorAll('.step[data-step]').forEach(button => {
    const item = progress[button.dataset.step];
    if (!item) return;
    button.dataset.progress = item.status;
    button.title = item.status === 'done' ? 'Etapa estruturalmente preenchida' : item.status === 'partial' ? `Etapa ${Math.round(item.ratio * 100)}% preenchida` : 'Etapa ainda não iniciada';
  });
  const mini = root.querySelector('.case-mini');
  if (!mini) return;
  let meter = mini.querySelector('.case-progress');
  if (!meter) {
    mini.insertAdjacentHTML('beforeend', '<div class="case-progress" role="img"></div>');
    meter = mini.querySelector('.case-progress');
  }
  meter.setAttribute('aria-label', `Preenchimento estrutural do caso: ${progress.overall}%`);
  meter.innerHTML = `${ring(progress.overall)}<div><span class="case-progress-value">${progress.overall}%</span><span class="case-progress-label">preenchimento estrutural</span></div>`;
}

function autosize(textarea) {
  textarea.style.height = 'auto';
  const height = textarea.scrollHeight + 2;
  textarea.style.height = `${Math.min(height, 640)}px`;
  textarea.style.overflowY = height > 640 ? 'auto' : 'hidden';
}

function wordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return `${words} ${words === 1 ? 'palavra' : 'palavras'}`;
}

export function enhanceWorkspace(root, caseRecord) {
  // A new case or step starts at the top; re-renders after edits keep position.
  const view = `${caseRecord?.id}:${root.querySelector('.step.active')?.dataset.step}`;
  if (view !== lastView) {
    lastView = view;
    window.scrollTo(0, 0);
  }
  enhanceCommandLauncher(root);
  refreshWorkspaceProgress(root, caseRecord);
  root.querySelectorAll('.content textarea').forEach(textarea => {
    autosize(textarea);
    const field = textarea.closest('.field');
    if (field && !field.querySelector('.word-count')) {
      field.insertAdjacentHTML('beforeend', `<span class="word-count" aria-hidden="true">${wordCount(textarea.value)}</span>`);
    }
  });
  // Keep the active step visible inside the rail without scrolling the page.
  const sidebar = root.querySelector('.sidebar');
  const active = sidebar?.querySelector('.step.active');
  if (active && (active.offsetTop < sidebar.scrollTop || active.offsetTop + active.offsetHeight > sidebar.scrollTop + sidebar.clientHeight)) {
    sidebar.scrollTop = active.offsetTop - sidebar.clientHeight / 2;
  }
}

// ---------- Command palette ----------

function paletteEntries() {
  const entries = [];
  const seen = new Set();
  // Keep the draft's owner and callbacks stable while a case/source editor is open.
  // Theme switching is safe; navigating the underlying app is not.
  const buttons = document.querySelector('.modal-backdrop') ? []
    : document.querySelectorAll('#app [data-step], #app [data-action]');
  buttons.forEach(element => {
    const isStep = Boolean(element.dataset.step);
    const key = isStep ? `step:${element.dataset.step}` : `action:${element.dataset.action}`;
    const label = element.textContent.replace(/^\s*\d+\s*/, '').trim() || element.getAttribute('aria-label') || '';
    // Destructive or structural actions stay on their own buttons.
    if (!label || seen.has(key) || ['menu', 'delete-case'].includes(element.dataset.action)) return;
    seen.add(key);
    entries.push({ key, label, group: isStep ? 'Etapas do caso' : 'Ações', element });
  });
  entries.push({ key: 'theme', label: 'Alternar tema claro/escuro', group: 'Interface', run: toggleTheme });
  return entries;
}

// Session-only by design: browser storage in V2 belongs to repository.js, so
// the forced theme lasts until reload and the system preference applies again.
function toggleTheme() {
  const html = document.documentElement;
  const dark = html.dataset.theme ? html.dataset.theme === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  html.dataset.theme = dark ? 'light' : 'dark';
}

function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function openPalette() {
  if (document.getElementById('command-palette')) return;
  const previous = document.activeElement;
  const entries = paletteEntries();
  document.body.insertAdjacentHTML('beforeend', `<div class="palette-backdrop" id="command-palette"><div class="palette" role="dialog" aria-modal="true" aria-label="Paleta de comandos"><div class="palette-search"><span aria-hidden="true">⌘</span><input id="palette-input" type="text" role="combobox" aria-label="Buscar comandos" aria-autocomplete="list" aria-expanded="true" autocomplete="off" spellcheck="false" placeholder="Ir para etapa ou executar ação…" aria-controls="palette-list" aria-activedescendant=""></div><ul class="palette-list" id="palette-list" role="listbox"></ul><footer class="palette-hint"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></footer></div></div>`);
  const backdrop = document.getElementById('command-palette');
  const input = document.getElementById('palette-input');
  const list = document.getElementById('palette-list');
  let visible = entries;
  let active = 0;

  const close = () => { backdrop.remove(); previous?.focus?.(); };
  const run = entry => {
    close();
    if (entry.run) entry.run();
    else entry.element.click();
  };
  const render = () => {
    const query = normalize(input.value.trim());
    visible = entries.filter(entry => !query || normalize(`${entry.label} ${entry.group}`).includes(query));
    active = Math.min(active, Math.max(visible.length - 1, 0));
    let group = '';
    list.innerHTML = visible.length ? visible.map((entry, index) => {
      const heading = entry.group !== group ? `<li class="palette-group" role="presentation">${esc(entry.group)}</li>` : '';
      group = entry.group;
      return `${heading}<li class="palette-item${index === active ? ' is-active' : ''}" id="palette-${index}" role="option" aria-selected="${index === active}" data-index="${index}">${esc(entry.label)}</li>`;
    }).join('') : '<li class="palette-empty">Nenhum comando encontrado.</li>';
    input.setAttribute('aria-activedescendant', visible.length ? `palette-${active}` : '');
    const current = list.querySelector('.is-active');
    if (current && (current.offsetTop < list.scrollTop || current.offsetTop + current.offsetHeight > list.scrollTop + list.clientHeight)) {
      list.scrollTop = current.offsetTop - list.clientHeight / 2;
    }
  };

  input.oninput = () => { active = 0; render(); };
  input.onkeydown = event => {
    // Palette keys must not reach the global shortcuts (e.g. Escape closing a modal underneath).
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)) event.stopPropagation();
    if (event.key === 'ArrowDown') { event.preventDefault(); active = (active + 1) % Math.max(visible.length, 1); render(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); active = (active - 1 + visible.length) % Math.max(visible.length, 1); render(); }
    else if (event.key === 'Enter' && visible[active]) { event.preventDefault(); run(visible[active]); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    // The input is the only focusable element; keep focus inside the dialog.
    else if (event.key === 'Tab') event.preventDefault();
  };
  list.onclick = event => {
    const item = event.target.closest('.palette-item');
    if (item) run(visible[Number(item.dataset.index)]);
  };
  backdrop.onclick = event => { if (event.target === backdrop) close(); };
  list.onmousedown = event => event.preventDefault();
  render();
  input.focus();
}

// ---------- Global interactions ----------

function isTyping(target) {
  return target?.isContentEditable || target?.closest?.('input, textarea, select, [role="textbox"]');
}

function moveStep(direction) {
  const steps = [...document.querySelectorAll('#app .step[data-step]')];
  const current = steps.findIndex(step => step.classList.contains('active'));
  const next = steps[current + direction];
  if (current >= 0 && next) next.click();
}

let installed = false;

export function installExperience({ root, getCase }) {
  if (installed) return;
  installed = true;

  let progressTimer;
  root.addEventListener('input', event => {
    if (event.target.matches('textarea')) {
      autosize(event.target);
      const counter = event.target.closest('.field')?.querySelector('.word-count');
      if (counter) counter.textContent = wordCount(event.target.value);
    }
    clearTimeout(progressTimer);
    progressTimer = setTimeout(() => refreshWorkspaceProgress(root, getCase()), 250);
  });

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openPalette();
      return;
    }
    if (event.key === 'Escape' && !document.getElementById('command-palette')) {
      const modal = [...document.querySelectorAll('.modal-backdrop')].at(-1);
      if (modal) { event.preventDefault(); modal.querySelector('.modal-actions button[type="button"]')?.click(); return; }
      document.getElementById('sidebar')?.classList.remove('open');
    }
    if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && !isTyping(event.target) && !document.querySelector('.modal-backdrop')) {
      event.preventDefault();
      moveStep(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === '/' && !mod && !isTyping(event.target)) {
      const search = document.getElementById('case-search');
      if (search) { event.preventDefault(); search.focus(); }
    }
  });
}
