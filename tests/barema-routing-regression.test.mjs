import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VALUATION_REGIME_OPTIONS,
  FUNCTIONAL_BAREMA_TRACKS,
  combineAxisResults,
  normalizeRegimeId,
  remainingCapacity,
  resolveFunctionalBaremaTrack
} from '../js/methodology/barema-routing.js';
import { auditCase, completion } from '../js/methodology/engine.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

// ---------------------------------------------------------------------------
// Os cinco casos de teste da issue #56, literalmente.
// ---------------------------------------------------------------------------

test('acidente de trânsito + responsabilidade civil → não seleciona DPVAT automaticamente; ABMLPM é o barema funcional principal', () => {
  const result = resolveFunctionalBaremaTrack({ regimeId: 'civil_liability' });
  assert.equal(result.principal.id, 'abmlpm_functional');
  assert.equal(result.principal.role, 'principal');
  assert.deepEqual(result.subsidiary, []);
  assert.equal(result.requiresManualChoice, false);
});

test('acidente de trânsito + finalidade securitária DPVAT → tabela DPVAT correspondente', () => {
  const result = resolveFunctionalBaremaTrack({ regimeId: 'insurance_dpvat' });
  assert.equal(result.principal.id, 'dpvat');
  assert.equal(result.principal.role, 'principal');
});

test('responsabilidade civil + amputação + dano estético → ABMLPM (função) e AIPE (estética) coexistem sem soma entre resultados', () => {
  const functional = { axis: 'functional', trackId: 'abmlpm_functional', value: null };
  const aesthetic = { axis: 'aesthetic', trackId: 'aipe', value: 34 };
  const combined = combineAxisResults([functional, aesthetic]);
  assert.equal(combined.length, 2, 'os dois eixos permanecem entradas distintas, nunca um total único');
  assert.equal(combined[0].value, null);
  assert.equal(combined[1].value, 34);
  assert.ok(Object.isFrozen(combined), 'o agrupamento é congelado — nada o transforma depois em soma');
});

// Este teste verifica a ARITMÉTICA da capacidade restante e nada além dela.
//
// Qual método de cumulação se aplica a um caso — capacidade restante, soma
// direta para sequelas sinérgicas, ou outro — é regra do barema aplicável e não
// é decidida pelo MedPer. A #56 autoriza Balthazard somente quando o barema
// permitir, e a #55 registra que a regra de cumulação da ABMLPM não foi
// confirmada por leitura direta. Uma versão anterior deste teste se chamava
// "nunca soma direta" e chamava a soma de "impossível": transformava hipótese
// não confirmada em contrato de regressão, que é justamente o que a camada de
// conhecimento deste repositório existe para impedir.
test('remainingCapacity compõe sobre o percentual restante, não sobre 100% de novo', () => {
  // Exemplo publicado: 70% + 30% + 20% pela composição de capacidade restante.
  assert.equal(remainingCapacity([70, 30, 20]), 83.2);
  // Segunda sequela incide sobre o que restou da primeira, não sobre o todo.
  assert.equal(remainingCapacity([50, 50]), 75);
  assert.equal(remainingCapacity([]), 0);
});

test('licenciamento vencido isolado → não reduz escore funcional/AIPE nem gera culpa concorrente automaticamente', () => {
  // A garantia é estrutural: a assinatura de resolveFunctionalBaremaTrack não
  // tem parâmetro para nenhum dado administrativo/circunstancial. Uma
  // propriedade extra desse tipo, se alguém tentar passar, é simplesmente
  // ignorada — não existe caminho de código que a leia.
  const semAntecedente = resolveFunctionalBaremaTrack({ regimeId: 'civil_liability' });
  const comAntecedenteAdministrativo = resolveFunctionalBaremaTrack({
    regimeId: 'civil_liability',
    licenciamentoVencido: true,
    culpaConcorrente: 0.5
  });
  assert.deepEqual(semAntecedente, comAntecedenteAdministrativo);

  const source = readFileSync(new URL('../js/methodology/barema-routing.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /licenciamento|culpa\s*concorrente|quantum\s*indenizat[oó]rio/i,
    'o roteador de barema não deve conhecer termos de consequência jurídica ou circunstância administrativa');
});

// ---------------------------------------------------------------------------
// Invariantes estruturais adicionais.
// ---------------------------------------------------------------------------

test('a assinatura de resolveFunctionalBaremaTrack não tem parâmetro de etiologia/tipo de trauma', () => {
  const source = readFileSync(new URL('../js/methodology/barema-routing.js', import.meta.url), 'utf8');
  const signature = source.match(/export function resolveFunctionalBaremaTrack\(([^)]*)\)/)?.[1] || '';
  assert.doesNotMatch(signature, /etiologia|trauma|causa/i,
    'a etiologia do trauma não pode nem aparecer como parâmetro — ver issue #56');
});

