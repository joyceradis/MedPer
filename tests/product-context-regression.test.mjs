import assert from 'node:assert/strict';
import { normalizeCase } from '../js/core/store.js';

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('preserves explicit juridical-pericial context and operational metadata', () => {
  const normalized = normalizeCase({
    id: 'case_contextual',
    context: {
      sphere: 'Judicial',
      branch: 'Cível',
      role: 'Perita do juízo',
      matter: 'Dano estético',
      tribunal: 'TJES',
      unit: '1ª Vara Cível de Vila Velha',
      feeRegime: 'AJG'
    },
    operations: {
      deadlines: [{
        id: 'deadline_laudo',
        type: 'Entrega do laudo',
        dueAt: '2026-08-12T23:59:00-03:00'
      }]
    }
  });

  assert.equal(normalized.context.sphere, 'Judicial');
  assert.equal(normalized.context.branch, 'Cível');
  assert.equal(normalized.context.role, 'Perita do juízo');
  assert.equal(normalized.context.matter, 'Dano estético');
  assert.equal(normalized.context.tribunal, 'TJES');
  assert.equal(normalized.context.unit, '1ª Vara Cível de Vila Velha');
  assert.equal(normalized.context.feeRegime, 'AJG');
  assert.equal(normalized.operations.deadlines.length, 1);
  assert.equal(normalized.operations.deadlines[0].type, 'Entrega do laudo');
});

test('adds safe empty operational defaults without changing legacy context labels', () => {
  const normalized = normalizeCase({
    id: 'case_legacy_context',
    context: { matter: 'Incapacidade' }
  });

  assert.equal(normalized.context.matter, 'Incapacidade');
  assert.equal(normalized.context.tribunal, '');
  assert.equal(normalized.context.unit, '');
  assert.equal(normalized.context.feeRegime, '');
  assert.deepEqual(normalized.operations.deadlines, []);
  assert.deepEqual(normalized.operations.pendingActions, []);
});

console.log('Product context regression suite completed successfully.');
