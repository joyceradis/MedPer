import assert from 'node:assert/strict';
import * as protocolModule from '../js/methodology/protocols.js';
import { auditCase, completion } from '../js/methodology/engine.js';

let aipeModule = null;
let aipeImportError = null;
try {
  aipeModule = await import('../js/methodology/aipe.js');
} catch (error) {
  aipeImportError = error;
}

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('exports an adaptive protocol resolver', () => {
  assert.equal(typeof protocolModule.getApplicableProtocols, 'function');
  assert.equal(typeof protocolModule.getSuggestedProtocolIds, 'function');
});

test('resolves protocols by stable id independently from the visible legacy matter label', () => {
  assert.equal(protocolModule.protocols.aesthetic?.id, 'aesthetic');
  assert.equal(
    protocolModule.getProtocol('aesthetic'),
    protocolModule.getProtocol('Dano estético')
  );
});

test('keeps the primary matter as the first applicable protocol', () => {
  const resolved = protocolModule.getApplicableProtocols({
    context: { matter: 'Dano estético' },
    methodology: { activeProtocolIds: [] },
    scope: ''
  });

  assert.deepEqual(resolved.map(protocol => protocol.id), ['aesthetic']);
});

test('adds explicit physician-selected protocols without duplicating the primary protocol', () => {
  const resolved = protocolModule.getApplicableProtocols({
    context: { matter: 'Dano estético' },
    methodology: { activeProtocolIds: ['causation', 'aesthetic'] },
    scope: ''
  });

  assert.deepEqual(resolved.map(protocol => protocol.id), ['aesthetic', 'causation']);
});

test('suggests another protocol conservatively from the pericial object', () => {
  const caseData = {
    context: { matter: 'Dano estético' },
    methodology: { activeProtocolIds: [] },
    scope: 'Avaliar a cicatriz facial e verificar eventual nexo causal com o acidente.'
  };

  assert.deepEqual(protocolModule.getSuggestedProtocolIds(caseData), ['causation']);
  assert.deepEqual(
    protocolModule.getApplicableProtocols(caseData).map(protocol => protocol.id),
    ['aesthetic', 'causation']
  );
});

test('respects a physician dismissal of an automatic protocol suggestion', () => {
  const caseData = {
    context: { matter: 'Dano estético' },
    methodology: { activeProtocolIds: [], dismissedProtocolIds: ['causation'] },
    scope: 'Avaliar dano estético e eventual nexo causal.'
  };

  assert.deepEqual(protocolModule.getSuggestedProtocolIds(caseData), []);
  assert.deepEqual(
    protocolModule.getApplicableProtocols(caseData).map(protocol => protocol.id),
    ['aesthetic']
  );
});

test('retains a generic fallback for an unsupported primary matter', () => {
  const resolved = protocolModule.getApplicableProtocols({
    context: { matter: 'Dano corporal' },
    methodology: {},
    scope: ''
  });

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].id, 'generic');
});

test('audits an additional causation protocol in the same case', () => {
  const result = auditCase({
    context: { matter: 'Dano estético', mode: 'Documental' },
    scope: '',
    methodology: {
      activeProtocolIds: ['causation'],
      general: {},
      guided: {},
      specific: {},
      decision: {}
    }
  });

  assert.equal(
    result.issues.some(issue => issue.text.includes('Evento ou exposição')),
    true
  );
});

test('reports completion independently for every applicable protocol', () => {
  const result = completion({
    context: { matter: 'Dano estético' },
    scope: '',
    methodology: {
      activeProtocolIds: ['causation'],
      general: {},
      guided: {},
      specific: {}
    }
  });

  assert.equal(Array.isArray(result.specificByProtocol.aesthetic), true);
  assert.equal(Array.isArray(result.specificByProtocol.causation), true);
});

test('loads a dedicated AIPE reference domain', () => {
  assert.equal(aipeImportError, null);
  assert.equal(Array.isArray(aipeModule.AIPE_CATEGORIES), true);
});

test('AIPE categories cover every point from 0 through 50 without gaps', () => {
  const covered = aipeModule.AIPE_CATEGORIES.flatMap(category => {
    const [min, max] = category.range;
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  });

  assert.deepEqual(covered, Array.from({ length: 51 }, (_, index) => index));
});

test('AIPE exposes the five impression criteria used by the existing method', () => {
  assert.deepEqual(
    aipeModule.AIPE_CRITERIA.map(criterion => criterion.id),
    ['visual', 'gaze', 'memory', 'emotion', 'relation']
  );
});

console.log('Methodology regression suite completed successfully.');
