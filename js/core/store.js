const STORAGE_KEY = 'medper.state.v4';
const LEGACY_KEYS = ['medper.state.v3', 'medper.state.v2', 'mlks.prototype.v1'];

function now() {
  return new Date().toISOString();
}

function text(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeCaseStatus(value) {
  if (value === 'Concluída' || value === 'Lixeira') return value;
  return 'Em andamento';
}

function synchronizePericialObject(caseData, previousCase = null) {
  caseData.methodology ||= {};
  caseData.methodology.general ||= {};

  const currentScope = text(caseData.scope);
  const currentMethodObject = text(caseData.methodology.general.object);

  if (!previousCase) {
    const canonical = currentMethodObject || currentScope;
    caseData.scope = canonical;
    caseData.methodology.general.object = canonical;
    return;
  }

  const previousScope = text(previousCase.scope);
  const previousMethodObject = text(previousCase.methodology?.general?.object);
  const scopeChanged = currentScope !== previousScope;
  const methodObjectChanged = currentMethodObject !== previousMethodObject;

  let canonical;
  if (scopeChanged && !methodObjectChanged) {
    canonical = currentScope;
  } else if (methodObjectChanged && !scopeChanged) {
    canonical = currentMethodObject;
  } else {
    canonical = currentMethodObject || currentScope;
  }

  caseData.scope = canonical;
  caseData.methodology.general.object = canonical;
}

function normalizeCase(caseData = {}, previousCase = null) {
  const c = structuredClone(caseData);
  c.id ||= `case_${crypto.randomUUID?.() || Date.now()}`;
  c.title ||= 'Caso sem título';
  c.reference ||= '';
  c.status = normalizeCaseStatus(c.status);
  c.context ||= {};
  c.context.tribunal = text(c.context.tribunal);
  c.context.unit = text(c.context.unit);
  c.context.feeRegime = text(c.context.feeRegime);
  c.operations ||= {};
  c.operations.deadlines = Array.isArray(c.operations.deadlines)
    ? c.operations.deadlines
    : [];
  c.operations.pendingActions = Array.isArray(c.operations.pendingActions)
    ? c.operations.pendingActions
    : [];
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
  c.methodology.activeProtocolIds = Array.isArray(c.methodology.activeProtocolIds)
    ? [...new Set(c.methodology.activeProtocolIds)]
    : [];
  c.methodology.dismissedProtocolIds = Array.isArray(c.methodology.dismissedProtocolIds)
    ? [...new Set(c.methodology.dismissedProtocolIds)]
    : [];
  c.methodology.decision ||= {
    claim: '', favorable: '', contrary: '', alternatives: '', limits: '', certainty: '', admissibleConclusion: ''
  };
  synchronizePericialObject(c, previousCase);
  return c;
}

function normalizeState(input = {}, previousState = null) {
  const previousCases = new Map(
    Array.isArray(previousState?.cases)
      ? previousState.cases.map(caseData => [caseData.id, caseData])
      : []
  );

  return {
    version: 4,
    updatedAt: input.updatedAt || now(),
    currentCaseId: input.currentCaseId || null,
    currentTab: input.currentTab || 'summary',
    cases: Array.isArray(input.cases)
      ? input.cases.map(caseData => normalizeCase(caseData, previousCases.get(caseData.id) || null))
      : []
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
    update(mutator, options = {}) {
      const { notify = true } = options;
      const next = structuredClone(state);
      mutator(next);
      state = normalizeState(next, state);
      persist(state);
      if (notify) emit();
    },
    notify() {
      emit();
    },
    replace(nextState) {
      state = normalizeState(nextState);
      persist(state);
      emit();
    }
  };
}

export { normalizeCase, normalizeState, synchronizePericialObject };
