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

test('normalizes legacy preparation status to the active lifecycle without losing case data', () => {
  const normalized = normalizeCase({
    id: 'case_legacy_status',
    title: 'Perícia preservada',
    status: 'Em preparação',
    evidence: [{ id: 'ev_status', title: 'Prontuário' }]
  });

  assert.equal(normalized.status, 'Em andamento');
  assert.equal(normalized.title, 'Perícia preservada');
  assert.equal(normalized.evidence[0].title, 'Prontuário');
});

test('preserves canonical completed and trash lifecycle states', () => {
  assert.equal(normalizeCase({ status: 'Concluída' }).status, 'Concluída');
  assert.equal(normalizeCase({ status: 'Lixeira' }).status, 'Lixeira');
});

test('initializes adaptive protocol controls without changing the legacy primary matter', () => {
  const normalized = normalizeCase({
    context: { matter: 'Dano estético' }
  });

  assert.equal(normalized.context.matter, 'Dano estético');
  assert.deepEqual(normalized.methodology.activeProtocolIds, []);
  assert.deepEqual(normalized.methodology.dismissedProtocolIds, []);
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

test('persists a silent edit without notifying render subscribers', () => {
  const initial = normalizeState({
    cases: [{ id: 'case_silent', scope: 'Objeto inicial' }]
  });
  localStorage.setItem('medper.state.v4', JSON.stringify(initial));
  const store = createStore();
  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });

  store.update(state => {
    state.cases[0].scope = 'Texto digitado sem reconstrução';
  }, { notify: false });

  assert.equal(notifications, 0);
  assert.equal(
    store.getState().cases[0].methodology.general.object,
    'Texto digitado sem reconstrução'
  );

  const persisted = JSON.parse(localStorage.getItem('medper.state.v4'));
  assert.equal(
    persisted.cases[0].scope,
    'Texto digitado sem reconstrução'
  );
});

test('notifies subscribers explicitly after deferred field editing', () => {
  const initial = normalizeState({
    cases: [{ id: 'case_notify', scope: 'Objeto inicial' }]
  });
  localStorage.setItem('medper.state.v4', JSON.stringify(initial));
  const store = createStore();
  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });

  store.update(state => {
    state.cases[0].scope = 'Texto final';
  }, { notify: false });
  store.notify();

  assert.equal(notifications, 1);
  assert.equal(store.getState().cases[0].scope, 'Texto final');
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
