import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// O MedPer precisa funcionar em perícia presencial mesmo sem rede. O critério
// é derivado do entrypoint ATIVO: todo módulo alcançável a partir de js/v2/app.js
// deve estar no APP_SHELL do service worker.

const raiz = new URL('../', import.meta.url).pathname;
const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');

function alcancaveis(entrada) {
  const vistos = new Set();
  const pilha = [entrada];
  while (pilha.length) {
    const arquivo = pilha.pop();
    if (vistos.has(arquivo) || !fs.existsSync(path.join(raiz, arquivo))) continue;
    vistos.add(arquivo);
    const fonte = fs.readFileSync(path.join(raiz, arquivo), 'utf8');
    for (const [, spec] of fonte.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
      if (!spec.startsWith('.')) continue;
      pilha.push(path.normalize(path.join(path.dirname(arquivo), spec)));
    }
  }
  return [...vistos];
}

const modulos = alcancaveis('js/v2/app.js');
assert.ok(modulos.length >= 7, `o grafo V2 de imports foi percorrido (${modulos.length} módulos)`);

const fora = modulos.filter(m => !sw.includes(`'./${m}'`));
assert.deepEqual(fora, [],
  `todo módulo alcançável a partir de js/v2/app.js precisa estar no APP_SHELL. Fora do cache: ${fora.join(', ')}`);

const noCache = [...sw.matchAll(/'\.\/(js\/[^']+)'/g)].map(m => m[1]);
const inexistentes = noCache.filter(m => !fs.existsSync(path.join(raiz, m)));
assert.deepEqual(inexistentes, [],
  `APP_SHELL não pode listar arquivo inexistente. Ausentes: ${inexistentes.join(', ')}`);

assert.equal(sw.includes("'./js/main.js'"), false,
  'o shell V2 não deve carregar o entrypoint legado desnecessariamente');

console.log('MedPer V2 offline shell regression suite completed successfully.');

const { runInNewContext } = await import('node:vm');
// Derive the live shell cache from sw.js so bumping the version never breaks this suite.
const cachePrefix = sw.match(/CACHE_PREFIX='([^']+)'/)?.[1];
const cacheVersion = sw.match(/CACHE_NAME=`\$\{CACHE_PREFIX\}([^`]+)`/)?.[1];
assert.ok(cachePrefix && cacheVersion, 'sw.js must declare CACHE_PREFIX and a versioned CACHE_NAME');
const currentCache = cachePrefix + cacheVersion;
assert.notEqual(currentCache, 'medper-v2-shell-20260910', 'the retired fixture cache must differ from the live one');
const handlers = new Map();
const deleted = [];
const opened = [];
const currentShell = currentCache;
const ownCache = new Map([
  ['./index.html', { body: 'MedPer home' }],
  ['./app.html', { body: 'MedPer workspace' }]
]);
let activation;
let originWideReads = 0;
runInNewContext(sw, {
  URL,
  self: {
    location: { origin: 'https://example.test' },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (name, handler) => handlers.set(name, handler)
  },
  caches: {
    keys: async () => ['medper-v2-shell-20260910', 'medper-v2-shell-20261018', currentShell, 'another-app-cache', 'unrelated-user-backup'],
    delete: async key => { deleted.push(key); return true; },
    open: async key => {
      opened.push(key);
      return {
        match: async request => ownCache.get(typeof request === 'string' ? request : request.url),
        put: async () => {},
        addAll: async () => {}
      };
    },
    match: async () => { originWideReads++; return { body: 'other application cached response' }; }
  },
  fetch: async () => { throw new Error('offline'); }
});
handlers.get('activate')({ waitUntil: promise => { activation = promise; } });
await activation;
assert.ok(deleted.includes('medper-v2-shell-20260910'), 'retire the old MedPer shell');
assert.ok(deleted.includes('medper-v2-shell-20261018'), 'retire only obsolete MedPer shell revisions');
assert.ok(!deleted.includes(currentShell), 'preserve the new current shell');
assert.ok(!deleted.includes('another-app-cache'), 'activation must not erase another app on this origin');
assert.ok(!deleted.includes('unrelated-user-backup'), 'activation must preserve unrelated caches');

async function offlineRequest(url, mode = 'navigate') {
  let response;
  handlers.get('fetch')({
    request: { method: 'GET', url, mode },
    respondWith: promise => { response = promise; }
  });
  return response;
}
assert.equal((await offlineRequest('https://example.test/MedPer/app.html')).body, 'MedPer workspace');
assert.equal((await offlineRequest('https://example.test/MedPer/index.html')).body, 'MedPer home');
await assert.rejects(offlineRequest('https://example.test/MedPer/missing.js', 'cors'), /offline/,
  'a missing script must never receive landing-page HTML');
await assert.rejects(offlineRequest('https://example.test/MedPer/missing.css', 'cors'), /offline/);
assert.equal(originWideReads, 0, 'cache reads must be confined to the current MedPer shell');
assert.ok(opened.every(key => key === currentShell));
console.log('Service-worker activation isolation and offline response behavior: ok');
