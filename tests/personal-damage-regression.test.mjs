import assert from 'node:assert/strict';
import {
  AXIS_STATUS,
  CAUSAL_STATUS,
  composePersonalDamageSummary,
  evaluatePersonalDamageCase,
  evaluatePersonalDamageGate,
  getVisiblePersonalDamageStepIds,
  normalizeAxisStatus,
  validateAxisValuation
} from '../js/methodology/personal-damage.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('sem objeto pericial definido, o motor bloqueia antes de qualquer valoração', () => {
  const result = evaluatePersonalDamageGate({
    objectDefined: false,
    damageDemonstrated: true,
    causalStatus: CAUSAL_STATUS.supported,
    consolidationStatus: 'consolidated'
  });
  assert.equal(result.stage, 'object');
  assert.equal(result.canValueTemporary, false);
  assert.equal(result.canValuePermanent, false);
  assert.match(result.nextStep, /objeto/i);
});

test('sem dano demonstrável, o motor não abre valoração', () => {
  const result = evaluatePersonalDamageGate({
    objectDefined: true,
    damageDemonstrated: false,
    causalStatus: CAUSAL_STATUS.supported,
    consolidationStatus: 'consolidated'
  });
  assert.equal(result.stage, 'damage');
  assert.equal(result.canValueTemporary, false);
  assert.equal(result.canValuePermanent, false);
});

test('nexo não avaliado mantém o caso na etapa causal', () => {
  const result = evaluatePersonalDamageGate({
    objectDefined: true,
    damageDemonstrated: true,
    causalStatus: CAUSAL_STATUS.not_assessed,
    consolidationStatus: 'consolidated'
  });
  assert.equal(result.stage, 'causation');
  assert.equal(result.canValuePermanent, false);
});

test('nexo indeterminado não é convertido em nexo afastado', () => {
  const result = evaluatePersonalDamageGate({
    objectDefined: true,
    damageDemonstrated: true,
    causalStatus: CAUSAL_STATUS.indeterminate,
    consolidationStatus: 'consolidated'
  });
  assert.equal(result.causalStatus, CAUSAL_STATUS.indeterminate);
  assert.notEqual(result.causalStatus, CAUSAL_STATUS.excluded);
  assert.equal(result.canValuePermanent, false);
  assert.match(result.nextStep, /incerteza|indetermin/i);
});

test('nexo afastado preserva o achado clínico mas bloqueia valoração atribuível ao evento', () => {
  const result = evaluatePersonalDamageGate({
    objectDefined: true,
    damageDemonstrated: true,
    causalStatus: CAUSAL_STATUS.excluded,
    consolidationStatus: 'consolidated'
  });
  assert.equal(result.stage, 'causation');
  assert.equal(result.canRecordClinicalFinding, true);
  assert.equal(result.canValueTemporary, false);
  assert.equal(result.canValuePermanent, false);
});

test('nexo sustentado sem consolidação abre temporários e bloqueia permanentes definitivos', () => {
  const result = evaluatePersonalDamageGate({
    objectDefined: true,
    damageDemonstrated: true,
    causalStatus: CAUSAL_STATUS.supported,
    consolidationStatus: 'not_consolidated'
  });
  assert.equal(result.stage, 'temporary');
  assert.equal(result.canValueTemporary, true);
  assert.equal(result.canValuePermanent, false);
  assert.match(result.nextStep, /tempor|evolu/i);
});

test('nexo sustentado e consolidação permitem temporários históricos e eixos permanentes', () => {
  const result = evaluatePersonalDamageGate({
    objectDefined: true,
    damageDemonstrated: true,
    causalStatus: CAUSAL_STATUS.supported,
    consolidationStatus: 'consolidated'
  });
  assert.equal(result.stage, 'permanent');
  assert.equal(result.canValueTemporary, true);
  assert.equal(result.canValuePermanent, true);
});

test('adapter lê os ids persistidos do protocolo corporal sem depender dos rótulos da UI', () => {
  const result = evaluatePersonalDamageCase({
    scope: 'Apurar dano corporal decorrente do evento.',
    methodology: {
      general: { object: 'Apurar dano corporal decorrente do evento.' },
      guided: {
        personalDamageDamageStatus: 'Sim',
        personalDamageCausalStatus: 'Nexo sustentado',
        personalDamageConsolidationStatus: 'Não consolidado'
      }
    }
  });
  assert.equal(result.stage, 'temporary');
  assert.equal(result.canValueTemporary, true);
  assert.equal(result.canValuePermanent, false);
});

