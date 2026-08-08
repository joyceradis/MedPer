import assert from 'node:assert/strict';

let lifecycle = null;
let importError = null;
try {
  lifecycle = await import('../js/core/case-lifecycle.js');
} catch (error) {
  importError = error;
}

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('loads lifecycle helpers', () => {
  assert.equal(importError, null);
  assert.equal(typeof lifecycle.filterCasesByLifecycle, 'function');
  assert.equal(typeof lifecycle.applyLifecycleAction, 'function');
});

test('separates active, completed and trash cases', () => {
  const cases = [
    { id:'active', status:'Em andamento' },
    { id:'done', status:'Concluída' },
    { id:'trash', status:'Lixeira' }
  ];

  assert.deepEqual(lifecycle.filterCasesByLifecycle(cases, 'active').map(c => c.id), ['active']);
  assert.deepEqual(lifecycle.filterCasesByLifecycle(cases, 'completed').map(c => c.id), ['done']);
  assert.deepEqual(lifecycle.filterCasesByLifecycle(cases, 'trash').map(c => c.id), ['trash']);
  assert.deepEqual(lifecycle.countCasesByLifecycle(cases), { active:1, completed:1, trash:1 });
});

test('restores a trashed completed case to its previous lifecycle', () => {
  const caseData = { id:'done', status:'Concluída' };

  lifecycle.applyLifecycleAction(caseData, 'trash');
  assert.equal(caseData.status, 'Lixeira');
  assert.equal(caseData.lifecycle.previousStatus, 'Concluída');

  lifecycle.applyLifecycleAction(caseData, 'restore');
  assert.equal(caseData.status, 'Concluída');
});

test('completes and reopens a case without touching other data', () => {
  const caseData = { status:'Em andamento', title:'Caso', evidence:[{ id:'ev1' }] };

  lifecycle.applyLifecycleAction(caseData, 'complete');
  assert.equal(caseData.status, 'Concluída');
  lifecycle.applyLifecycleAction(caseData, 'reopen');
  assert.equal(caseData.status, 'Em andamento');
  assert.equal(caseData.evidence[0].id, 'ev1');
});

console.log('Case lifecycle suite completed successfully.');
