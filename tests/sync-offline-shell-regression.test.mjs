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