test('progressive disclosure mostra só gates antes da elegibilidade', () => {
  const gate = evaluatePersonalDamageCase({ methodology: { general: {}, guided: {} } });
  assert.deepEqual(getVisiblePersonalDamageStepIds(gate), ['gates']);
});

test('progressive disclosure abre temporários mas mantém permanentes ocultos antes da consolidação', () => {
  const gate = evaluatePersonalDamageCase({
    scope: 'Avaliar dano corporal.',
    methodology: {
      general: { object: 'Avaliar dano corporal.' },
      guided: {
        personalDamageDamageStatus: 'Sim',
        personalDamageCausalStatus: 'Nexo sustentado',
        personalDamageConsolidationStatus: 'Não consolidado'
      }
    }
  });
  assert.deepEqual(getVisiblePersonalDamageStepIds(gate), ['gates', 'temporary']);
});

test('progressive disclosure abre todos os eixos apenas após consolidação', () => {
  const gate = evaluatePersonalDamageCase({
    scope: 'Avaliar dano corporal.',
    methodology: {
      general: { object: 'Avaliar dano corporal.' },
      guided: {
        personalDamageDamageStatus: 'Sim',
        personalDamageCausalStatus: 'Nexo sustentado',
        personalDamageConsolidationStatus: 'Consolidado'
      }
    }
  });
  assert.deepEqual(getVisiblePersonalDamageStepIds(gate), [
    'gates', 'temporary', 'permanent_axes', 'functional', 'aesthetic_scar', 'repercussions', 'integration'
  ]);
});

test('status de eixo é normalizado por id estável e falha fechado para texto desconhecido', () => {
  assert.equal(normalizeAxisStatus('Demonstrado'), AXIS_STATUS.demonstrated);
  assert.equal(normalizeAxisStatus('Indeterminado'), AXIS_STATUS.indeterminate);
  assert.equal(normalizeAxisStatus('Não demonstrado'), AXIS_STATUS.not_demonstrated);
  assert.equal(normalizeAxisStatus('Não aplicável'), AXIS_STATUS.not_applicable);
  assert.equal(normalizeAxisStatus('demonstrated'), AXIS_STATUS.demonstrated);
  assert.equal(normalizeAxisStatus('qualquer outra coisa'), '');
});

test('quantificação ou graduação exige método/referencial declarado', () => {
  const invalid = validateAxisValuation({
    axis: 'functional',
    status: AXIS_STATUS.demonstrated,
    value: 31,
    reference: ''
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.some(issue => /referencial|m[eé]todo/i.test(issue)));

  const valid = validateAxisValuation({
    axis: 'functional',
    status: AXIS_STATUS.demonstrated,
    value: 31,
    reference: 'Tabela Brasileira — item documentado'
  });
  assert.equal(valid.valid, true);
});

test('conclusão qualitativa pode ser válida sem inventar número', () => {
  const result = validateAxisValuation({
    axis: 'professional',
    status: AXIS_STATUS.demonstrated,
    value: '',
    reference: '',
    rationale: 'Há interferência concreta nas tarefas essenciais, sustentada pelos elementos descritos.'
  });
  assert.equal(result.valid, true);
  assert.equal(result.mode, 'qualitative');
});

test('AIPE, POSAS, funcional, dor e repercussões permanecem eixos independentes sem total global', () => {
  const summary = composePersonalDamageSummary({
    axes: [
      { axis: 'functional', status: AXIS_STATUS.demonstrated, value: 31, reference: 'Tabela Brasileira' },
      { axis: 'aesthetic', status: AXIS_STATUS.demonstrated, value: 42, reference: 'AIPE Brasil' },
      { axis: 'scar_quality_patient', status: AXIS_STATUS.demonstrated, value: 38, reference: 'POSAS 2.0' },
      { axis: 'quantum_doloris', status: AXIS_STATUS.demonstrated, value: '', reference: '', rationale: 'Sofrimento documentado.' }
    ]
  });
  assert.equal(summary.axes.length, 4);
  assert.equal('totalDamage' in summary, false);
  assert.equal('globalPercentage' in summary, false);
  assert.equal('total' in summary, false);
  assert.equal(summary.axes.find(x => x.axis === 'functional').value, 31);
  assert.equal(summary.axes.find(x => x.axis === 'aesthetic').value, 42);
});

test('o resumo rejeita eixo quantitativo sem referencial em vez de somar ou corrigir silenciosamente', () => {
  const summary = composePersonalDamageSummary({
    axes: [{ axis: 'aesthetic', status: AXIS_STATUS.demonstrated, value: 40, reference: '' }]
  });
  assert.equal(summary.valid, false);
  assert.equal(summary.axes[0].valid, false);
});

console.log('Personal damage engine regression suite completed successfully.');
