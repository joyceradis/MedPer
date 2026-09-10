import assert from 'node:assert/strict';
import { createCaseRecord, normalizeCaseRecord, serializeCaseRecord, importCaseRecord } from '../js/v2/case-record.js';
import { routeMethodology } from '../js/v2/method-router.js';
import { composeCaseDocument } from '../js/v2/document.js';

const fresh = createCaseRecord({
  title: 'Queimadura — dano estético',
  processNumber: '0001234-56.2026.8.08.0035',
  court: '1ª Vara Cível de Vila Velha/ES',
  professionalRole: 'perita_judicial',
  context: 'civel',
  examinedPerson: 'Pessoa examinada',
  object: 'Avaliação de dano estético decorrente de queimadura',
  reportDeadline: '2026-10-10'
});

assert.equal(fresh.schemaVersion, 2);
assert.ok(fresh.id);
assert.equal(fresh.identity.title, 'Queimadura — dano estético');
assert.equal(fresh.context.legalContext, 'civel');
assert.equal(fresh.examinedPerson.name, 'Pessoa examinada');
assert.deepEqual(fresh.sources, []);
assert.deepEqual(fresh.timeline, []);
assert.deepEqual(fresh.questions, []);

const aesthetic = routeMethodology(fresh);
assert.equal(aesthetic.some(item => item.id === 'aipe'), true);
assert.equal(aesthetic.some(item => item.id === 'posas'), true);
assert.equal(aesthetic.some(item => item.id === 'causal-link'), false);

const incapacity = createCaseRecord({ title:'Incapacidade', context:'previdenciario', object:'incapacidade laborativa e capacidade residual' });
const incapacityRoutes = routeMethodology(incapacity).map(item => item.id);
assert.equal(incapacityRoutes.includes('functional-capacity'), true);
assert.equal(incapacityRoutes.includes('temporary-damage'), true);

const nexus = createCaseRecord({ title:'Nexo', context:'trabalhista', object:'nexo causal entre acidente e lesão' });
assert.equal(routeMethodology(nexus).some(item => item.id === 'causal-link'), true);

fresh.sources.push({ id:'src-1', type:'prontuario', title:'Prontuário hospitalar', date:'2016-02-20', origin:'hospital', notes:'Registro de queimadura extensa.' });
fresh.timeline.push({ id:'evt-1', date:'2016-02-20', title:'Atendimento inicial', description:'Admissão hospitalar.', sourceIds:['src-1'], certainty:'documentado' });
fresh.history.summary = 'História clínica pertinente ao objeto.';
fresh.examination.summary = 'Cicatrizes visíveis em face e pescoço.';
fresh.analysis.medicoLegalQuestion = 'Existe dano estético permanente?';
fresh.analysis.reasoning = 'Os achados documentados são compatíveis com sequela cicatricial permanente.';
fresh.conclusion.summary = 'Há dano estético permanente, conforme fundamentação acima.';
fresh.questions.push({ id:'q-1', question:'Há dano estético?', answer:'Sim, nos termos da conclusão.' });

const serialized = serializeCaseRecord(fresh);
const imported = importCaseRecord(serialized);
assert.equal(imported.identity.processNumber, fresh.identity.processNumber);
assert.equal(imported.sources.length, 1);
assert.equal(imported.timeline[0].sourceIds[0], 'src-1');
assert.equal(imported.schemaVersion, 2);

const legacyLike = normalizeCaseRecord({ title:'Legado', object:'dano estético' });
assert.equal(legacyLike.identity.title, 'Legado');
assert.equal(legacyLike.schemaVersion, 2);

const html = composeCaseDocument(fresh);
assert.match(html, /Queimadura — dano estético/);
assert.match(html, /Prontuário hospitalar/);
assert.match(html, /Atendimento inicial/);
assert.match(html, /Existe dano estético permanente\?/);
assert.match(html, /Há dano estético permanente/);
assert.doesNotMatch(html, /Lorem ipsum|conteúdo gerado automaticamente/i);

console.log('MedPer V2 core regression: ok');
