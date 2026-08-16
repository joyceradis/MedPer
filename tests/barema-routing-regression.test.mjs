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

// A composição principal + subsidiário é exigida pela #56 e continua correta no
// módulo. O que falta é a interface saber que existe tal quesito — declaração
// estruturada, não adivinhação por texto livre.
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
  assert.equal(normalizeRegimeId('Securitário — DPVAT ou tabela normativa equivalente'), 'insurance_dpvat',
    'o rótulo anterior, que prometia tabela equivalente, continua resolvendo');
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


// O roteamento é referência de consulta, não pendência. Uma limitação do MedPer
// — não haver trilho registrado para um regime — não é pendência da perícia, e
// como pendência era irresolvível: a ressalva mandava "selecione manualmente e
// registre a justificativa" sem que existisse campo algum para isso.
test('o roteamento de barema não produz pendência de auditoria', () => {
  for (const regime of ['civil_liability', 'insurance_dpvat', 'social_security', 'labor', '']) {
    const c = capacityCase({ general: { valuationRegime: regime } });
    assert.ok(!auditCase(c).issues.some(i => /barema|regime de valora/i.test(i.text)),
      `regime "${regime}" não pode gerar pendência`);
  }
  const engine = readFileSync(new URL('../js/methodology/engine.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /barema-routing/, 'o motor de auditoria não deve conhecer o roteador');
});

// O resolvedor calculava o trilho e o resultado era descartado: engine.js lia
// apenas `requiresManualChoice`, de modo que a perita recebia aviso e nunca a
// resposta. Um quesito pedindo DPVAT criava um trilho subsidiário que nunca
// chegava à tela.
test('a tela mostra o trilho resolvido, principal e subsidiário', async () => {
  const { renderCaseSurface } = await import('../js/ui/app.js');
  const caso = (regime, questions = []) => ({
    id: 'c1', title: 'T', reference: 'R', status: 'Em preparação',
    context: { sphere: 'Judicial', branch: 'Cível', role: 'Perita do juízo', matter: 'Dano corporal', mode: 'Presencial' },
    methodology: { general: { valuationRegime: regime }, specific: {}, guided: {}, decision: {}, activeProtocolIds: [], dismissedProtocolIds: [] },
    questions, evidence: [], facts: [], events: []
  });

  assert.doesNotMatch(renderCaseSurface(caso(''), 'method'), /Barema funcional aplicável/,
    'sem regime declarado não há trilho a exibir');

  const civil = renderCaseSurface(caso('civil_liability'), 'method');
  assert.match(civil, /Barema funcional aplicável/);
  assert.match(civil, /Tabela Brasileira para Apuração do Dano Corporal/);
  assert.match(civil, /Barema principal/);
  assert.doesNotMatch(civil, /Cálculo subsidiário/, 'sem quesito de DPVAT não há subsidiário');
  assert.match(civil, /não contém a pontuação desta tabela/, 'a ausência de dado precisa estar dita na tela');

  // A interface não infere intenção de quesito por substring. "Explique por que a
  // tabela DPVAT não se aplica" contém "dpvat" e significa o oposto de pedir o
  // cálculo; afirmar que o juízo o determinou seria falsificar o processo.
  const mencaoNegada = renderCaseSurface(caso('civil_liability', [{ id: 'q1', text: 'Explique por que a tabela DPVAT não se aplica.' }]), 'method');
  assert.doesNotMatch(mencaoNegada, /Cálculo subsidiário/, 'menção literal não estabelece pedido de cálculo');
  const mencaoAfirmativa = renderCaseSurface(caso('civil_liability', [{ id: 'q1', text: 'Calcular conforme tabela DPVAT.' }]), 'method');
  assert.doesNotMatch(mencaoAfirmativa, /Cálculo subsidiário/, 'sem declaração estruturada a tela não adivinha nem no caso favorável');
  const appSource = readFileSync(new URL('../js/ui/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(appSource, /\/dpvat\/i/, 'nenhuma regex sobre texto de quesito na interface');
  const bloco = appSource.slice(appSource.indexOf('function renderBaremaRouting'), appSource.indexOf('function protocolSelector'));
  assert.doesNotMatch(bloco, /\.questions/, 'o roteamento exibido não pode ler texto livre de quesito');

  const semTrilho = renderCaseSurface(caso('labor'), 'method');
  assert.match(semTrilho, /não tem trilho de barema funcional registrado/);
  assert.doesNotMatch(semTrilho, /Barema principal/);
  // Não instruir ação sem controle: não há campo de barema manual nem de
  // justificativa no repositório, então a tela não pode mandar preenchê-los.
  assert.doesNotMatch(semTrilho, /registre a justificativa/i);
  assert.doesNotMatch(semTrilho, /[Ss]elecione manualmente/);
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

// Radio não desmarca por clique. Com a pergunta opcional e visível em toda
// perícia, um clique acidental gravava um regime falso e não havia caminho de
// volta ao estado "não declarado" — que é legítimo justamente porque o campo é
// opcional. O controle de limpar só existe quando há algo a limpar.
test('uma pergunta opcional pode voltar ao estado não declarado pela interface', async () => {
  const { renderCaseSurface } = await import('../js/ui/app.js');
  const base = () => ({
    id: 'c1', title: 'T', reference: 'R', status: 'Em preparação',
    context: { sphere: 'Judicial', branch: 'Cível', role: 'Perita do juízo', matter: 'Dano corporal', mode: 'Presencial' },
    methodology: { general: {}, specific: {}, guided: {}, decision: {}, activeProtocolIds: [], dismissedProtocolIds: [] },
    questions: [], evidence: [], facts: [], events: []
  });

  const semResposta = renderCaseSurface(base(), 'method');
  assert.doesNotMatch(semResposta, /data-clear-choice="methodology\.general\.valuationRegime"/,
    'sem valor gravado não há o que limpar');

  const comResposta = base();
  comResposta.methodology.general.valuationRegime = 'social_security';
  assert.match(renderCaseSurface(comResposta, 'method'), /data-clear-choice="methodology\.general\.valuationRegime"/,
    'com valor gravado a perita precisa de caminho de volta');

  // As demais perguntas do método não são opcionais e não ganham o controle.
  assert.equal((renderCaseSurface(comResposta, 'method').match(/data-clear-choice=/g) || []).length, 1);
});

// O rótulo prometia "DPVAT ou tabela normativa equivalente" e o trilho cita a Lei
// nº 6.194/1974 nominalmente: num seguro privado com tabela contratual, a tela
// afirmaria base normativa que não governa o caso.
test('a opção securitária nomeia exatamente o trilho que existe', () => {
  const securitario = VALUATION_REGIME_OPTIONS.find(o => o.id === 'insurance_dpvat');
  assert.match(securitario.label, /DPVAT/);
  assert.doesNotMatch(securitario.label, /equivalente/i,
    'não prometer cobertura normativa que o repositório não tem');
  const track = resolveFunctionalBaremaTrack({ regimeId: 'insurance_dpvat' }).principal;
  assert.match(track.note, /6\.194/, 'o trilho cita a norma específica — por isso o rótulo precisa ser específico');
});

console.log('Barema routing regression suite completed successfully.');

