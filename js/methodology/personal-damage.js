export const CAUSAL_STATUS = Object.freeze({
  supported: 'supported',
  indeterminate: 'indeterminate',
  excluded: 'excluded',
  not_assessed: 'not_assessed'
});

export const AXIS_STATUS = Object.freeze({
  not_applicable: 'not_applicable',
  not_demonstrated: 'not_demonstrated',
  indeterminate: 'indeterminate',
  demonstrated: 'demonstrated'
});

const AXIS_STATUS_ALIASES = Object.freeze({
  'Não aplicável': AXIS_STATUS.not_applicable,
  'Não demonstrado': AXIS_STATUS.not_demonstrated,
  'Indeterminado': AXIS_STATUS.indeterminate,
  'Demonstrado': AXIS_STATUS.demonstrated,
  [AXIS_STATUS.not_applicable]: AXIS_STATUS.not_applicable,
  [AXIS_STATUS.not_demonstrated]: AXIS_STATUS.not_demonstrated,
  [AXIS_STATUS.indeterminate]: AXIS_STATUS.indeterminate,
  [AXIS_STATUS.demonstrated]: AXIS_STATUS.demonstrated
});

function hasValue(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' ? Boolean(value.trim()) : value !== null && value !== undefined;
}

function freezeResult(result) {
  return Object.freeze({
    ...result,
    blocks: Object.freeze([...(result.blocks || [])]),
    warnings: Object.freeze([...(result.warnings || [])])
  });
}

export function normalizeAxisStatus(value) {
  return AXIS_STATUS_ALIASES[String(value ?? '').trim()] || '';
}

export function evaluatePersonalDamageGate({
  objectDefined = false,
  damageDemonstrated = false,
  causalStatus = CAUSAL_STATUS.not_assessed,
  consolidationStatus = 'unknown'
} = {}) {
  const base = {
    causalStatus,
    canRecordClinicalFinding: Boolean(damageDemonstrated),
    canValueTemporary: false,
    canValuePermanent: false,
    blocks: [],
    warnings: []
  };

  if (!objectDefined) {
    return freezeResult({
      ...base,
      stage: 'object',
      blocks: ['Objeto pericial ainda não delimitado.'],
      nextStep: 'Delimite o objeto pericial antes de avançar.'
    });
  }

  if (!damageDemonstrated) {
    return freezeResult({
      ...base,
      stage: 'damage',
      blocks: ['Dano biológico atual não demonstrado.'],
      nextStep: 'Demonstre a existência do dano relevante ao objeto antes da valoração.'
    });
  }

  if (causalStatus === CAUSAL_STATUS.not_assessed) {
    return freezeResult({
      ...base,
      stage: 'causation',
      blocks: ['Nexo causal ainda não avaliado.'],
      nextStep: 'Avalie o nexo técnico-científico antes de atribuir consequências ao evento.'
    });
  }

  if (causalStatus === CAUSAL_STATUS.indeterminate) {
    return freezeResult({
      ...base,
      stage: 'causation',
      warnings: ['Nexo permanece indeterminado com os elementos disponíveis.'],
      nextStep: 'Registre a incerteza, as lacunas e as hipóteses concorrentes; não converta indeterminação em nexo afastado.'
    });
  }

  if (causalStatus === CAUSAL_STATUS.excluded) {
    return freezeResult({
      ...base,
      stage: 'causation',
      blocks: ['Nexo causal afastado para atribuição desta consequência ao evento.'],
      nextStep: 'Preserve o achado clínico no registro, sem valorá-lo como consequência atribuível ao evento.'
    });
  }

  if (causalStatus !== CAUSAL_STATUS.supported) {
    return freezeResult({
      ...base,
      stage: 'causation',
      blocks: ['Estado causal não reconhecido.'],
      nextStep: 'Classifique o nexo usando um estado causal válido.'
    });
  }

  if (consolidationStatus !== 'consolidated') {
    return freezeResult({
      ...base,
      stage: 'temporary',
      canValueTemporary: true,
      warnings: consolidationStatus === 'unknown'
        ? ['Consolidação médico-legal ainda não determinada.']
        : [],
      nextStep: 'Registre evolução e danos temporários; não valore sequelas permanentes definitivamente antes da consolidação.'
    });
  }

  return freezeResult({
    ...base,
    stage: 'permanent',
    canValueTemporary: true,
    canValuePermanent: true,
    nextStep: 'Identifique os eixos permanentes aplicáveis e use apenas os instrumentos pertinentes a cada constructo.'
  });
}

export function validateAxisValuation(axis = {}) {
  const status = normalizeAxisStatus(axis.status);
  const valuePresent = hasValue(axis.value);
  const referencePresent = hasValue(axis.reference) || hasValue(axis.method);
  const rationalePresent = hasValue(axis.rationale);
  const issues = [];

  if (!status) issues.push('Status do eixo não reconhecido.');

  if (valuePresent && !referencePresent) {
    issues.push('Quantificação ou graduação exige método ou referencial técnico declarado.');
  }

  const mode = valuePresent ? 'quantitative' : 'qualitative';

  if (status === AXIS_STATUS.demonstrated && !valuePresent && !rationalePresent) {
    issues.push('Conclusão qualitativa demonstrada exige fundamentação narrativa.');
  }

  return Object.freeze({
    ...axis,
    status,
    mode,
    valid: issues.length === 0,
    issues: Object.freeze(issues)
  });
}

export function composePersonalDamageSummary({ axes = [] } = {}) {
  const validatedAxes = axes.map(validateAxisValuation);
  const issues = validatedAxes.flatMap(axis => axis.issues.map(text => ({ axis: axis.axis, text })));

  return Object.freeze({
    valid: issues.length === 0,
    axes: Object.freeze(validatedAxes),
    issues: Object.freeze(issues),
    rule: 'Eixos independentes: não somar constructos heterogêneos em escore ou percentual global.'
  });
}