test('finalidade não declarada exige escolha manual e nomeia o motivo', () => {
  const result = resolveFunctionalBaremaTrack({ regimeId: '' });
  assert.equal(result.principal, null);
  assert.equal(result.requiresManualChoice, true);
  assert.match(result.rationale, /não deve ser inferida da causa do trauma/);
});

test('finalidades previdenciária e trabalhista são reconhecidas mas exigem escolha manual até haver trilho próprio', () => {
  for (const regimeId of ['social_security', 'labor']) {
    const result = resolveFunctionalBaremaTrack({ regimeId });
    assert.equal(result.requiresManualChoice, true, regimeId);
    assert.equal(result.principal, null, regimeId);
  }
});

test('quesito pedindo DPVAT explicitamente aparece como subsidiário, nunca substitui o principal', () => {
  const semQuesito = resolveFunctionalBaremaTrack({ regimeId: 'civil_liability' });
  const comQuesito = resolveFunctionalBaremaTrack({ regimeId: 'civil_liability', dpvatQuesitoExplicit: true });
  assert.equal(comQuesito.principal.id, semQuesito.principal.id, 'o principal não muda');
  assert.equal(comQuesito.subsidiary.length, 1);
  assert.equal(comQuesito.subsidiary[0].id, 'dpvat');
  assert.equal(comQuesito.subsidiary[0].role, 'subsidiary');
});

test('remainingCapacity é comutativa — a ordem das sequelas não altera o resultado', () => {
  assert.equal(remainingCapacity([70, 30, 20]), remainingCapacity([20, 30, 70]));
  assert.equal(remainingCapacity([70, 30, 20]), remainingCapacity([30, 70, 20]));
});

test('remainingCapacity com uma sequela única não usa capacidade restante nenhuma — é o próprio percentual', () => {
  assert.equal(remainingCapacity([42]), 42);
});

test('nenhum trilho de barema declara dado de pontuação que o MedPer não tem', () => {
  for (const track of Object.values(FUNCTIONAL_BAREMA_TRACKS)) {
    assert.equal(track.hasScoringData, false, track.id);
    assert.ok(track.note?.length, `${track.id} deve declarar por que não tem dado de pontuação`);
  }
});

test('normalizeRegimeId aceita id, tolera rótulo legado e falha fechado', () => {
  for (const option of VALUATION_REGIME_OPTIONS) {
    assert.equal(normalizeRegimeId(option.id), option.id, 'o id é a forma canônica persistida');
    assert.equal(normalizeRegimeId(option.label), option.id, 'casos gravados antes da correção guardaram o rótulo');
  }
  assert.equal(normalizeRegimeId('A definir'), '', 'a sentinela removida não declara finalidade');
  assert.equal(normalizeRegimeId(''), '');
  assert.equal(normalizeRegimeId(undefined), '');
});





test('rótulos legados continuam resolvendo — nenhum caso gravado é órfão', () => {
  for (const option of VALUATION_REGIME_OPTIONS) {
    assert.equal(normalizeRegimeId(option.label), option.id);
  }
  assert.equal(normalizeRegimeId('Rótulo inexistente'), '');
  assert.equal(normalizeRegimeId(undefined), '');
});

// ---------------------------------------------------------------------------
// Integração com o motor de auditoria — advisória, nunca bloqueio, silenciosa
// quando não há nada a apontar.
// ---------------------------------------------------------------------------

