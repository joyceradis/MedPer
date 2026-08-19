import assert from 'node:assert/strict';
import { resolveFunctionalBaremaTrack } from '../js/methodology/barema-routing.js';

const result = resolveFunctionalBaremaTrack({ regimeId: 'insurance_dpvat' });

assert.match(result.rationale, /DPVAT|seguro obrigatório/i,
  'o rationale do regime insurance_dpvat deve nomear o trilho específico');
assert.doesNotMatch(result.rationale, /equivalente/i,
  'insurance_dpvat não pode reintroduzir a ambiguidade "DPVAT ou equivalente" pelo rationale');

console.log('Barema routing rationale regression completed successfully.');
