export const DAMAGE_SOURCE_VERSION = '1.5';

export const DAMAGE_SOURCE_TABS = Object.freeze({
  guided: 'Roteiro Guiado',
  temporary: 'Danos Temporários',
  functional: 'Calculadora de Balthazard',
  aesthetic: 'AIPE — Brasil',
  scarQuality: 'POSAS 2.0',
  repercussions: 'Repercussões e Dor',
  integration: 'Integração Pericial'
});

function toUtcDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateTemporaryDays(start, end) {
  const initial = toUtcDate(start);
  const final = toUtcDate(end);
  if (!initial || !final || final < initial) return null;
  return Math.floor((final - initial) / 86400000) + 1;
}

function validFraction(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function combineRemainingCapacity(deficits = []) {
  if (!Array.isArray(deficits) || deficits.some(value => !validFraction(value))) {
    return Object.freeze({ valid: false, impacts: Object.freeze([]), remaining: null, deficit: null });
  }

  let remaining = 1;
  const impacts = deficits.map(value => {
    const impact = value * remaining;
    remaining -= impact;
    return impact;
  });

  return Object.freeze({
    valid: true,
    impacts: Object.freeze(impacts),
    remaining,
    deficit: 1 - remaining
  });
}

export function isolateIncrementFromPriorState(globalCurrentDeficit, priorFunctionalDeficit) {
  if (!validFraction(globalCurrentDeficit) || !validFraction(priorFunctionalDeficit)) return null;
  if (priorFunctionalDeficit >= 1 || globalCurrentDeficit < priorFunctionalDeficit) return null;
  return (globalCurrentDeficit - priorFunctionalDeficit) / (1 - priorFunctionalDeficit);
}

export const INTERNAL_DAMAGE_SOURCE_RULES = Object.freeze({
  scope: 'Avaliação médico-legal do dano pessoal/corporal',
  gateOrder: Object.freeze(['object', 'damage', 'causation', 'consolidation']),
  temporary: Object.freeze({
    inclusiveDayCount: true,
    cautions: Object.freeze([
      'Tempo de tratamento não equivale automaticamente a incapacidade.',
      'Alta hospitalar não equivale necessariamente a consolidação.',
      'Retorno ao trabalho não exclui sequela.',
      'Períodos sobrepostos não devem ser somados em duplicidade.'
    ])
  }),
  functional: Object.freeze({
    combinationRule: 'remaining_capacity',
    inverseRule: 'D = (F - Ea) / (1 - Ea)',
    cautions: Object.freeze([
      'Aplicar apenas a déficits funcionais independentes quando o referencial aplicável autorizar combinação pela capacidade restante.',
      'Estado anterior funcional quantificável não é sinônimo de concausa.',
      'Não converter predisposição, agravamento, culpa ou responsabilidade jurídica em percentual funcional.'
    ])
  }),
  integration: Object.freeze({
    heterogeneousConstructsRemainSeparate: true,
    globalDamageScoreAllowed: false
  })
});
