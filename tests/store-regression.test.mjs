import assert from 'node:assert/strict';
import {
  createStore,
  normalizeCase,
  normalizeState
} from '../js/core/store.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  get length() {
    return this.values.size;
  }
}

globalThis.localStorage = new MemoryStorage();

function resetStorage() {
  globalThis.localStorage.clear();
}

function test(name, callback) {
  try {
    resetStorage();
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('migrates legacy scope into the canonical methodology object', () => {
  const normalized = normalizeCase({
    id: 'case_legacy_scope',
    scope: 'Apurar dano estético permanente.'
  });

  assert.equal(normalized.scope, 'Apurar dano estético permanente.');
  assert.equal(
    normalized.methodology.general.object,
    'Apurar dano estético permanente.'
  );
});

test('preserves a methodology object when legacy scope is absent', () => {
  const normalized = normalizeCase({
    id: 'case_method_object',
    methodology: {
      general: {
        object: 'Avaliar incapacidade laborativa.'
      }
    }
  });

  assert.equal(normalized.scope, 'Avaliar incapacidade laborativa.');
  assert.equal(
    normalized.methodology.general.object,
    'Avaliar incapacidade laborativa.'
  );
});

test('prefers the canonical methodology object when imported fields conflict', () => {
  const normalized = normalizeCase({
    id: 'case_conflict',
    scope: 'Texto antigo',
    methodology: {
      general: {
        object: 'Texto metodológico atual'
      }
    }
  });

  assert.equal(normalized.scope, 'Texto metodológico atual');
  assert.equal(
    normalized.methodology.general.object,
    'Texto metodológico atual'
  );
});

test('updates methodology object when the existing interface edits scope', () => {
  const initial = normalizeState({
    cases: [{ id: 'case_scope_edit', scope: 'Objeto inicial' }]
  });
  localStorage.setItem('medper.state.v4', JSON.stringify(initial));
  const store = createStore();

  store.update(state => {
    state.cases[0].scope = 'Objeto alterado pela interface legada';
  });

  const current = store.getState().cases[0];
  assert.equal(current.scope, 'Objeto alterado pela interface legada');
  assert.equal(
    current.methodology.general.object,
    'Objeto alterado pela interface legada'
  );
});

test('updates scope when the new cognitive flow edits the canonical object', () => {
  const initial = normalizeState({
    cases: [{ id: 'case_method_edit', scope: 'Objeto inicial' }]
  });
  localStorage.setItem('medper.state.v4', JSON.stringify(initial));
  const store = createStore();

  store.update(state => {
    state.cases[0].methodology.general.object =
      'Objeto alterado pelo novo fluxo';
  });

  const current = store.getState().cases[0];
  assert.equal(current.scope, 'Objeto alterado pelo novo fluxo');
  assert.equal(
    current.methodology.general.object,
    'Objeto alterado pelo novo fluxo'
  );
});

test('backs up and migrates a v3 state without losing case collections', () => {
  const legacyState = {
    version: 3,
    currentCaseId: 'case_v3',
    cases: [{
      id: 'case_v3',
      title: 'Caso legado',
      scope: 'Objeto do caso legado',
      evidence: [{ id: 'ev_1', title: 'Prontuário' }],
      facts: [{ id: 'fact_1', text: 'Fato preservado' }],
      events: [{ id: 'event_1', title: 'Evento preservado' }],
      questions: [{ id: 'q_1', text: 'Quesito preservado' }]
    }]
  };
  localStorage.setItem('medper.state.v3', JSON.stringify(legacyState));

  const store = createStore();
  const current = store.getState();
  const migratedCase = current.cases[0];

  assert.equal(current.version, 4);
  assert.equal(current.currentCaseId, 'case_v3');
  assert.equal(migratedCase.evidence.length, 1);
  assert.equal(migratedCase.facts.length, 1);
  assert.equal(migratedCase.events.length, 1);
  assert.equal(migratedCase.questions.length, 1);
  assert.equal(
    migratedCase.methodology.general.object,
    'Objeto do caso legado'
  );

  const backupKeys = [...localStorage.values.keys()].filter(key =>
    key.startsWith('medper.state.v3.backup.')
  );
  assert.equal(backupKeys.length, 1);
  assert.equal(
    localStorage.getItem(backupKeys[0]),
    JSON.stringify(legacyState)
  );
});

test('recovers safely from invalid persisted JSON', () => {
  localStorage.setItem('medper.state.v4', '{invalid-json');
  const store = createStore();

  assert.equal(store.getState().version, 4);
  assert.deepEqual(store.getState().cases, []);
});

console.log('Store regression suite completed successfully.');
