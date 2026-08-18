import assert from 'node:assert/strict';
import {
  POSAS_PATIENT_ITEMS,
  POSAS_OBSERVER_ITEMS,
  scorePosasDomain,
  buildPosasAssessment
} from '../js/methodology/posas.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('POSAS mantém seis itens do Patient e seis do Observer em domínios independentes', () => {
  assert.deepEqual(POSAS_PATIENT_ITEMS.map(item => item.id), ['pain','itch','color','stiffness','thickness','irregularity']);
  assert.deepEqual(POSAS_OBSERVER_ITEMS.map(item => item.id), ['vascularity','pigmentation','thickness','relief','pliability','surface_area']);
});

test('cada domínio só totaliza quando os seis escores 1–10 estão completos', () => {
  assert.equal(scorePosasDomain([1,2,3,4,5,6]).total, 21);
  assert.equal(scorePosasDomain([1,2,3,4,5]).total, null);
  assert.equal(scorePosasDomain([1,2,3,4,5,11]).valid, false);
  assert.equal(scorePosasDomain([0,2,3,4,5,6]).valid, false);
});

test('Patient e Observer nunca são somados entre si e opinião global fica separada', () => {
  const result = buildPosasAssessment({
    area: 'cicatriz cervical anterior',
    patientScores: { pain:1, itch:2, color:3, stiffness:4, thickness:5, irregularity:6 },
    observerScores: { vascularity:2, pigmentation:2, thickness:2, relief:2, pliability:2, surface_area:2 },
    patientGlobal: 7,
    observerGlobal: 4
  });

  assert.equal(result.patient.total, 21);
  assert.equal(result.observer.total, 12);
  assert.equal(result.patient.global, 7);
  assert.equal(result.observer.global, 4);
  assert.equal('total' in result, false);
  assert.equal('combinedTotal' in result, false);
});

test('POSAS permanece qualidade cicatricial e não produz pontuação de dano estético', () => {
  const result = buildPosasAssessment({ area: 'cicatriz' });
  assert.equal(result.construct, 'scar_quality');
  assert.equal(result.aestheticDamageScore, undefined);
  assert.match(result.rule, /não.*dano estético|independentes/i);
});

console.log('POSAS regression suite completed successfully.');
