import assert from 'node:assert/strict';
import { getApplicableProtocols, getProtocol, protocols } from '../js/methodology/protocols.js';
import { getContextualProtocolProfile } from '../js/methodology/context-resolver.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const fieldIds = protocol => protocol.steps.flatMap(step => step.fields || []).map(field => field.id);

test('Dano corporal resolve para protocolo específico, não fallback genérico', () => {
  const protocol = getProtocol('Dano corporal');
  assert.equal(protocol.id, 'bodily_damage');
  assert.equal(protocol, protocols.bodily_damage);
});

test('caso cível de dano corporal usa o protocolo corporal como principal', () => {
  const applicable = getApplicableProtocols({
    context: { matter: 'Dano corporal' },
    methodology: { activeProtocolIds: [] },
    scope: 'Avaliar dano corporal decorrente do evento.'
  });
  assert.deepEqual(applicable.map(item => item.id), ['bodily_damage']);
});

test('perfil contextual cível de dano corporal é explicitamente validado', () => {
  const profile = getContextualProtocolProfile({ context: { legalSphereId: 'civil', matterId: 'bodily_damage' } });
  assert.equal(profile.baseProtocolId, 'bodily_damage');
  assert.match(profile.title, /dano corporal|dano pessoal/i);
  assert.ok(profile.priorities.some(item => /nexo/i.test(item)));
  assert.ok(profile.cautions.some(item => /não.*som|independente/i.test(item)));
});

test('protocolo corporal obriga gates antes de eixos e mantém constructos separados', () => {
  const ids = fieldIds(protocols.bodily_damage);
  for (const required of [
    'personalDamageDamageStatus',
    'personalDamageCausalStatus',
    'personalDamageConsolidationStatus',
    'temporaryFunctionalTotal',
    'temporaryFunctionalPartial',
    'temporaryProfessional',
    'quantumDolorisSummary',
    'permanentFunctionalStatus',
    'permanentAestheticStatus',
    'permanentProfessionalStatus',
    'permanentLeisureStatus',
    'permanentSocialStatus',
    'permanentSexualStatus',
    'thirdPartyDependenceStatus',
    'personalDamageLimitations'
  ]) assert.ok(ids.includes(required), `campo obrigatório ausente: ${required}`);

  assert.equal(ids.some(id => /totalDamage|globalPercentage|overallDamage/i.test(id)), false,
    'o protocolo não pode criar escore global de dano');
});

test('protocolo corporal não usa culpa ou valor indenizatório como entrada médica', () => {
  const serialized = JSON.stringify(protocols.bodily_damage);
  assert.doesNotMatch(serialized, /culpa concorrente|valor indenizat[oó]rio|percentual de responsabilidade/i);
});

console.log('Bodily damage protocol regression suite completed successfully.');
