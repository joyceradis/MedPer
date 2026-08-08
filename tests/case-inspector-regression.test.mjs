import assert from 'node:assert/strict';
import { renderCaseInspector } from '../js/ui/case-inspector.js';

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const caseData = {
  id: 'case_1',
  title: 'Queimadura e sequela cicatricial',
  reference: '0002862-73.2019.8.08.0024',
  status: 'Em andamento',
  context: {
    setting: 'Judicial',
    legalSphere: 'Cível',
    sphere: 'Judicial',
    branch: 'Cível',
    role: 'Perita do juízo',
    matter: 'Dano estético',
    tribunal: 'TJES',
    unit: '1ª Vara Cível de Vila Velha',
    feeRegime: 'AJG'
  },
  scope: 'Avaliar dano estético e suas extensões após queimadura facial.',
  facts: [{ text: 'Queimadura facial com cicatriz residual.' }],
  evidence: [],
  events: [],
  methodology: { general: {}, activeProtocolIds: [] },
  operations: {
    deadlines: [{ id: 'd1', type: 'Entrega do laudo', dueAt: '2026-08-12T23:59:00-03:00' }],
    pendingActions: [{ id: 'p1', label: 'Responder quesitos' }, { id: 'p2', label: 'Realizar exame presencial' }]
  }
};

const now = new Date('2026-08-08T00:00:00-03:00');

test('renders a recognition-oriented summary without turning into a mini workspace', () => {
  const html = renderCaseInspector(caseData, { tab: 'summary', stageId: 'method', now });

  assert.match(html, /class="case-inspector"/);
  assert.match(html, /Queimadura e sequela cicatricial/);
  assert.match(html, /1ª Vara Cível de Vila Velha/);
  assert.match(html, /Perita do juízo/);
  assert.match(html, /AJG/);
  assert.match(html, /Objeto/);
  assert.match(html, /Próximo prazo/);
  assert.match(html, /2 pendências/);
  assert.match(html, /Abrir perícia/);
  assert.doesNotMatch(html, /<textarea|<input|<select|data-bind=/);
});

test('uses only the three approved inspector tabs', () => {
  const html = renderCaseInspector(caseData, { tab: 'summary', stageId: 'method', now });
  assert.match(html, /data-inspector-tab="summary"[^>]*>Resumo/);
  assert.match(html, /data-inspector-tab="references"[^>]*>Referências/);
  assert.match(html, /data-inspector-tab="activity"[^>]*>Atividade/);
  assert.doesNotMatch(html, /Delimitação<\/button>|Análise<\/button>/);
});

test('renders compact references with provenance hints instead of full bibliographic cards', () => {
  const html = renderCaseInspector(caseData, { tab: 'references', stageId: 'method', now });

  assert.match(html, /AIPE\/Brasil/);
  assert.match(html, /Quadros 1–4|quadros 1–4/i);
  assert.match(html, /data-reference-id=/);
  assert.doesNotMatch(html, /<dl|Finalidade<\/dt>|Limitação<\/dt>/);
});

test('activity tab lists deadlines and pending actions without editable controls', () => {
  const html = renderCaseInspector(caseData, { tab: 'activity', stageId: 'method', now });

  assert.match(html, /Entrega do laudo/);
  assert.match(html, /Responder quesitos/);
  assert.match(html, /Realizar exame presencial/);
  assert.doesNotMatch(html, /<textarea|<input|<select/);
});

console.log('Case inspector regression suite completed successfully.');
