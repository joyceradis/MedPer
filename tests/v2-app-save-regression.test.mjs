import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/v2/app.js', import.meta.url), 'utf8');
function harness() {
  const writes = [];
  const label = { textContent: '' };
  const step = { dataset: { step: 'document' } };
  const timers = new Map();
  let timerId = 0;
  const repo = {
    save(value) {
      return new Promise((resolve, reject) => writes.push({ value, resolve, reject }));
    }
  };
  const root = {
    querySelector: selector => selector === '.save-state' ? label : null,
    querySelectorAll: selector => selector === '[data-step]' ? [step] : []
  };
  const context = vm.createContext({
    CaseRepository: function () { return repo; },
    document: { getElementById: () => root },
    window: { addEventListener() {} },
    console: { error() {} },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  // Strip imports before cutting startup: offsets must use the stripped text.
  const stripped = source.replace(/^import .*;\n/gm, '');
  vm.runInContext(stripped.slice(0, stripped.indexOf('load().catch')) + `
    toast = () => {};
    renderWorkspace = () => {};
    globalThis.api = { state, saveNow, scheduleSave, bind };
  `, context);
  const api = context.api;
  api.state.current = { id: 'synthetic-case', history: { summary: 'before' } };
  api.state.dirty = true;
  return { ...api, writes, label, step, timers };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const acknowledge = write => write.resolve(JSON.parse(JSON.stringify(write.value)));

test('typing during a pending commit is saved next, never overwritten by its snapshot', async () => {
  const h = harness();
  const first = h.saveNow();
  h.state.current.history.summary = 'latest synthetic text';
  h.scheduleSave();
  const concurrent = h.saveNow();
  assert.equal(h.writes.length, 1, 'only one write may be active');
  acknowledge(h.writes[0]);
  await tick();
  assert.equal(h.state.current.history.summary, 'latest synthetic text');
  assert.equal(h.state.dirty, true);
  assert.equal(h.label.textContent, 'Salvando…');
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[1].value.history.summary, 'latest synthetic text');
  acknowledge(h.writes[1]);
  assert.equal(await first, true);
  assert.equal(await concurrent, true);
  assert.equal(h.state.dirty, false);
  assert.equal(h.label.textContent, 'Salvo localmente');
});

test('failed write preserves edits and retry drains them', async () => {
  const h = harness();
  const pending = h.saveNow();
  h.state.current.history.summary = 'retained after quota';
  h.scheduleSave();
  h.writes[0].reject(new Error('synthetic quota failure'));
  assert.equal(await pending, false);
  assert.equal(h.state.current.history.summary, 'retained after quota');
  assert.equal(h.state.dirty, true);
  assert.equal(h.state.saving, false);
  assert.equal(h.label.textContent, 'Alterações pendentes');
  const retry = h.saveNow();
  assert.equal(h.writes[1].value.history.summary, 'retained after quota');
  acknowledge(h.writes[1]);
  assert.equal(await retry, true);
  assert.equal(h.state.dirty, false);
});

test('navigation waits until edits made during the first write are persisted', async () => {
  const h = harness();
  h.bind();
  const navigation = h.step.onclick();
  h.state.current.history.summary = 'edited while navigating';
  h.scheduleSave();
  acknowledge(h.writes[0]);
  await tick();
  assert.equal(h.state.step, 'summary');
  acknowledge(h.writes[1]);
  await navigation;
  assert.equal(h.state.step, 'document');
  assert.equal(h.state.current.history.summary, 'edited while navigating');
});

test('failed persistence blocks navigation', async () => {
  const h = harness();
  h.bind();
  const navigation = h.step.onclick();
  h.writes[0].reject(new Error('synthetic disk failure'));
  await navigation;
  assert.equal(h.state.step, 'summary');
  assert.equal(h.state.dirty, true);
});

test('a stale completion cannot replace a different current case', async () => {
  const h = harness();
  const pending = h.saveNow();
  h.state.current = { id: 'another-synthetic-case' };
  acknowledge(h.writes[0]);
  assert.equal(await pending, false);
  assert.equal(h.state.current.id, 'another-synthetic-case');
});

test('serialization failure releases writer and permits recovery', async () => {
  const h = harness();
  h.state.current.loop = h.state.current;
  assert.equal(await h.saveNow(), false);
  assert.equal(h.state.dirty, true);
  assert.equal(h.writes.length, 0);
  delete h.state.current.loop;
  const retry = h.saveNow();
  assert.equal(h.writes.length, 1);
  acknowledge(h.writes[0]);
  assert.equal(await retry, true);
  assert.equal(h.state.dirty, false);
});
