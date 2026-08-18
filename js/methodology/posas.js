export const POSAS_PATIENT_ITEMS = Object.freeze([
  Object.freeze({ id: 'pain', label: 'Dor', reference: 'Experiência referida na área definida' }),
  Object.freeze({ id: 'itch', label: 'Prurido', reference: 'Experiência referida na área definida' }),
  Object.freeze({ id: 'color', label: 'Cor', reference: 'Diferença percebida em relação à pele normal' }),
  Object.freeze({ id: 'stiffness', label: 'Rigidez', reference: 'Diferença percebida em relação à pele normal' }),
  Object.freeze({ id: 'thickness', label: 'Espessura', reference: 'Diferença percebida em relação à pele normal' }),
  Object.freeze({ id: 'irregularity', label: 'Irregularidade', reference: 'Diferença percebida da superfície/relevo' })
]);

export const POSAS_OBSERVER_ITEMS = Object.freeze([
  Object.freeze({ id: 'vascularity', label: 'Vascularidade', reference: 'Comparar componente vascular/vermelhidão com pele normal; branqueamento quando pertinente' }),
  Object.freeze({ id: 'pigmentation', label: 'Pigmentação', reference: 'Comparar alteração melânica com pele normal, reduzindo influência vascular quando necessário' }),
  Object.freeze({ id: 'thickness', label: 'Espessura', reference: 'Comparar espessura da cicatriz com pele normal adjacente' }),
  Object.freeze({ id: 'relief', label: 'Relevo', reference: 'Avaliar irregularidade da superfície' }),
  Object.freeze({ id: 'pliability', label: 'Maleabilidade', reference: 'Avaliar flexibilidade à palpação, preensão e mobilização' }),
  Object.freeze({ id: 'surface_area', label: 'Área superficial', reference: 'Comparar área cicatricial atual com a área de referência definida para o instrumento' })
]);

function validScore(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function numericScore(value) {
  if (typeof value === 'number') return validScore(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return validScore(parsed) ? parsed : null;
}

function normalizeGlobal(value) {
  return validScore(value) ? value : null;
}

export function scorePosasDomain(scores = []) {
  if (!Array.isArray(scores)) return Object.freeze({ valid: false, complete: false, total: null });
  const complete = scores.length === 6;
  const valid = complete && scores.every(validScore);
  return Object.freeze({
    valid,
    complete,
    total: valid ? scores.reduce((sum, value) => sum + value, 0) : null
  });
}

function domainFromObject(items, values = {}, globalValue) {
  const scores = items.map(item => values?.[item.id]);
  const scored = scorePosasDomain(scores);
  return Object.freeze({
    items: Object.freeze(items.map((item, index) => Object.freeze({ ...item, score: validScore(scores[index]) ? scores[index] : null }))),
    valid: scored.valid,
    complete: scored.complete,
    total: scored.total,
    global: normalizeGlobal(globalValue)
  });
}

export function buildPosasAssessment({
  area = '',
  selectionCriterion = '',
  patientScores = {},
  observerScores = {},
  patientGlobal = null,
  observerGlobal = null,
  spontaneousObservation = ''
} = {}) {
  return Object.freeze({
    construct: 'scar_quality',
    instrument: 'POSAS 2.0',
    area: String(area || '').trim(),
    selectionCriterion: String(selectionCriterion || '').trim(),
    patient: domainFromObject(POSAS_PATIENT_ITEMS, patientScores, patientGlobal),
    observer: domainFromObject(POSAS_OBSERVER_ITEMS, observerScores, observerGlobal),
    spontaneousObservation: String(spontaneousObservation || '').trim(),
    rule: 'Patient e Observer permanecem independentes; opinião global fica separada; POSAS não é pontuação de dano estético e não substitui exame tátil por fotografia.'
  });
}

export function buildPosasAssessmentFromGuided(guided = {}) {
  const patientScores = Object.fromEntries(POSAS_PATIENT_ITEMS.map(item => [item.id, numericScore(guided[`posasPatient_${item.id}`])]));
  const observerScores = Object.fromEntries(POSAS_OBSERVER_ITEMS.map(item => [item.id, numericScore(guided[`posasObserver_${item.id}`])]));
  return buildPosasAssessment({
    area: guided.posasArea,
    selectionCriterion: guided.posasSelectionCriterion,
    patientScores,
    observerScores,
    patientGlobal: numericScore(guided.posasPatientGlobal),
    observerGlobal: numericScore(guided.posasObserverGlobal),
    spontaneousObservation: guided.posasPatientObservation
  });
}
