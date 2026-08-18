import assert from 'node:assert/strict';
import {
  DAMAGE_SOURCE_VERSION,
  DAMAGE_SOURCE_TABS,
  calculateTemporaryDays,
  combineRemainingCapacity,
  isolateIncrementFromPriorState
} from '../js/methodology/internal-damage-source.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('fonte interna registra a versão canônica da matriz sem expor o Google Sheets ao usuário', () => {
  assert.equal(DAMAGE_SOURCE_VERSION, '1.5');
  assert.equal(DAMAGE_SOURCE_TABS.guided, 'Roteiro Guiado');
  assert.equal(DAMAGE_SOURCE_TABS.temporary, 'Danos Temporários');
  assert.equal(DAMAGE_SOURCE_TABS.functional, 'Calculadora de Balthazard');
  assert.equal('spreadsheetUrl' in DAMAGE_SOURCE_TABS, false);
});

test('dias temporários usam contagem inclusiva apenas quando ambas as datas existem', () => {
  assert.equal(calculateTemporaryDays('2026-01-01', '2026-01-01'), 1);
  assert.equal(calculateTemporaryDays('2026-01-01', '2026-01-10'), 10);
  assert.equal(calculateTemporaryDays('', '2026-01-10'), null);
  assert.equal(calculateTemporaryDays('2026-01-10', ''), null);
});

test('intervalo temporal invertido falha fechado em vez de produzir duração negativa', () => {
  assert.equal(calculateTemporaryDays('2026-01-10', '2026-01-01'), null);
});

test('capacidade restante combina apenas percentuais funcionais válidos', () => {
  const result = combineRemainingCapacity([0.20, 0.10]);
  assert.equal(Number(result.deficit.toFixed(6)), 0.28);
  assert.equal(Number(result.remaining.toFixed(6)), 0.72);
  assert.deepEqual(result.impacts.map(value => Number(value.toFixed(6))), [0.2, 0.08]);
});

test('capacidade restante é comutativa', () => {
  assert.equal(
    Number(combineRemainingCapacity([0.20, 0.10, 0.05]).deficit.toFixed(9)),
    Number(combineRemainingCapacity([0.05, 0.20, 0.10]).deficit.toFixed(9))
  );
});

test('Balthazard inversa isola incremento funcional somente em domínio matemático válido', () => {
  assert.equal(Number(isolateIncrementFromPriorState(0.50, 0.20).toFixed(6)), 0.375);
  assert.equal(isolateIncrementFromPriorState(0.10, 0.20), null);
  assert.equal(isolateIncrementFromPriorState(0.50, 1), null);
});

console.log('Internal damage source regression suite completed successfully.');
