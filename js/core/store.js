import { normalizeAppointment } from '../models/appointment.js';
const STORAGE_KEY = 'medper.state.v4';
const LEGACY_KEYS = ['medper.state.v3', 'medper.state.v2', 'mlks.prototype.v1'];

const SETTING_IDS = new Map([
  ['Judicial','judicial'],
  ['Administrativa','administrative'],
  ['Administrativo','administrative'],
  ['Previdenciária','social_security'],
  ['Trabalhista e ocupacional','occupational'],
  ['Securitária','insurance'],
  ['Ético-profissional','professional_ethics'],
  ['Extrajudicial / particular','extrajudicial'],
  ['Extrajudicial','extrajudicial']
]);

const LEGAL_SPHERE_IDS = new Map([
  ['Cível','civil'],
  ['Civil','civil'],
  ['Criminal','criminal'],
  ['Trabalhista','labor'],
  ['Previdenciário','social_security'],
  ['Previdenciária','social_security'],
  ['Família','family'],
  ['Fazenda Pública','public_law'],
  ['Justiça Federal','federal']
]);

const ROLE_IDS = new Map([
  ['Perita do juízo','court_expert'],
  ['Assistente técnica da parte autora','claimant_technical_assistant'],
  ['Assistente técnica da parte ré','defendant_technical_assistant'],
  ['Parecerista independente','independent_reviewer'],
  ['Perita administrativa','administrative_expert'],
  ['Médica revisora','medical_reviewer']
]);

const MATTER_IDS = new Map([
  ['Dano estético','aesthetic_damage'],
  ['Dano corporal','bodily_damage'],
  ['Incapacidade','capacity'],
  ['Nexo causal e concausa','causation'],
  ['Responsabilidade profissional','professional_liability'],
  ['Acidente de trabalho','occupational_accident'],
  ['Doença ocupacional','occupational_disease'],
  ['Invalidez securitária','insurance_disability'],
  ['Benefício previdenciário','social_security_benefit'],
  ['Capacidade civil ou funcional','civil_or_functional_capacity'],
  ['Outro','other']
]);

function now() {
  return new Date().toISOString();
}

function text(value) {
  return typeof value === 'string' ? value : '';
}

function stableId(explicit, label, map) {
  return text(explicit) || map.get(text(label)) || '';
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

  c.context.setting = text(c.context.setting) || text(c.context.sphere);
  c.context.legalSphere = text(c.context.legalSphere) || text(c.context.branch);
  c.context.settingId = stableId(c.context.settingId, c.context.setting, SETTING_IDS);
  c.context.legalSphereId = stableId(c.context.legalSphereId, c.context.legalSphere, LEGAL_SPHERE_IDS);
  c.context.roleId = stableId(c.context.roleId, c.context.role, ROLE_IDS);
  c.context.matterId = stableId(c.context.matterId, c.context.matter, MATTER_IDS);
  c.context.purposeId = text(c.context.purposeId);
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

  // Encargo pericial: o ciclo real começa na nomeação, não na criação do caso.
  // Caso legado sem o campo abre com o encargo pendente — nunca presumido aceito,
  // porque presumir aceite é afirmar sobre o processo algo que não foi declarado.
  c.appointment = normalizeAppointment(c.appointment);

  c.person ||= { initials: '', birthDate: '', role: 'Periciando(a)' };
  c.scope ||= '';
  c.documentGaps ||= '';
  c.evidence ||= [];
  c.facts ||= [];
  c.events ||= [];
  c.questions ||= [];
  c.conclusions ||= [];
  // Conferência do laudo: mapa item → marcado. Registro da perita sobre o próprio
  // trabalho, não juízo do sistema — nada aqui altera protocolo, pontuação ou
  // conclusão. Caso legado sem o campo abre normalmente com a conferência vazia.
  c.conference = c.conference && typeof c.conference === 'object' && !Array.isArray(c.conference)
    ? { ...c.conference }
    : {};
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
  c.methodology.activeInstrumentIds = Array.isArray(c.methodology.activeInstrumentIds)
    ? [...new Set(c.methodology.activeInstrumentIds)]
    : [];
  c.methodology.dismissedInstrumentIds = Array.isArray(c.methodology.dismissedInstrumentIds)
    ? [...new Set(c.methodology.dismissedInstrumentIds)]
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
