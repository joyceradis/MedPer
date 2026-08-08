import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createStore } from '../js/core/store.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

const compatibilityRoutes = new Map([
  ['casos/index.html', '../app.html#/dashboard/cases'],
  ['casos/caso.html', '../app.html#/dashboard/cases'],
  ['pages/fontes.html', '../app.html#/dashboard/references'],
  ['pages/delimitacao.html', '../app.html#/dashboard/cases'],
  ['pages/cronologia.html', '../app.html#/dashboard/cases'],
  ['pages/exame.html', '../app.html#/dashboard/cases'],
  ['pages/raciocinio.html', '../app.html#/dashboard/cases'],
  ['pages/dano-estetico.html', '../app.html#/dashboard/cases'],
  ['pages/quesitos.html', '../app.html#/dashboard/cases'],
  ['pages/laudo.html', '../app.html#/dashboard/cases'],
  ['pages/validacao.html', '../app.html#/dashboard/cases']
]);

for (const [path, expectedTarget] of compatibilityRoutes) {
  const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  assert.doesNotMatch(html, /MLKS/i, `${path} must not expose the retired MLKS brand`);
  assert.match(html, /MedPer/, `${path} must identify the current MedPer product`);
  assert.ok(
    html.includes(`url=${expectedTarget}`) && html.includes(`href="${expectedTarget}"`),
    `${path} must route legacy bookmarks to ${expectedTarget}`
  );
}

globalThis.localStorage = new MemoryStorage();
const legacyState = {
  version: 1,
  currentCaseId: 'legacy_mlks_case',
  cases: [{
    id: 'legacy_mlks_case',
    title: 'Caso histórico preservado',
    scope: 'Objeto histórico',
    evidence: [{ id: 'ev_legacy', title: 'Documento histórico' }]
  }]
};
localStorage.setItem('mlks.prototype.v1', JSON.stringify(legacyState));

const store = createStore();
const migrated = store.getState();

assert.equal(migrated.version, 4);
assert.equal(migrated.currentCaseId, 'legacy_mlks_case');
assert.equal(migrated.cases[0].title, 'Caso histórico preservado');
assert.equal(migrated.cases[0].evidence[0].title, 'Documento histórico');
assert.equal(migrated.cases[0].methodology.general.object, 'Objeto histórico');

const backupKeys = [...localStorage.values.keys()].filter(key =>
  key.startsWith('mlks.prototype.v1.backup.')
);
assert.equal(backupKeys.length, 1, 'legacy MLKS storage must be backed up before migration');

console.log('Legacy boundary regression suite completed successfully.');
