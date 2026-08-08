import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mod = await import('../js/knowledge/library.js');
const {
  KNOWLEDGE_SOURCES,
  REFERENCE_DIVERGENCES,
  getRelevantKnowledge,
  getRelevantDivergences,
  getRelevantSources
} = mod;

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const aestheticCase = {
  title: 'Cicatriz facial após queimadura',
  context: { matter: 'Dano estético' },
  scope: 'Avaliar dano estético permanente e consolidação.',
  facts: [{ text: 'Queimadura facial com cicatriz residual.' }],
  evidence: [],
  events: [],
  methodology: { general: {}, activeProtocolIds: [] }
};

test('deduplicates the two uploaded ABMLPM guideline files into one canonical source', () => {
  const guidelines = KNOWLEDGE_SOURCES.filter(source => source.id === 'abmlpm-dano-pessoal-2025');
  assert.equal(guidelines.length, 1);
  assert.equal(guidelines[0].aliases.length, 2);
});

test('classifies every source by nature, authority, version, scope and topic', () => {
  for (const source of KNOWLEDGE_SOURCES) {
    assert.ok(source.nature, source.id);
    assert.ok(source.authority, source.id);
    assert.ok(source.version, source.id);
    assert.ok(source.scope, source.id);
    assert.ok(source.topics?.length, source.id);
    assert.ok(source.classes?.length, source.id);
  }
});

test('does not misclassify any attached document as a binding norm', () => {
  assert.equal(KNOWLEDGE_SOURCES.some(source => source.classes.includes('binding-norm')), false);
});

test('surfaces AIPE, aesthetic damage and ABMLPM references for an aesthetic case', () => {
  const ids = getRelevantSources(aestheticCase, { stageId: 'method' }).map(source => source.id);
  assert.ok(ids.includes('aipe-brasil-2016'));
  assert.ok(ids.includes('dano-estetico-imesc-2017'));
  assert.ok(ids.includes('abmlpm-dano-pessoal-2025'));
});

test('adds the burns teaching material when burn terminology is present', () => {
  const ids = getRelevantSources(aestheticCase, { stageId: 'timeline' }).map(source => source.id);
  assert.ok(ids.includes('queimados-aguda-aula'));
});

test('does not surface burn material for an unrelated incapacity case', () => {
  const caseData = {
    context: { matter: 'Incapacidade' },
    scope: 'Avaliar capacidade laborativa após lombalgia.',
    facts: [{ text: 'Limitação funcional lombar.' }],
    evidence: [], events: [], methodology: { general: {} }
  };
  const ids = getRelevantSources(caseData, { stageId: 'method' }).map(source => source.id);
  assert.ok(!ids.includes('queimados-aguda-aula'));
  assert.ok(ids.includes('abmlpm-dano-pessoal-2025'));
  assert.ok(ids.includes('rpdc-dano-corporal-brasil-2011'));
});

test('stage filtering prefers knowledge that is useful at the current cognitive step', () => {
  const timelineItems = getRelevantKnowledge(aestheticCase, { stageId: 'timeline' });
  assert.ok(timelineItems.some(item => item.id === 'burn-evolution-reference'));
  assert.ok(!timelineItems.some(item => item.id === 'aipe-four-frames'));

  const methodItems = getRelevantKnowledge(aestheticCase, { stageId: 'method' });
  assert.ok(methodItems.some(item => item.id === 'aipe-four-frames'));
});

test('every surfaced knowledge item keeps a source and a precise locator', () => {
  const items = getRelevantKnowledge(aestheticCase, { stageId: 'method' });
  assert.ok(items.length > 0);
  for (const item of items) {
    assert.ok(KNOWLEDGE_SOURCES.some(source => source.id === item.sourceId), item.id);
    assert.ok(item.locator, item.id);
    assert.match(item.locator, /\.pdf|\.pptx/i, item.id);
    assert.match(item.locator, /p\.|pp\.|slide/i, item.id);
    assert.ok(item.purpose, item.id);
    assert.ok(item.limitation, item.id);
  }
});

test('keeps conflicting aesthetic scales explicit instead of resolving them', () => {
  const divergence = REFERENCE_DIVERGENCES.find(entry => entry.id === 'aesthetic-scale-models');
  assert.ok(divergence);
  assert.ok(divergence.sourceIds.includes('abmlpm-dano-pessoal-2025'));
  assert.ok(divergence.sourceIds.includes('aipe-brasil-2016'));
  const visible = getRelevantDivergences(aestheticCase, { stageId: 'method' });
  assert.ok(visible.some(entry => entry.id === divergence.id));
  assert.match(divergence.handling, /n[aã]o converter|sem convers[aã]o/i);
});

test('records the published AIPE extreme-row inconsistency without silently correcting it', () => {
  const divergence = REFERENCE_DIVERGENCES.find(entry => entry.id === 'aipe-published-extreme-row');
  assert.ok(divergence);
  assert.match(divergence.description, /31–50/);
  assert.match(divergence.description, /25, 26, 27–28, 29 e 30/);
  assert.match(divergence.handling, /n[aã]o corrigir/i);
});

test('keeps the reference layer outside the methodological decision engine', () => {
  const engine = readFileSync(new URL('../js/methodology/engine.js', import.meta.url), 'utf8');
  const protocols = readFileSync(new URL('../js/methodology/protocols.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /knowledge\//i);
  assert.doesNotMatch(protocols, /knowledge\//i);
  assert.equal(getRelevantKnowledge(aestheticCase, { stageId: 'conclusion' }).length, 0);
});

console.log('Knowledge regression suite completed successfully.');
