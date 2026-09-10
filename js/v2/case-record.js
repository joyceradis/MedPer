const SCHEMA_VERSION = 2;

function uid(prefix='id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

const text = value => String(value ?? '').trim();
const array = value => Array.isArray(value) ? value : [];

export function createCaseRecord(input = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: text(input.id) || uid('case'),
    identity: {
      title: text(input.title) || 'Caso sem título',
      processNumber: text(input.processNumber),
      court: text(input.court),
      professionalRole: text(input.professionalRole) || 'perita_judicial',
      status: text(input.status) || 'rascunho'
    },
    context: {
      legalContext: text(input.context) || 'civel',
      object: text(input.object),
      specialty: text(input.specialty)
    },
    examinedPerson: { name: text(input.examinedPerson) },
    deadlines: { examinationDate: text(input.examinationDate), reportDeadline: text(input.reportDeadline) },
    sources: [], timeline: [],
    history: { summary:'', antecedents:'', treatments:'', complaints:'', limitations:'' },
    examination: { summary:'', positives:'', negatives:'', measurements:'', limitations:'', photographs:'' },
    methodology: { selected:[], notes:'', aipe:{}, posas:{} },
    evidenceClaims: [],
    questions: [],
    analysis: { medicoLegalQuestion:'', favorable:'', contrary:'', priorState:'', alternatives:'', reasoning:'', limitations:'' },
    conclusion: { summary:'', nexus:'', incapacity:'', aestheticDamage:'', functionalDamage:'', prognosis:'' },
    document: { title:'Laudo médico-pericial', introduction:'', discussion:'', signature:'' },
    metadata: { createdAt: now, updatedAt: now }
  };
}

export function normalizeCaseRecord(raw = {}) {
  if (raw?.schemaVersion === SCHEMA_VERSION && raw.identity && raw.context) {
    const base = createCaseRecord({ id:raw.id, title:raw.identity.title });
    return {
      ...base, ...raw,
      identity:{...base.identity,...raw.identity}, context:{...base.context,...raw.context}, examinedPerson:{...base.examinedPerson,...raw.examinedPerson},
      deadlines:{...base.deadlines,...raw.deadlines}, history:{...base.history,...raw.history}, examination:{...base.examination,...raw.examination},
      methodology:{...base.methodology,...raw.methodology}, analysis:{...base.analysis,...raw.analysis}, conclusion:{...base.conclusion,...raw.conclusion}, document:{...base.document,...raw.document},
      sources:array(raw.sources), timeline:array(raw.timeline), evidenceClaims:array(raw.evidenceClaims), questions:array(raw.questions),
      metadata:{...base.metadata,...raw.metadata,updatedAt:text(raw.metadata?.updatedAt)||new Date().toISOString()}
    };
  }
  const migrated = createCaseRecord({
    id:raw.id, title:raw.title || raw.identity?.title, processNumber:raw.processNumber, court:raw.court,
    professionalRole:raw.professionalRole, context:raw.context?.legalContext || raw.context, examinedPerson:raw.examinedPerson?.name || raw.examinedPerson,
    object:raw.object || raw.context?.object, examinationDate:raw.examinationDate, reportDeadline:raw.reportDeadline
  });
  return {...migrated, sources:array(raw.sources), timeline:array(raw.timeline), questions:array(raw.questions), evidenceClaims:array(raw.evidenceClaims)};
}

export function touchCase(record) {
  const normalized = normalizeCaseRecord(record);
  normalized.metadata.updatedAt = new Date().toISOString();
  return normalized;
}

export function serializeCaseRecord(record) { return JSON.stringify(normalizeCaseRecord(record), null, 2); }
export function importCaseRecord(payload) {
  const raw = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo de caso inválido.');
  return normalizeCaseRecord(raw);
}
export { SCHEMA_VERSION };
