import { getKnowledgeSource, getRelevantKnowledge, REFERENCE_CLASSES } from '../knowledge/library.js';
import { classifyDeadline } from './dashboard-model.js';

const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDeadline(value) {
  const date = toDate(value);
  if (!date) return 'Data não registrada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date).replace('.', '');
}

function nextDeadline(caseData) {
  return [...(caseData.operations?.deadlines || [])]
    .filter(item => toDate(item.dueAt))
    .sort((a, b) => toDate(a.dueAt) - toDate(b.dueAt))[0] || null;
}

function renderSummary(caseData, { stageId, now }) {
  const deadline = nextDeadline(caseData);
  const pending = caseData.operations?.pendingActions || [];
  const severity = deadline ? classifyDeadline(deadline.dueAt, now) : 'neutral';
  const stageLabel = stageId ? stageId.replace(/-/g, ' ') : 'delimitação';

  return `<div class="inspector-summary-grid">
    <div class="inspector-fact"><span>Objeto</span><strong>${esc(caseData.scope || caseData.methodology?.general?.object || 'Não delimitado')}</strong></div>
    <div class="inspector-fact"><span>Etapa atual</span><strong>${esc(stageLabel)}</strong></div>
    <div class="inspector-fact"><span>Próximo prazo</span>${deadline ? `<strong><i class="inspector-status-dot is-${esc(severity)}"></i>${esc(deadline.type || 'Prazo')}</strong><small>${esc(formatDeadline(deadline.dueAt))}</small>` : '<strong>Nenhum prazo registrado</strong>'}</div>
    <div class="inspector-fact"><span>Pendências</span><strong>${pending.length} pendência${pending.length === 1 ? '' : 's'}</strong>${pending[0]?.label ? `<small>${esc(pending[0].label)}${pending.length > 1 ? ` +${pending.length - 1}` : ''}</small>` : ''}</div>
  </div>`;
}

function renderReferences(caseData, { stageId }) {
  const items = getRelevantKnowledge(caseData, { stageId }).slice(0, 5);
  if (!items.length) return '<div class="inspector-empty"><strong>Nenhuma referência contextual nesta etapa</strong><span>A biblioteca permanece disponível para consulta independente.</span></div>';

  return `<div class="inspector-reference-list">${items.map(item => {
    const source = getKnowledgeSource(item.sourceId);
    const classes = (source?.classes || []).map(id => REFERENCE_CLASSES[id] || id);
    const shortClass = classes[0] || source?.nature || 'Referência';
    return `<button type="button" class="inspector-reference" data-reference-id="${esc(item.id)}">
      <span>${esc(shortClass)}</span>
      <strong>${esc(source?.title || item.title)}</strong>
      <small>${esc(item.title)} · ${esc(item.locator)}</small>
    </button>`;
  }).join('')}</div>`;
}

function renderActivity(caseData, { now }) {
  const deadlines = [...(caseData.operations?.deadlines || [])]
    .filter(item => toDate(item.dueAt))
    .sort((a, b) => toDate(a.dueAt) - toDate(b.dueAt));
  const pending = caseData.operations?.pendingActions || [];
  const deadlineRows = deadlines.map(item => `<div class="inspector-activity-row"><i class="inspector-status-dot is-${esc(classifyDeadline(item.dueAt, now))}"></i><div><strong>${esc(item.type || 'Prazo')}</strong><small>${esc(formatDeadline(item.dueAt))}</small></div></div>`).join('');
  const pendingRows = pending.map(item => `<div class="inspector-activity-row"><i class="inspector-status-dot"></i><div><strong>${esc(item.label || 'Pendência')}</strong><small>Ação vinculada ao caso</small></div></div>`).join('');
  return `<div class="inspector-activity-list">${deadlineRows}${pendingRows || ''}${!deadlineRows && !pendingRows ? '<div class="inspector-empty"><strong>Sem atividade operacional registrada</strong></div>' : ''}</div>`;
}

export function renderCaseInspector(caseData, options = {}) {
  const tab = ['summary', 'references', 'activity'].includes(options.tab) ? options.tab : 'summary';
  const stageId = options.stageId || 'delimitation';
  const now = options.now || new Date();
  const context = caseData.context || {};
  const location = context.unit || context.tribunal || 'Unidade a definir';
  const legalSphere = context.legalSphere || context.branch || '';

  const body = tab === 'references'
    ? renderReferences(caseData, { stageId })
    : tab === 'activity'
      ? renderActivity(caseData, { now })
      : renderSummary(caseData, { stageId, now });

  return `<aside class="case-inspector" aria-label="Resumo contextual do caso">
    <header class="case-inspector-head">
      <button type="button" class="inspector-close" data-close-inspector aria-label="Fechar painel">×</button>
      <span class="inspector-eyebrow">${esc(context.role || context.setting || context.sphere || 'Atuação médico-pericial')}</span>
      <h2>${esc(caseData.title)}</h2>
      <p>${esc(caseData.reference || 'Sem referência')}</p>
      <div class="inspector-context"><span>${esc(location)}</span>${legalSphere ? `<span>${esc(legalSphere)}</span>` : ''}${context.feeRegime ? `<span>${esc(context.feeRegime)}</span>` : ''}<span>${esc(caseData.status)}</span></div>
    </header>
    <nav class="inspector-tabs" aria-label="Seções do resumo">
      <button type="button" data-inspector-tab="summary" class="${tab === 'summary' ? 'is-active' : ''}">Resumo</button>
      <button type="button" data-inspector-tab="references" class="${tab === 'references' ? 'is-active' : ''}">Referências</button>
      <button type="button" data-inspector-tab="activity" class="${tab === 'activity' ? 'is-active' : ''}">Atividade</button>
    </nav>
    <div class="case-inspector-body">${body}</div>
    <footer class="case-inspector-footer"><button type="button" data-open-case="${esc(caseData.id)}">Abrir perícia <span aria-hidden="true">→</span></button></footer>
  </aside>`;
}
