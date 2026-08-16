import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FINALIDADE_OPTIONS,
  FUNCTIONAL_BAREMA_TRACKS,
  combineAxisResults,
  functionalBaremaIsAtStake,
  normalizeFinalidadeId,
  remainingCapacity,
  resolveFunctionalBaremaTrack
} from '../js/methodology/barema-routing.js';
import { auditCase } from '../js/methodology/engine.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

// ---------------------------------------------------------------------------
// Os cinco casos de teste da issue #56, literalmente.
// ---------------------------------------------------------------------------

test('acidente de trânsito + responsabilidade civil → não seleciona DPVAT automaticamente; ABMLPM é o barema funcional principal', () => {
  const result = resolveFunctionalBaremaTrack({ finalidadeId: 'civil_liability' });
  assert.equal(result.principal.id, 'abmlpm_functional');
  assert.equal(result.principal.role, 'principal');
  assert.deepEqual(result.subsidiary, []);
  assert.equal(result.requiresManualChoice, false);
});

test('acidente de trânsito + finalidade securitária DPVAT → tabela DPVAT correspondente', () => {
  const result = resolveFunctionalBaremaTrack({ finalidadeId: 'insurance_dpvat' });
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

test('múltiplas sequelas funcionais → Balthazard apenas quando indicado pelo barema, nunca soma direta', () => {
  // Exemplo publicado (perda de membro superior 70% + visão de um olho 30% +
  // anquilose de quadril 20%): soma direta dá 120%, impossível; capacidade
  // restante dá 83% — verificado contra a literatura antes de implementar.
  const restante = remainingCapacity([70, 30, 20]);
  const somaDireta = 70 + 30 + 20;
  assert.ok(restante < somaDireta, 'capacidade restante deve ser menor que a soma direta, nunca igual');
  assert.equal(Math.round(restante), 83);
});

test('licenciamento vencido isolado → não reduz escore funcional/AIPE nem gera culpa concorrente automaticamente', () => {
  // A garantia é estrutural: a assinatura de resolveFunctionalBaremaTrack não
  // tem parâmetro para nenhum dado administrativo/circunstancial. Uma
  // propriedade extra desse tipo, se alguém tentar passar, é simplesmente
  // ignorada — não existe caminho de código que a leia.
  const semAntecedente = resolveFunctionalBaremaTrack({ finalidadeId: 'civil_liability' });
  const comAntecedenteAdministrativo = resolveFunctionalBaremaTrack({
    finalidadeId: 'civil_liability',
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
  const result = resolveFunctionalBaremaTrack({ finalidadeId: '' });
  assert.equal(result.principal, null);
  assert.equal(result.requiresManualChoice, true);
  assert.match(result.rationale, /não deve ser inferida da causa do trauma/);
});

test('finalidades previdenciária e trabalhista são reconhecidas mas exigem escolha manual até haver trilho próprio', () => {
  for (const finalidadeId of ['social_security', 'labor']) {
    const result = resolveFunctionalBaremaTrack({ finalidadeId });
    assert.equal(result.requiresManualChoice, true, finalidadeId);
    assert.equal(result.principal, null, finalidadeId);
  }
});

test('quesito pedindo DPVAT explicitamente aparece como subsidiário, nunca substitui o principal', () => {
  const semQuesito = resolveFunctionalBaremaTrack({ finalidadeId: 'civil_liability' });
  const comQuesito = resolveFunctionalBaremaTrack({ finalidadeId: 'civil_liability', dpvatQuesitoExplicit: true });
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

test('normalizeFinalidadeId aceita id, tolera rótulo legado e falha fechado', () => {
  for (const option of FINALIDADE_OPTIONS) {
    assert.equal(normalizeFinalidadeId(option.id), option.id, 'o id é a forma canônica persistida');
    assert.equal(normalizeFinalidadeId(option.label), option.id, 'casos gravados antes da correção guardaram o rótulo');
  }
  assert.equal(normalizeFinalidadeId('A definir'), '', 'a sentinela removida não declara finalidade');
  assert.equal(normalizeFinalidadeId(''), '');
  assert.equal(normalizeFinalidadeId(undefined), '');
});

// A tela persistia o rótulo visível como chave. Renomear uma opção órfãva casos
// já gravados — contra os invariantes de engenharia 3 e 4 da arquitetura.
test('a opção de finalidade persiste id estável, não o rótulo visível', () => {
  const source = readFileSync(new URL('../js/methodology/protocols.js', import.meta.url), 'utf8');
  assert.match(source, /FINALIDADE_OPTIONS\.map\(option=>\(\{id:option\.id,label:option\.label\}\)\)/,
    'as opções precisam carregar id e rótulo separados');
  assert.doesNotMatch(source, /concat\('A definir'\)/, 'a sentinela contraditória foi removida');
});

// "A definir" gravava valor e fazia a etapa contar como concluída enquanto a
// auditoria dizia que a finalidade não estava declarada.
test('finalidade não declarada não conta como etapa concluída', async () => {
  const { completion } = await import('../js/methodology/engine.js');
  const base = () => ({context:{sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano corporal',mode:'Presencial e documental'},
    methodology:{general:{object:'o',controversies:'c',methodChoice:'m',scopeLimits:'l'},specific:{},guided:{},decision:{}}});

  const semFinalidade = base();
  assert.equal(completion(semFinalidade).general[0], false, 'sem finalidade a delimitação não está concluída');

  const sentinela = base();
  sentinela.methodology.general.finalidadeChoice = 'A definir';
  assert.equal(completion(sentinela).general[0], false, 'a sentinela legada não pode fechar a etapa');

  const declarada = base();
  declarada.methodology.general.finalidadeChoice = 'civil_liability';
  assert.equal(completion(declarada).general[0], true, 'finalidade declarada fecha a etapa');
});

// Gatear o roteador em `capacity` deixava "Dano corporal" — a matéria a que a
// Tabela Brasileira se dirige, e que não tem protocolo próprio — fora dele.
test('Dano corporal alcança o roteador mesmo sem protocolo de incapacidade', () => {
  assert.equal(functionalBaremaIsAtStake({matter:'Dano corporal',protocolIds:[]}), true);
  assert.equal(functionalBaremaIsAtStake({matterId:'capacity',protocolIds:[]}), true);
  assert.equal(functionalBaremaIsAtStake({matter:'Incapacidade',protocolIds:['capacity']}), true);
  assert.equal(functionalBaremaIsAtStake({matter:'Dano estético',protocolIds:['aesthetic']}), false,
    'dano estético puro não usa barema funcional e não deve receber a ressalva');

  const corporal={context:{sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano corporal',mode:'Presencial e documental'},
    methodology:{general:{},specific:{},guided:{},decision:{}},questions:[],evidence:[],facts:[],events:[]};
  assert.ok(auditCase(corporal).issues.some(i=>/Finalidade médico-jurídica da perícia não declarada/.test(i.text)),
    'o caso central da #56 precisa receber a ressalva de finalidade');
});

test('a ressalva de finalidade declara o campo que a originou', () => {
  const corporal={context:{matter:'Dano corporal'},methodology:{general:{},specific:{},guided:{},decision:{}},questions:[],evidence:[],facts:[],events:[]};
  const found=auditCase(corporal).issues.find(i=>/Finalidade médico-jurídica da perícia não declarada/.test(i.text));
  assert.equal(found?.field,'finalidadeChoice');
});

test('rótulos legados continuam resolvendo — nenhum caso gravado é órfão', () => {
  for (const option of FINALIDADE_OPTIONS) {
    assert.equal(normalizeFinalidadeId(option.label), option.id);
  }
  assert.equal(normalizeFinalidadeId('Rótulo inexistente'), '');
  assert.equal(normalizeFinalidadeId(undefined), '');
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

test('auditCase aponta a lacuna quando a finalidade não foi declarada num caso de capacidade', () => {
  const { issues } = auditCase(capacityCase());
  assert.ok(issues.some(i => /Finalidade médico-jurídica.*não declarada/.test(i.text)));
});

test('auditCase fica em silêncio sobre finalidade quando ela já foi declarada e resolve sem ambiguidade', () => {
  const declared = capacityCase({
    general: { finalidadeChoice: 'Responsabilidade civil — indenização contra causador, empresa ou empregador' }
  });
  const { issues } = auditCase(declared);
  assert.ok(!issues.some(i => /[Ff]inalidade/.test(i.text)),
    'resolvido sem ambiguidade não deve virar ruído permanente na auditoria');
});

test('auditCase aponta ambiguidade quando a finalidade declarada ainda não tem trilho de barema próprio', () => {
  const declared = capacityCase({ general: { finalidadeChoice: 'Trabalhista/ocupacional' } });
  const { issues } = auditCase(declared);
  assert.ok(issues.some(i => i.severity === 'warning' && /trilho de barema funcional/.test(i.text)));
});

console.log('Barema routing regression suite completed successfully.');

// Tornar a finalidade exigente para completude, sem torná-la condicional, obrigava
// a perita de um dano estético criminal a declarar algo falso ou a deixar a
// Delimitação eternamente em andamento — nenhuma das quatro opções descreve
// aquela avaliação. Completude e auditoria passam a usar o MESMO predicado.
test('a pergunta de finalidade não aparece nem é exigida onde nenhuma resposta seria verdadeira', async () => {
  const { completion, auditCase: audit } = await import('../js/methodology/engine.js');
  const { generalMethod } = await import('../js/methodology/protocols.js');
  const delimitacao = generalMethod.find(step => step.id === 'delimitation');
  const campo = delimitacao.fields.find(f => f.id === 'finalidadeChoice');

  const preenchido = { object: 'o', controversies: 'c', methodChoice: 'm', scopeLimits: 'l' };
  const estetico = {
    context: { sphere: 'Judicial', branch: 'Criminal', role: 'Perita do juízo', matter: 'Dano estético', matterId: 'aesthetic_damage', mode: 'Presencial' },
    methodology: { general: { ...preenchido }, specific: {}, guided: {}, decision: {} }, questions: [], evidence: [], facts: [], events: []
  };
  const corporal = {
    context: { sphere: 'Judicial', branch: 'Cível', role: 'Perita do juízo', matter: 'Dano corporal', mode: 'Presencial' },
    methodology: { general: { ...preenchido }, specific: {}, guided: {}, decision: {} }, questions: [], evidence: [], facts: [], events: []
  };

  assert.equal(campo.appliesTo(estetico), false, 'a pergunta não cabe num caso estético puro');
  assert.equal(campo.appliesTo(corporal), true, 'a pergunta cabe onde o barema funcional está em jogo');

  assert.equal(completion(estetico).general[0], true, 'a etapa fecha sem uma resposta que seria falsa');
  assert.equal(completion(corporal).general[0], false, 'onde a pergunta cabe, ela continua exigida');

  corporal.methodology.general.finalidadeChoice = 'civil_liability';
  assert.equal(completion(corporal).general[0], true);

  // O ponto do achado: as duas leituras não podem divergir.
  const ressalva = /Finalidade médico-jurídica da perícia não declarada/;
  assert.equal(audit(estetico).issues.some(i => ressalva.test(i.text)), false, 'auditoria e completude concordam: não cabe');
  const corporalSemFinalidade = { ...corporal, methodology: { ...corporal.methodology, general: { ...preenchido } } };
  assert.equal(audit(corporalSemFinalidade).issues.some(i => ressalva.test(i.text)), true, 'auditoria e completude concordam: cabe e falta');
});
