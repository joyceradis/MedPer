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
  // Rótulo ambíguo não migra. Quem escolheu "DPVAT ou tabela normativa
  // equivalente" pode ter querido dizer tabela contratual privada, e o registro
  // não distingue: converter para insurance_dpvat faria a tela afirmar a Lei nº
  // 6.194/1974 sobre um caso que talvez não a siga.
  for (const ambiguo of [
    'Securitário — DPVAT ou tabela normativa equivalente',
    'Finalidade securitária — DPVAT ou tabela normativa equivalente'
  ]) {
    assert.equal(normalizeRegimeId(ambiguo), '', `não migrar valor ambíguo: ${ambiguo}`);
  }
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

