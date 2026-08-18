import assert from 'node:assert/strict';
import { normalizeCase } from '../js/core/store.js';
import { evaluatePersonalDamageCase } from '../js/methodology/personal-damage.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function roundTrip(value) {
  return JSON.parse(JSON.stringify(value));
}

test('estado estruturado de dano pessoal sobrevive normalizeCase + JSON round-trip', () => {
  const original = normalizeCase({
    id: 'case_pd_1',
    title: 'Dano corporal',
    context: { matter: 'Dano corporal', sphere: 'Judicial', branch: 'Cível' },
    scope: 'Apurar dano corporal decorrente do evento.',
    methodology: {
      guided: {
        personalDamageDamageStatus: 'Sim',
        personalDamageCausalStatus: 'Nexo sustentado',
        personalDamageConsolidationStatus: 'Consolidado',
        permanentFunctionalStatus: 'Demonstrado',
        permanentAestheticStatus: 'Demonstrado'
      },
      specific: {
        personalDamageDamageBasis: 'Dano documentado nos autos e confirmado ao exame.',
        personalDamageCausalBasis: 'Compatibilidade temporal, topográfica e mecanística convergente.',
        functionalReference: 'Tabela Brasileira — item rastreável',
        functionalValuation: '31%',
        aestheticReference: 'AIPE Brasil',
        aestheticValuation: '42/50',
        personalDamageLimitations: 'Nexo auditivo não demonstrável com os elementos disponíveis.'
      }
    }
  });

  const restored = normalizeCase(roundTrip(original));
  assert.equal(restored.methodology.guided.personalDamageCausalStatus, 'Nexo sustentado');
  assert.equal(restored.methodology.guided.permanentFunctionalStatus, 'Demonstrado');
  assert.equal(restored.methodology.specific.functionalValuation, '31%');
  assert.equal(restored.methodology.specific.aestheticValuation, '42/50');
  assert.match(restored.methodology.specific.personalDamageLimitations, /auditivo/i);
  assert.equal(evaluatePersonalDamageCase(restored).canValuePermanent, true);
});

test('persistência não exige colunas SQL por constructo: o payload mantém ids estáveis', () => {
  const caseData = normalizeCase({
    context: { matter: 'Dano corporal' },
    methodology: {
      guided: { personalDamageCausalStatus: 'Indeterminado' },
      specific: { personalDamageCausalBasis: 'Documentação intermediária insuficiente.' }
    }
  });
  const payload = roundTrip(caseData);
  assert.equal(payload.methodology.guided.personalDamageCausalStatus, 'Indeterminado');
  assert.equal(payload.methodology.specific.personalDamageCausalBasis, 'Documentação intermediária insuficiente.');
});

console.log('Personal damage persistence regression suite completed successfully.');
