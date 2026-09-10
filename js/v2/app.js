import { createCaseRecord, normalizeCaseRecord } from './case-record.js';
import { CaseRepository, downloadCaseBackup } from './repository.js';
import { routeMethodology } from './method-router.js';
import { composeCaseDocument } from './document.js';
import { AIPE_CRITERIA, AIPE_CATEGORIES, aipeCategoryOption } from '../methodology/aipe.js';
import { POSAS_PATIENT_ITEMS, POSAS_OBSERVER_ITEMS, buildPosasAssessmentFromGuided } from '../methodology/posas.js';

const repo = new CaseRepository();
const root = document.getElementById('app');
const state = { cases: [], current: null, step: 'summary', search: '', dirty: false, saving: false };
const steps = [
  ['summary', 'Resumo'],
  ['context', 'Objeto e contexto'],
  ['sources', 'Autos e fontes'],
  ['timeline', 'Cronologia'],
  ['history', 'História e antecedentes'],
  ['exam', 'Exame pericial'],
  ['methods', 'Método e instrumentos'],
  ['analysis', 'Análise médico-pericial'],
  ['questions', 'Quesitos'],
  ['conclusion', 'Conclusão'],
  ['document', 'Documento final']
];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const val = value => esc(value ?? '');
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let saveTimer;

function toast(message) {
  let element = document.getElementById('toast');
  if (!element) {
    element = document.createElement('div');
    element.id = 'toast';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    document.body.appendChild(element);
  }
  element.textContent = message;
  element.className = 'toast show';
  setTimeout(() => element.classList.remove('show'), 2200);
}

