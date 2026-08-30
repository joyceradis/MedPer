import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  INSTRUMENT_GUIDE,
  instrumentGuidance,
  PURPOSE_REGIME_CORRESPONDENCE,
  suggestedRegimeForPurpose
} from '../js/methodology/instrument-guide.js';
import { VALUATION_REGIME_OPTIONS } from '../js/methodology/barema-routing.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

// ------------------------------------------------ o guia auxilia, não decide

test('cada entrada do guia responde às três perguntas: o que mede, quando cabe, o que não faz', () => {
  const ids = Object.keys(INSTRUMENT_GUIDE);
  assert.deepEqual(ids.sort(), ['abmlpm_functional', 'aipe', 'balthazard', 'dpvat', 'posas']);
  for (const entry of Object.values(INSTRUMENT_GUIDE)) {
    assert.ok(entry.construct.length > 10, `${entry.id}: constructo declarado`);
    assert.ok(entry.whenAdequate.length > 10, `${entry.id}: adequação declarada`);
    assert.ok(entry.boundaries.length >= 2, `${entry.id}: limites declarados`);
    // "Ninguém grava qual tabela usar" — agora grava, com a origem junto:
    // afirmação sem fonte rastreável não entra no guia.
    assert.ok(/issue #5\d|Fernandes|posas\.nl|matriz interna/.test(entry.basis),
      `${entry.id}: base rastreável (${entry.basis})`);
  }
});

test('o guia registra as fronteiras da issue #56, não versões amaciadas delas', () => {
  assert.match(INSTRUMENT_GUIDE.posas.boundaries.join(' '), /Não alimenta matematicamente a AIPE/);
  assert.match(INSTRUMENT_GUIDE.posas.boundaries.join(' '), /Não valora amputação/);
  assert.match(INSTRUMENT_GUIDE.balthazard.boundaries.join(' '), /Não cria percentual clínico/);
  assert.match(INSTRUMENT_GUIDE.balthazard.construct, /REGRA DE COMBINAÇÃO/);
  assert.match(INSTRUMENT_GUIDE.aipe.boundaries.join(' '), /não prova nexo/i);
  // A regra canônica inteira: etiologia nunca seleciona tabela.
  assert.match(INSTRUMENT_GUIDE.dpvat.boundaries.join(' '), /NÃO implica DPVAT/);
  assert.match(INSTRUMENT_GUIDE.abmlpm_functional.whenAdequate, /etiologia do trauma nunca seleciona/i);
});

test('os trilhos de barema declaram que a pontuação NÃO está no MedPer', () => {
  // Prometer cálculo que o repositório não tem seria o pior erro do guia:
  // a perita pode confiar nele.
  assert.match(INSTRUMENT_GUIDE.abmlpm_functional.boundaries.join(' '), /NÃO está codificada/);
  assert.match(INSTRUMENT_GUIDE.dpvat.boundaries.join(' '), /não estão codificados/);
});

test('instrumentGuidance devolve a entrada ou null, nunca inventa', () => {
  assert.equal(instrumentGuidance('aipe'), INSTRUMENT_GUIDE.aipe);
  assert.equal(instrumentGuidance('desconhecido'), null);
  assert.equal(instrumentGuidance(undefined), null);
});

test('o guia não contém pontuação nem faixa de escala — só justificativa', () => {
  // O conteúdo numérico dos instrumentos vive nos módulos deles (aipe.js,
  // posas.js); o guia repete apenas o denominador declarado (0–50) e fórmula
  // já pública (Balthazard inversa). Nenhuma tabela de pontos entra aqui.
  const fonte = fs.readFileSync(new URL('../js/methodology/instrument-guide.js', import.meta.url), 'utf8');
  assert.ok(!/range\s*:|score\s*:|points\s*:/.test(fonte), 'sem estrutura de pontuação no guia');
});

// ------------------------------- correspondência finalidade × regime (30/08)

test('o mapa cobre as cinco finalidades canônicas, com null como declaração', () => {
  assert.deepEqual(Object.keys(PURPOSE_REGIME_CORRESPONDENCE).sort(), [
    'forensic_assessment', 'medicolegal_assessment', 'occupational_medicolegal_assessment',
    'personal_damage_assessment', 'social_security_assessment'
  ]);
  assert.equal(PURPOSE_REGIME_CORRESPONDENCE.personal_damage_assessment, 'civil_liability');
  assert.equal(PURPOSE_REGIME_CORRESPONDENCE.social_security_assessment, 'social_security');
  assert.equal(PURPOSE_REGIME_CORRESPONDENCE.occupational_medicolegal_assessment, 'labor');
  // Médico-legal e forense não têm regime correspondente — declarado, não omitido.
  assert.equal(PURPOSE_REGIME_CORRESPONDENCE.medicolegal_assessment, null);
  assert.equal(PURPOSE_REGIME_CORRESPONDENCE.forensic_assessment, null);
});

test('todo regime mapeado existe na lista de regimes — o mapa não inventa ids', () => {
  const validos = new Set(VALUATION_REGIME_OPTIONS.map(option => option.id));
  for (const [purpose, regime] of Object.entries(PURPOSE_REGIME_CORRESPONDENCE)) {
    if (regime !== null) assert.ok(validos.has(regime), `${purpose} → ${regime} existe`);
  }
});

test('DPVAT não tem finalidade canônica correspondente — só entra por declaração explícita', () => {
  const mapeados = Object.values(PURPOSE_REGIME_CORRESPONDENCE);
  assert.ok(!mapeados.includes('insurance_dpvat'),
    'nenhuma finalidade sugere DPVAT: alcançá-lo exige declaração da perita');
});

test('a sugestão carrega justificativa e nunca é seleção', () => {
  const sugestao = suggestedRegimeForPurpose('personal_damage_assessment');
  assert.equal(sugestao.regimeId, 'civil_liability');
  assert.match(sugestao.rationale, /issue #56/);
  assert.match(sugestao.rationale, /a declaração do regime é sua/i);
  assert.equal(suggestedRegimeForPurpose('medicolegal_assessment'), null);
  assert.equal(suggestedRegimeForPurpose('inexistente'), null);
  assert.equal(suggestedRegimeForPurpose(undefined), null);
});

// ------------------------------------------------ o guia chega às telas

test('o cartão de contexto usa o guia em vez do texto genérico', () => {
  const controller = fs.readFileSync(new URL('../js/ui/method-context-controller.js', import.meta.url), 'utf8');
  assert.match(controller, /instrumentGuidance/, 'o cartão consulta o guia');
  assert.match(controller, /method-instrument-limits/, 'os limites do instrumento aparecem na linha');
});

test('a etapa de método publica o painel "Qual instrumento para quê"', () => {
  const app = fs.readFileSync(new URL('../js/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /function instrumentGuidePanel\(\)/);
  assert.match(app, /\$\{instrumentGuidePanel\(\)\}/, 'o painel entra em renderMethod');
  assert.match(app, /Qual instrumento para quê/);
});

console.log('Instrument guide regression suite completed successfully.');
