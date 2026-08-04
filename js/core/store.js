const STORAGE_KEY = 'medper.state.v4';
const LEGACY_KEYS = ['medper.state.v3', 'medper.state.v2', 'mlks.prototype.v1'];

function now() {
  return new Date().toISOString();
}

function normalizeCase(caseData = {}) {
  const c = structuredClone(caseData);
  c.id ||= `case_${crypto.randomUUID?.() || Date.now()}`;
  c.title ||= 'Caso sem título';
  c.reference ||= '';
  c.status ||= 'Em preparação';
  c.context ||= {};
  c.person ||= { initials: '', birthDate: '', role: 'Periciando(a)' };
  c.scope ||= '';
  c.documentGaps ||= '';
  c.evidence ||= [];
  c.facts ||= [];
  c.events ||= [];
  c.questions ||= [];
  c.conclusions ||= [];
  c.methodology ||= {};
  c.methodology.general ||= {};
  c.methodology.specific ||= {};
  c.methodology.guided ||= {};
  c.methodology.decision ||= {
    claim: '', favorable: '', contrary: '', alternatives: '', limits: '', certainty: '', admissibleConclusion: ''
  };
  return c;
}

function normalizeState(input = {}) {
  return {
    version: 4,
    updatedAt: input.updatedAt || now(),
    currentCaseId: input.currentCaseId || null,
    currentTab: input.currentTab || 'summary',
    cases: Array.isArray(input.cases) ? input.cases.map(normalizeCase) : []
  };
}

function readRaw() {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) return current;
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      localStorage.setItem(`${key}.backup.${Date.now()}`, raw);
      return raw;
    }
  }
  return '{}';
}

function loadState() {
  try {
    return normalizeState(JSON.parse(readRaw()));
  } catch {
    return normalizeState();
  }
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: now() }));
}

export function createStore() {
  let state = loadState();
  const listeners = new Set();
  persist(state);

  const emit = () => listeners.forEach(listener => listener(state));

  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(mutator) {
      const next = structuredClone(state);
      mutator(next);
      state = normalizeState(next);
      persist(state);
      emit();
    },
    replace(nextState) {
      state = normalizeState(nextState);
      persist(state);
      emit();
    }
  };
}

export { normalizeCase };