function capacityCase(overrides = {}) {
  return {
    context: { matter: 'Incapacidade', matterId: 'capacity' },
    scope: 'Avaliar incapacidade laboral',
    methodology: {
      general: { object: 'x', methodChoice: 'x', ...overrides.general },
      specific: { residualCapacity: 'x', ...overrides.specific },
      guided: { functionalDeficitStatus: 'Sim', activityKnown: 'Sim, detalhadamente', ...overrides.guided },
      decision: {},
      activeProtocolIds: ['capacity'],
      dismissedProtocolIds: [],
      activeInstrumentIds: [],
      dismissedInstrumentIds: []
    },
    questions: overrides.questions || []
  };
}


test('auditCase fica em silêncio quando o regime declarado resolve sem ambiguidade', () => {
  const declared = capacityCase({ general: { valuationRegime: 'civil_liability' } });
  const { issues } = auditCase(declared);
  assert.ok(!issues.some(i => /regime de valora/i.test(i.text)),
    'resolvido sem ambiguidade não deve virar ruído permanente na auditoria');
});

test('auditCase aponta ambiguidade quando o regime declarado ainda não tem trilho próprio', () => {
  const declared = capacityCase({ general: { valuationRegime: 'labor' } });
  const { issues } = auditCase(declared);
  const found = issues.find(i => /trilho de barema funcional/.test(i.text));
  assert.equal(found?.severity, 'warning');
  assert.equal(found?.field, 'valuationRegime', 'a pendência declara o campo que a originou');
});

// Decisão da assistente técnica/UX: a pergunta fica disponível em toda perícia e
// nunca trava a etapa. A alternativa era uma lista de matérias que "exigem barema
// funcional" — classificação médico-pericial que, mantida à mão, já nasceu
// incompleta (`Invalidez securitária` ficou de fora e o trilho DPVAT, que esta
// própria PR introduz, ficava inalcançável).
test('o regime de valoração é opcional: nunca cobra declaração nem trava a etapa', async () => {
  const { completion } = await import('../js/methodology/engine.js');
  const { generalMethod } = await import('../js/methodology/protocols.js');

  const campo = generalMethod.find(step => step.id === 'delimitation')
    .fields.find(f => f.id === 'valuationRegime');
  assert.equal(campo.optional, true);
  assert.equal(campo.appliesTo, undefined, 'não deve voltar a existir lista de casos em que a pergunta cabe');

  const semRegime = {
    context: { sphere: 'Judicial', branch: 'Criminal', role: 'Perita do juízo', matter: 'Dano estético', mode: 'Presencial' },
    methodology: { general: { object: 'o', controversies: 'c', methodChoice: 'm', scopeLimits: 'l' }, specific: {}, guided: {}, decision: {} },
    questions: [], evidence: [], facts: [], events: []
  };
  assert.equal(completion(semRegime).general[0], true, 'a etapa fecha sem o regime');
  assert.ok(!auditCase(semRegime).issues.some(i => /regime de valora/i.test(i.text)),
    'ausência de regime não gera ressalva');
});

// O campo se chamava "finalidade" e colidia com `context.purposeId`, que já
// existia: um caso previdenciário com finalidade canônica atribuída recebia
// ressalva de "finalidade não declarada" e a mesma tela podia exibir duas.
test('o regime não colide com a finalidade médico-pericial canônica', async () => {
  const { generalMethod } = await import('../js/methodology/protocols.js');
  const campo = generalMethod.find(step => step.id === 'delimitation')
    .fields.find(f => f.id === 'valuationRegime');
  assert.doesNotMatch(campo.label, /finalidade/i, 'o rótulo não pode reabrir a colisão de nomes');

  const previdenciario = {
    context: { sphere: 'Previdenciária', branch: 'INSS / RGPS', role: 'Perita administrativa', matter: 'Incapacidade', matterId: 'capacity', legalSphereId: 'social_security', purposeId: 'social_security_assessment', mode: 'Presencial' },
    methodology: { general: { object: 'o', controversies: 'c', methodChoice: 'm', scopeLimits: 'l' }, specific: {}, guided: {}, decision: {} },
    questions: [], evidence: [], facts: [], events: []
  };
  assert.ok(!auditCase(previdenciario).issues.some(i => /finalidade.*não declarada/i.test(i.text)),
    'o caso tem finalidade canônica: a tela não pode afirmar o contrário');
  assert.equal(completion(previdenciario).general[0], true);
});

console.log('Barema routing regression suite completed successfully.');

