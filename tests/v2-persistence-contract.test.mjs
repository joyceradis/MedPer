import assert from 'node:assert/strict';
import test from 'node:test';
import { CaseRepository } from '../js/v2/repository.js';
import { createCaseRecord } from '../js/v2/case-record.js';

test('persistência V2 local: round-trip de caso fictício, exportação e reimportação', async () => {
  const content = new Map();
  const previous = { indexedDB: globalThis.indexedDB, localStorage: globalThis.localStorage };
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback() } } });
  try {
    delete globalThis.indexedDB;
    globalThis.localStorage = {
      getItem: key => content.has(key) ? content.get(key) : null,
      setItem: (key, value) => { content.set(key, value); },
      removeItem: key => content.delete(key)
    };

    const repository = new CaseRepository();
    const original = createCaseRecord({ title: 'Caso sintético — teste', object: 'Finalidade fictícia' });
    original.sources.push({ id: 'src1', title: 'Documento fictício' });
    original.timeline.push({ id: 'event1', sourceIds: ['src1'], title: 'Marco fictício' });
    original.history.summary = 'Texto narrativo sintético'.repeat(400);
    original.evidenceClaims.push({ id: 'ev1', sourceIds: ['src1'], statement: 'Fato sintético' });
    original.questions.push({ id: 'q1', question: 'Pergunta fictícia', answer: 'Resposta fictícia' });
    original.conclusion.summary = 'Conclusão escrita apenas pelo teste.';

    await repository.save(original);
    const recovered = await repository.get(original.id);
    assert.equal(recovered?.history.summary, original.history.summary);
    assert.deepEqual(recovered?.timeline[0].sourceIds, ['src1']);
    assert.deepEqual(recovered?.evidenceClaims[0].sourceIds, ['src1']);
    assert.equal(recovered?.questions[0].answer, 'Resposta fictícia');

    const backup = await repository.export(original.id);
    await assert.rejects(repository.import(backup), /Já existe um caso/);
    assert.equal((await repository.get(original.id)).history.summary, original.history.summary,
      'Importação com ID duplicado não deve sobrescrever caso existente');
    await repository.remove(original.id);
    const restored = await repository.import(backup);
    assert.equal(restored.id, original.id);
    assert.equal(restored.conclusion.summary, original.conclusion.summary);

    const before = content.get('medper:v2:cases');
    await assert.rejects(repository.import(JSON.stringify({
      id: original.id,
      title: 'Formato legado não validado',
      methodology: { general: { object: 'Não descartar em silêncio' } }
    })), /incompatível|não suportado|versionado/i);
    assert.equal(content.get('medper:v2:cases'), before, 'Falha de importação não altera caso existente');

    globalThis.localStorage.setItem = () => {
      const error = new Error('Storage quota exceeded');
      error.name = 'QuotaExceededError';
      throw error;
    };
    const changed = { ...recovered, identity: { ...recovered.identity, title: 'Edição não salva' } };
    await assert.rejects(repository.save(changed), /Storage quota exceeded/);
    assert.equal((await repository.get(original.id)).identity.title, 'Caso sintético — teste');
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (previous.indexedDB === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previous.indexedDB;
    if (previous.localStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous.localStorage;
  }
});