function setPath(object, path, value) {
  const keys = path.split('.');
  let cursor = object;
  keys.slice(0, -1).forEach(key => {
    cursor[key] ??= {};
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
}

function getPath(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function dueClass(date) {
  return date && new Date(`${date}T23:59:59`) < new Date() ? 'due' : '';
}

function formatDate(date) {
  if (!date) return 'Sem prazo';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.valueOf()) ? date : parsed.toLocaleDateString('pt-BR');
}

function field(label, path, type = 'text', options = {}) {
  const value = getPath(state.current, path) ?? '';
  const attrs = `data-bind="${esc(path)}"`;
  const classes = `field ${options.wide ? 'wide' : ''}`;
  if (type === 'textarea') {
    return `<div class="${classes}"><label>${esc(label)}</label><textarea ${attrs} placeholder="${esc(options.placeholder || '')}">${val(value)}</textarea>${options.hint ? `<span class="hint">${esc(options.hint)}</span>` : ''}</div>`;
  }
  if (type === 'select') {
    return `<div class="${classes}"><label>${esc(label)}</label><select ${attrs}>${options.options.map(([optionValue, optionLabel]) => `<option value="${esc(optionValue)}" ${String(value) === String(optionValue) ? 'selected' : ''}>${esc(optionLabel)}</option>`).join('')}</select></div>`;
  }
  return `<div class="${classes}"><label>${esc(label)}</label><input type="${type}" ${attrs} value="${val(value)}" placeholder="${esc(options.placeholder || '')}">${options.hint ? `<span class="hint">${esc(options.hint)}</span>` : ''}</div>`;
}

async function load() {
  state.cases = await repo.list();
  renderDashboard();
}

function shell(content, options = {}) {
  return `<div class="v2-shell"><header class="topbar"><button class="btn ghost mobile-menu" data-action="menu" aria-label="Abrir navegação">☰</button><div class="brand">MedPer <small>V2 · local-first</small></div><div class="spacer"></div>${options.case ? `<span class="save-state">${state.saving ? 'Salvando…' : state.dirty ? 'Alterações pendentes' : 'Salvo localmente'}</span><button class="btn ghost" data-action="dashboard">Casos</button>` : ''}</header>${content}</div>`;
}

function filteredCases() {
  const query = state.search.trim().toLocaleLowerCase('pt-BR');
  if (!query) return state.cases;
  return state.cases.filter(caseRecord => [
    caseRecord.identity.title,
    caseRecord.identity.processNumber,
    caseRecord.examinedPerson.name,
    caseRecord.context.object
  ].join(' ').toLocaleLowerCase('pt-BR').includes(query));
}

function dashboardCasesMarkup() {
  const cases = filteredCases();
  if (cases.length) return `<div class="case-grid">${cases.map(caseCard).join('')}</div>`;
  return `<div class="empty"><h2>${state.cases.length ? 'Nenhum caso encontrado' : 'Nenhum caso ainda'}</h2><p>${state.cases.length ? 'Tente outra busca.' : 'Crie o primeiro caso para iniciar o fluxo pericial.'}</p>${state.cases.length ? '' : '<button class="btn primary" data-action="new-case">Novo caso</button>'}</div>`;
}

function renderDashboard() {
  state.current = null;
  root.innerHTML = shell(`<main class="dashboard"><div class="dashboard-head"><div><h1>Casos periciais</h1><p>Seu trabalho médico-pericial, organizado por caso.</p></div><div class="dashboard-actions"><button class="btn" data-action="import">Importar backup</button><button class="btn primary" data-action="new-case">Novo caso</button></div></div><input class="search" id="case-search" aria-label="Buscar casos" placeholder="Buscar por caso, processo, parte ou objeto" value="${esc(state.search)}"><div style="height:18px"></div><div id="case-results">${dashboardCasesMarkup()}</div><input id="import-file" type="file" accept="application/json" class="hidden"></main>`);
  bind();
}

function refreshCaseResults() {
  const results = root.querySelector('#case-results');
  if (!results) return;
  results.innerHTML = dashboardCasesMarkup();
  bindCaseCards();
  root.querySelectorAll('#case-results [data-action]').forEach(button => {
    button.onclick = event => handleAction(event, button.dataset.action);
  });
}

function caseCard(caseRecord) {
  return `<article class="case-card" tabindex="0" role="button" data-open-case="${esc(caseRecord.id)}"><h3>${esc(caseRecord.identity.title)}</h3><p>${esc(caseRecord.identity.processNumber || 'Processo não informado')}</p><p>${esc(caseRecord.examinedPerson.name || caseRecord.context.object || 'Parte/objeto ainda não informados')}</p><div class="meta-row"><span class="chip">${esc(caseRecord.identity.status)}</span><span class="chip">${esc(caseRecord.context.legalContext)}</span><span class="chip ${dueClass(caseRecord.deadlines.reportDeadline)}">${esc(formatDate(caseRecord.deadlines.reportDeadline))}</span></div></article>`;
}

function bindCaseCards() {
  root.querySelectorAll('[data-open-case]').forEach(element => {
    const open = async () => {
      state.current = await repo.get(element.dataset.openCase);
      state.step = 'summary';
      renderWorkspace();
    };
    element.onclick = open;
    element.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    };
  });
}

function newCaseModal() {
  document.getElementById('case-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="case-modal"><form class="modal" id="new-case-form"><h2>Novo caso</h2><div class="grid2"><div class="field wide"><label>Título do caso</label><input name="title" required placeholder="Ex.: Souza x Hospital — dano estético"></div><div class="field"><label>Número do processo</label><input name="processNumber"></div><div class="field"><label>Tribunal / vara / origem</label><input name="court"></div><div class="field"><label>Papel profissional</label><select name="professionalRole"><option value="perita_judicial">Perita judicial</option><option value="assistente_tecnica">Assistente técnica</option><option value="parecerista">Parecerista</option><option value="outro">Outra avaliação médico-legal</option></select></div><div class="field"><label>Contexto</label><select name="context"><option value="civel">Cível</option><option value="previdenciario">Previdenciário</option><option value="securitario">Securitário</option><option value="trabalhista">Trabalhista</option><option value="responsabilidade_profissional">Responsabilidade profissional</option><option value="outro">Outro</option></select></div><div class="field"><label>Parte examinada</label><input name="examinedPerson"></div><div class="field"><label>Data da perícia</label><input type="date" name="examinationDate"></div><div class="field"><label>Prazo do laudo/parecer</label><input type="date" name="reportDeadline"></div><div class="field wide"><label>Objeto pericial principal</label><textarea name="object" placeholder="Defina o que efetivamente deve ser respondido pela perícia."></textarea></div></div><div class="modal-actions"><button type="button" class="btn" id="new-case-cancel">Cancelar</button><button class="btn primary">Criar caso</button></div></form></div>`);
  document.getElementById('new-case-cancel').onclick = () => document.getElementById('case-modal')?.remove();
  document.getElementById('case-modal').onclick = event => {
    if (event.target.id === 'case-modal') document.getElementById('case-modal')?.remove();
  };
  const form = document.getElementById('new-case-form');
  form.querySelector('[name="title"]')?.focus();
  form.onsubmit = async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const caseRecord = createCaseRecord(data);
    await repo.save(caseRecord);
    state.cases = await repo.list();
    state.current = caseRecord;
    state.step = 'summary';
    document.getElementById('case-modal')?.remove();
    renderWorkspace();
  };
}

function renderWorkspace() {
  const caseRecord = state.current = normalizeCaseRecord(state.current);
  root.innerHTML = shell(`<div class="workspace"><aside class="sidebar" id="sidebar"><div class="case-mini"><strong>${esc(caseRecord.identity.title)}</strong><span>${esc(caseRecord.identity.processNumber || 'Sem número do processo')}</span></div>${steps.map(([id, label], index) => `<button class="step ${state.step === id ? 'active' : ''}" data-step="${id}"><i>${index + 1}</i>${esc(label)}</button>`).join('')}</aside><main class="content" id="workspace">${renderStep()}</main></div>`, { case: true });
  bind();
}

function heading(title, subtitle, actions = '') {
  return `<div class="section-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
}

function renderStep() {
  const caseRecord = state.current;
  switch (state.step) {
    case 'summary':
      return `${heading('Resumo do caso', 'Visão operacional do processo, objeto e pendências essenciais.', '<button class="btn danger" data-action="delete-case">Excluir caso</button>')}<div class="card"><div class="grid2">${field('Título', 'identity.title')}${field('Status', 'identity.status', 'select', { options: [['rascunho', 'Rascunho'], ['em_analise', 'Em análise'], ['pericia_realizada', 'Perícia realizada'], ['aguardando_documentos', 'Aguardando documentos'], ['concluido', 'Concluído'], ['arquivado', 'Arquivado']] })}${field('Processo', 'identity.processNumber')}${field('Prazo', 'deadlines.reportDeadline', 'date')}${field('Parte examinada', 'examinedPerson.name')}${field('Data da perícia', 'deadlines.examinationDate', 'date')}${field('Objeto pericial', 'context.object', 'textarea', { wide: true })}</div></div><div class="card"><h3>Pendências do caso</h3>${pendingList(caseRecord)}</div>`;
    case 'context':
      return `${heading('Objeto e contexto', 'Delimite a pergunta médico-legal antes de escolher métodos ou redigir conclusões.')}<div class="card"><div class="grid2">${field('Papel profissional', 'identity.professionalRole', 'select', { options: [['perita_judicial', 'Perita judicial'], ['assistente_tecnica', 'Assistente técnica'], ['parecerista', 'Parecerista'], ['outro', 'Outra avaliação médico-legal']] })}${field('Contexto jurídico', 'context.legalContext', 'select', { options: [['civel', 'Cível'], ['previdenciario', 'Previdenciário'], ['securitario', 'Securitário'], ['trabalhista', 'Trabalhista'], ['responsabilidade_profissional', 'Responsabilidade profissional'], ['outro', 'Outro']] })}${field('Tribunal / vara / origem', 'identity.court')}${field('Especialidade clínica relevante', 'context.specialty')}${field('Objeto pericial', 'context.object', 'textarea', { wide: true })}${field('Questão médico-legal central', 'analysis.medicoLegalQuestion', 'textarea', { wide: true, placeholder: 'Qual é a pergunta técnica que precisa ser respondida?' })}</div></div>`;
    case 'sources':
      return `${heading('Autos e fontes', 'Cadastre o material efetivamente considerado e deixe sua origem rastreável.', '<button class="btn primary" data-action="add-source">Adicionar fonte</button>')}<div class="list">${caseRecord.sources.length ? caseRecord.sources.map(sourceItem).join('') : '<div class="empty">Nenhuma fonte cadastrada.</div>'}</div>`;
    case 'timeline':
      return `${heading('Cronologia', 'Transforme documentos dispersos em uma sequência factual verificável.', '<button class="btn primary" data-action="add-event">Adicionar evento</button>')}<div class="list">${caseRecord.timeline.length ? [...caseRecord.timeline].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(eventItem).join('') : '<div class="empty">Nenhum evento cronológico cadastrado.</div>'}</div>`;
    case 'history':
      return `${heading('História e antecedentes', 'Registre apenas elementos pertinentes ao objeto da perícia.')}<div class="card"><div class="grid2">${field('Síntese da história', 'history.summary', 'textarea', { wide: true })}${field('Antecedentes relevantes', 'history.antecedents', 'textarea')}${field('Tratamentos / evolução', 'history.treatments', 'textarea')}${field('Queixas atuais', 'history.complaints', 'textarea')}${field('Limitações referidas', 'history.limitations', 'textarea')}</div></div>`;
    case 'exam':
      return `${heading('Exame pericial', 'Achados objetivos, negativos pertinentes, mensurações e limitações do exame.')}<div class="card"><div class="grid2">${field('Síntese do exame', 'examination.summary', 'textarea', { wide: true })}${field('Achados positivos', 'examination.positives', 'textarea')}${field('Achados negativos pertinentes', 'examination.negatives', 'textarea')}${field('Mensurações', 'examination.measurements', 'textarea')}${field('Limitações do exame', 'examination.limitations', 'textarea')}${field('Documentação fotográfica', 'examination.photographs', 'textarea', { wide: true, placeholder: 'Descreva fotografias produzidas, identificação e condições.' })}</div></div>`;
    case 'methods': return methodsStep();
    case 'analysis': return analysisStep();
    case 'questions':
      return `${heading('Quesitos', 'Responda de forma técnica, objetiva e coerente com a fundamentação.', '<button class="btn primary" data-action="add-question">Adicionar quesito</button>')}<div class="list">${caseRecord.questions.length ? caseRecord.questions.map(questionItem).join('') : '<div class="empty">Nenhum quesito cadastrado.</div>'}</div>`;
    case 'conclusion':
      return `${heading('Conclusão', 'Síntese médico-legal final. O MedPer não decide por você.')}<div class="notice">A conclusão deve refletir sua análise e os limites do objeto pericial; o sistema não atribui certeza ou nexo automaticamente.</div><div class="card"><div class="grid2">${field('Conclusão principal', 'conclusion.summary', 'textarea', { wide: true })}${field('Nexo causal', 'conclusion.nexus', 'textarea')}${field('Incapacidade', 'conclusion.incapacity', 'textarea')}${field('Dano estético', 'conclusion.aestheticDamage', 'textarea')}${field('Dano funcional', 'conclusion.functionalDamage', 'textarea')}${field('Prognóstico', 'conclusion.prognosis', 'textarea')}</div></div>`;
    case 'document': return documentStep();
    default: return '';
  }
}

function pendingList(caseRecord) {
  const pending = [];
  if (!caseRecord.context.object) pending.push('Objeto pericial não delimitado');
  if (!caseRecord.sources.length) pending.push('Nenhuma fonte/autos cadastrados');
  if (!caseRecord.history.summary) pending.push('História ainda não sintetizada');
  if (!caseRecord.examination.summary) pending.push('Exame pericial ainda não registrado');
  if (!caseRecord.analysis.reasoning) pending.push('Fundamentação médico-pericial ainda não registrada');
  if (!caseRecord.conclusion.summary) pending.push('Conclusão ainda não registrada');
  const unlinkedClaims = caseRecord.evidenceClaims.filter(claim => !claim.sourceIds?.length).length;
  if (unlinkedClaims) pending.push(`${unlinkedClaims} vínculo(s) de evidência sem fonte associada`);
  return pending.length ? `<ul>${pending.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p>Nenhuma pendência estrutural essencial identificada.</p>';
}

function sourceLabel(sourceId) {
  const source = state.current.sources.find(item => item.id === sourceId);
  return source ? source.title || source.type : 'Fonte não localizada';
}

function sourceItem(source) {
  return `<div class="list-item"><div class="grow"><strong>${esc(source.title || source.type)}</strong><div><small>${esc([source.type, source.date, source.origin].filter(Boolean).join(' · '))}</small></div>${source.notes ? `<p>${esc(source.notes)}</p>` : ''}</div><div><button class="btn" data-edit-source="${esc(source.id)}">Editar</button> <button class="btn danger" data-remove-source="${esc(source.id)}">Excluir</button></div></div>`;
}

function eventItem(event) {
  const linked = (event.sourceIds || []).map(sourceLabel).filter(Boolean);
  return `<div class="list-item"><div class="grow"><strong>${esc(event.date || 'Sem data')} · ${esc(event.title)}</strong><div><small>${esc([event.certainty, linked.length ? `Fonte: ${linked.join(', ')}` : ''].filter(Boolean).join(' · '))}</small></div>${event.description ? `<p>${esc(event.description)}</p>` : ''}</div><div><button class="btn" data-edit-event="${esc(event.id)}">Editar</button> <button class="btn danger" data-remove-event="${esc(event.id)}">Excluir</button></div></div>`;
}

function questionItem(question, index) {
  return `<div class="card"><div class="grid2"><div class="field"><label>Origem / autor</label><input data-list-bind="questions" data-id="${esc(question.id)}" data-key="origin" value="${val(question.origin || '')}"></div><div class="field"><label>Status</label><select data-list-bind="questions" data-id="${esc(question.id)}" data-key="status"><option value="pendente" ${question.status === 'pendente' || !question.status ? 'selected' : ''}>Pendente</option><option value="respondido" ${question.status === 'respondido' ? 'selected' : ''}>Respondido</option><option value="nao_aplicavel" ${question.status === 'nao_aplicavel' ? 'selected' : ''}>Não aplicável</option></select></div><div class="field wide"><label>Quesito ${index + 1}</label><textarea data-list-bind="questions" data-id="${esc(question.id)}" data-key="question">${val(question.question)}</textarea></div><div class="field wide"><label>Resposta</label><textarea data-list-bind="questions" data-id="${esc(question.id)}" data-key="answer">${val(question.answer)}</textarea></div><div class="field wide"><label>Fundamentação curta (opcional)</label><textarea data-list-bind="questions" data-id="${esc(question.id)}" data-key="rationale">${val(question.rationale || '')}</textarea></div></div><div style="margin-top:8px"><button class="btn danger" data-remove-question="${esc(question.id)}">Excluir</button></div></div>`;
}

function methodsStep() {
  const routes = routeMethodology(state.current);
  return `${heading('Método e instrumentos', 'O MedPer sugere instrumentos conforme o objeto; você decide o que efetivamente se aplica.')}<div class="notice">Sugestão contextual não equivale a conclusão pericial. Métodos devem ser aplicados conforme indicação, limitações e documentação disponível.</div><div class="method-grid">${routes.length ? routes.map(route => `<div class="method-card"><strong>${esc(route.label)}</strong><p>${esc(route.description)}</p></div>`).join('') : '<div class="method-card"><strong>Nenhum instrumento específico sugerido</strong><p>Refine o objeto ou registre metodologia livre abaixo.</p></div>'}</div>${routes.some(route => route.id === 'aipe') ? aipeBlock() : ''}${routes.some(route => route.id === 'posas') ? posasBlock() : ''}<div class="card"><h3>Notas metodológicas</h3>${field('Método, referências e limitações', 'methodology.notes', 'textarea', { wide: true })}</div>`;
}

function aipeBlock() {
  const guided = state.current.methodology.aipe || {};
  return `<div class="card"><h3>AIPE — registro estruturado</h3><p class="hint">Os cinco eixos ajudam a estruturar percepção e impacto. A graduação final permanece decisão da perita.</p>${AIPE_CRITERIA.map(criterion => `<div class="aipe-row"><div><strong>${esc(criterion.label)}</strong><div class="hint">${esc(criterion.question)}</div></div><select data-method="aipe" data-key="${esc(criterion.field)}"><option value="">Não avaliado</option>${criterion.options.map(option => `<option ${guided[criterion.field] === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select></div>`).join('')}<div class="grid2"><div class="field"><label>Categoria AIPE</label><select data-method="aipe" data-key="category"><option value="">Não definida</option>${AIPE_CATEGORIES.map(category => `<option value="${esc(category.id)}" ${guided.category === category.id ? 'selected' : ''}>${esc(aipeCategoryOption(category))}</option>`).join('')}</select></div><div class="field"><label>Pontuação final (decisão pericial)</label><input class="score" type="number" min="0" max="50" data-method="aipe" data-key="score" value="${val(guided.score || '')}"></div></div></div>`;
}

function posasBlock() {
  const guided = state.current.methodology.posas || {};
  const rows = (items, prefix) => items.map(item => `<div class="posas-row"><span>${esc(item.label)}</span><input class="score" type="number" min="1" max="10" data-method="posas" data-key="${prefix}_${esc(item.id)}" value="${val(guided[`${prefix}_${item.id}`] || '')}"></div>`).join('');
  const assessed = buildPosasAssessmentFromGuided(guided);
  return `<div class="card"><h3>POSAS 2.0</h3><div class="grid2">${simpleMethodField('Área avaliada', 'posas', 'posasArea', guided.posasArea)}${simpleMethodField('Critério de seleção', 'posas', 'posasSelectionCriterion', guided.posasSelectionCriterion)}</div><h4>Paciente</h4>${rows(POSAS_PATIENT_ITEMS, 'posasPatient')}<h4>Observador</h4>${rows(POSAS_OBSERVER_ITEMS, 'posasObserver')}<p class="hint">Totais: paciente ${assessed.patient.total ?? 'incompleto'} · observador ${assessed.observer.total ?? 'incompleto'}. As escalas permanecem independentes.</p></div>`;
}

function simpleMethodField(label, method, key, value) {
  return `<div class="field"><label>${esc(label)}</label><input data-method="${esc(method)}" data-key="${esc(key)}" value="${val(value || '')}"></div>`;
}

function evidenceClaimItem(claim) {
  const sourceNames = (claim.sourceIds || []).map(sourceLabel).join(', ');
  return `<div class="evidence-chain"><strong>${esc(sourceNames || 'Sem fonte vinculada')}</strong><br>${esc(claim.statement || 'fato')} → ${esc(claim.finding || 'achado')} → ${esc(claim.interpretation || 'interpretação')} → ${esc(claim.impact || 'impacto')}<br><span class="hint">Certeza: ${esc(claim.confidence || 'não informada')}${claim.limitations ? ` · Limitações: ${esc(claim.limitations)}` : ''}</span><div style="margin-top:8px"><button class="btn danger" data-remove-claim="${esc(claim.id)}">Excluir</button></div></div>`;
}

function analysisStep() {
  const caseRecord = state.current;
  return `${heading('Análise médico-pericial', 'Construa a cadeia explícita entre fontes, achados, interpretações e conclusão.', '<button class="btn" data-action="add-claim">Adicionar vínculo de evidência</button>')}<div class="card"><div class="matrix">${field('Questão médico-legal', 'analysis.medicoLegalQuestion', 'textarea')}${field('Evidências favoráveis', 'analysis.favorable', 'textarea')}${field('Evidências contrárias', 'analysis.contrary', 'textarea')}${field('Estado anterior', 'analysis.priorState', 'textarea')}${field('Alternativas / concausas', 'analysis.alternatives', 'textarea')}${field('Limitações', 'analysis.limitations', 'textarea')}${field('Fundamentação técnico-pericial', 'analysis.reasoning', 'textarea', { wide: true })}</div></div>${caseRecord.evidenceClaims.length ? `<div class="card"><h3>Matriz de evidências</h3>${caseRecord.evidenceClaims.map(evidenceClaimItem).join('<div style="height:8px"></div>')}</div>` : ''}`;
}

function documentStep() {
  const caseRecord = state.current;
  return `${heading('Documento final', 'O documento é composto com o conteúdo que você registrou — sem preencher lacunas por conta própria.', '<button class="btn" data-action="backup">Backup JSON</button><button class="btn primary" data-action="print">Abrir para imprimir / PDF</button>')}<div class="card"><div class="grid2">${field('Título do documento', 'document.title')}${field('Assinatura / identificação profissional', 'document.signature')}${field('Introdução', 'document.introduction', 'textarea', { wide: true })}${field('Discussão complementar', 'document.discussion', 'textarea', { wide: true })}</div></div><div class="doc-preview"><h3>Prévia estrutural</h3><p><strong>${esc(caseRecord.document.title || 'Laudo médico-pericial')}</strong></p><p>${esc(caseRecord.identity.title)}</p><p>${esc(caseRecord.context.object)}</p><hr><p>${esc(caseRecord.conclusion.summary || 'A conclusão ainda não foi preenchida.')}</p></div><p class="footer-note">Use “Abrir para imprimir / PDF” para gerar uma versão A4 em nova janela e salvar pelo diálogo de impressão do navegador.</p>`;
}

function bind() {
  root.querySelectorAll('[data-step]').forEach(button => {
    button.onclick = async () => {
      await saveNow(true);
      state.step = button.dataset.step;
      renderWorkspace();
    };
  });
  bindCaseCards();
  root.querySelectorAll('[data-bind]').forEach(element => {
    element.oninput = () => {
      setPath(state.current, element.dataset.bind, element.value);
      scheduleSave();
    };
  });
  root.querySelectorAll('[data-list-bind]').forEach(element => {
    element.oninput = () => {
      const item = state.current[element.dataset.listBind].find(entry => entry.id === element.dataset.id);
      if (item) {
        item[element.dataset.key] = element.value;
        scheduleSave();
      }
    };
  });
  root.querySelectorAll('[data-method]').forEach(element => {
    element.oninput = () => {
      state.current.methodology[element.dataset.method] ??= {};
      state.current.methodology[element.dataset.method][element.dataset.key] = element.value;
      scheduleSave();
    };
  });
  const search = root.querySelector('#case-search');
  if (search) {
    search.oninput = event => {
      state.search = event.target.value;
      refreshCaseResults();
    };
  }
  root.querySelectorAll('[data-action]').forEach(button => {
    button.onclick = event => handleAction(event, button.dataset.action);
  });
  bindListActions();
}

function bindListActions() {
  root.querySelectorAll('[data-remove-source]').forEach(button => {
    button.onclick = async () => {
      const sourceId = button.dataset.removeSource;
      state.current.sources = state.current.sources.filter(source => source.id !== sourceId);
      state.current.timeline.forEach(event => { event.sourceIds = (event.sourceIds || []).filter(id => id !== sourceId); });
      state.current.evidenceClaims.forEach(claim => { claim.sourceIds = (claim.sourceIds || []).filter(id => id !== sourceId); });
      await saveNow(true);
      renderWorkspace();
    };
  });
  root.querySelectorAll('[data-edit-source]').forEach(button => {
    button.onclick = () => openSourceEditor(state.current.sources.find(source => source.id === button.dataset.editSource));
  });
  root.querySelectorAll('[data-remove-event]').forEach(button => {
    button.onclick = async () => {
      state.current.timeline = state.current.timeline.filter(event => event.id !== button.dataset.removeEvent);
      await saveNow(true);
      renderWorkspace();
    };
  });
  root.querySelectorAll('[data-edit-event]').forEach(button => {
    button.onclick = () => openEventEditor(state.current.timeline.find(event => event.id === button.dataset.editEvent));
  });
  root.querySelectorAll('[data-remove-question]').forEach(button => {
    button.onclick = async () => {
      state.current.questions = state.current.questions.filter(question => question.id !== button.dataset.removeQuestion);
      await saveNow(true);
      renderWorkspace();
    };
  });
  root.querySelectorAll('[data-remove-claim]').forEach(button => {
    button.onclick = async () => {
      state.current.evidenceClaims = state.current.evidenceClaims.filter(claim => claim.id !== button.dataset.removeClaim);
      await saveNow(true);
      renderWorkspace();
    };
  });
}

function openSourceEditor(existing = null) {
  editModal(existing ? 'Editar fonte' : 'Nova fonte', [
    ['type', 'Tipo', 'select', [['documento_autos', 'Documento dos autos'], ['prontuario', 'Prontuário'], ['laudo_previo', 'Laudo prévio'], ['imagem', 'Imagem/fotografia'], ['relato', 'Relato da parte'], ['exame', 'Exame complementar'], ['literatura', 'Literatura/norma']]],
    ['title', 'Título'], ['date', 'Data', 'date'], ['origin', 'Origem'], ['notes', 'Observações', 'textarea']
  ], async data => {
    if (existing) Object.assign(existing, data);
    else state.current.sources.push({ id: uid('src'), ...data });
    await saveNow(true);
    renderWorkspace();
  }, existing || {});
}

function openEventEditor(existing = null) {
  const current = existing || { sourceIds: [] };
  editModal(existing ? 'Editar evento cronológico' : 'Novo evento cronológico', [
    ['date', 'Data', 'date'], ['title', 'Título'], ['description', 'Descrição factual', 'textarea'],
    ['certainty', 'Grau de certeza', 'select', [['documentado', 'Documentado'], ['compativel', 'Compatível'], ['provavel', 'Provável'], ['possivel', 'Possível'], ['nao_sustentado', 'Não sustentado']]],
    ['sourceId', 'Fonte relacionada', 'select', [['', 'Sem fonte específica'], ...state.current.sources.map(source => [source.id, source.title || source.type])]]
  ], async data => {
    const { sourceId, ...rest } = data;
    if (existing) Object.assign(existing, rest, { sourceIds: sourceId ? [sourceId] : [] });
    else state.current.timeline.push({ id: uid('evt'), sourceIds: sourceId ? [sourceId] : [], ...rest });
    await saveNow(true);
    renderWorkspace();
  }, { ...current, sourceId: current.sourceIds?.[0] || '' });
}

async function handleAction(event, action) {
  event?.preventDefault();
  if (action === 'new-case') return newCaseModal();
  if (action === 'dashboard') {
    await saveNow(true);
    state.cases = await repo.list();
    return renderDashboard();
  }
  if (action === 'menu') return document.getElementById('sidebar')?.classList.toggle('open');
  if (action === 'delete-case') {
    if (!state.current) return;
    if (!window.confirm(`Excluir o caso “${state.current.identity.title}”? Esta ação remove a cópia local deste navegador.`)) return;
    await repo.remove(state.current.id);
    state.cases = await repo.list();
    toast('Caso excluído.');
    return renderDashboard();
  }
  if (action === 'import') {
    const input = document.getElementById('import-file');
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      try {
        const text = await input.files[0].text();
        await repo.import(text);
        state.cases = await repo.list();
        renderDashboard();
        toast('Backup importado.');
      } catch (error) {
        toast(error.message || 'Falha ao importar.');
      } finally {
        input.value = '';
      }
    };
    input.click();
    return;
  }
  if (action === 'add-source') return openSourceEditor();
  if (action === 'add-event') return openEventEditor();
  if (action === 'add-question') {
    state.current.questions.push({ id: uid('q'), origin: '', question: '', answer: '', rationale: '', status: 'pendente', evidenceClaimIds: [] });
    await saveNow(true);
    return renderWorkspace();
  }
  if (action === 'add-claim') {
    if (!state.current.sources.length) {
      toast('Cadastre ao menos uma fonte antes de criar um vínculo de evidência.');
      return;
    }
    return editModal('Vínculo de evidência', [
      ['sourceId', 'Fonte principal', 'select', state.current.sources.map(source => [source.id, source.title || source.type])],
      ['statement', 'Fato documentado', 'textarea'], ['finding', 'Achado', 'textarea'],
      ['interpretation', 'Interpretação', 'textarea'], ['impact', 'Impacto na conclusão', 'textarea'],
      ['limitations', 'Limitações', 'textarea'],
      ['confidence', 'Grau de certeza', 'select', [['documentado', 'Documentado'], ['compativel', 'Compatível'], ['provavel', 'Provável'], ['possivel', 'Possível'], ['nao_sustentado', 'Não sustentado']]]
    ], async data => {
      const { sourceId, ...claim } = data;
      state.current.evidenceClaims.push({ id: uid('claim'), sourceIds: sourceId ? [sourceId] : [], conclusionTags: [], ...claim });
      await saveNow(true);
      renderWorkspace();
    });
  }
  if (action === 'backup') {
    if (!state.current) return;
    if (!window.confirm('O backup JSON pode conter dados pessoais e médicos sensíveis. Salvar neste dispositivo?')) return;
    return downloadCaseBackup(state.current);
  }
  if (action === 'print') {
    await saveNow(true);
    const popup = window.open('', '_blank');
    if (!popup) {
      toast('O navegador bloqueou a nova janela.');
      return;
    }
    popup.document.write(composeCaseDocument(state.current));
    popup.document.close();
  }
}

function editModal(title, fields, onSave, initial = {}) {
  document.getElementById('edit-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="edit-modal"><form class="modal" id="edit-form"><h2>${esc(title)}</h2><div class="grid2">${fields.map(([name, label, type = 'text', options]) => {
    const initialValue = initial[name] ?? '';
    if (type === 'textarea') return `<div class="field wide"><label>${esc(label)}</label><textarea name="${esc(name)}">${val(initialValue)}</textarea></div>`;
    if (type === 'select') return `<div class="field"><label>${esc(label)}</label><select name="${esc(name)}">${options.map(([optionValue, optionLabel]) => `<option value="${esc(optionValue)}" ${String(initialValue) === String(optionValue) ? 'selected' : ''}>${esc(optionLabel)}</option>`).join('')}</select></div>`;
    return `<div class="field"><label>${esc(label)}</label><input name="${esc(name)}" type="${esc(type)}" value="${val(initialValue)}"></div>`;
  }).join('')}</div><div class="modal-actions"><button type="button" class="btn" id="edit-cancel">Cancelar</button><button class="btn primary">Salvar</button></div></form></div>`);
  document.getElementById('edit-cancel').onclick = () => document.getElementById('edit-modal')?.remove();
  document.getElementById('edit-modal').onclick = event => {
    if (event.target.id === 'edit-modal') document.getElementById('edit-modal')?.remove();
  };
  const form = document.getElementById('edit-form');
  form.querySelector('input,textarea,select')?.focus();
  form.onsubmit = event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    document.getElementById('edit-modal')?.remove();
    onSave(data);
  };
}

function scheduleSave() {
  state.dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(true), 350);
  updateSaveLabel();
}

function updateSaveLabel() {
  const element = root.querySelector('.save-state');
  if (element) element.textContent = state.saving ? 'Salvando…' : state.dirty ? 'Alterações pendentes' : 'Salvo localmente';
}

async function saveNow() {
  if (!state.current) return;
  clearTimeout(saveTimer);
  state.saving = true;
  updateSaveLabel();
  state.current = await repo.save(state.current);
  state.dirty = false;
  state.saving = false;
  updateSaveLabel();
}

window.addEventListener('beforeunload', () => {
  if (state.current && state.dirty) repo.save(state.current);
});

load().catch(error => {
  console.error('MedPer V2 startup failure', error);
  root.innerHTML = `<div class="dashboard"><div class="empty"><h2>Não foi possível iniciar o MedPer</h2><p>${esc(error.message)}</p></div></div>`;
});
