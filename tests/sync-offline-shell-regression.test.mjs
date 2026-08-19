import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// O MedPer é instalável e serve a perícia presencial, onde a rede falha: fórum,
// clínica, hospital. Se um módulo que o aplicativo carrega ficar fora do
// APP_SHELL, o app abre offline e quebra na tela que precisar dele.
//
// A versão anterior deste teste ENUMERAVA cinco caminhos à mão — os módulos de
// sincronização daquela PR. Por isso não viu os três módulos de metodologia que
// entraram depois (posas, personal-damage, bodily-damage-protocol): a lista não
// tem como enxergar o que ainda não existia quando foi escrita. É a patologia
// que este repositório já nomeou noutro contexto — lista mantida à mão envelhece
// em silêncio. O critério passa a ser DERIVADO: percorre o grafo real de imports
// a partir de js/main.js e exige que tudo que é alcançável esteja no cache.

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

const modulos = alcancaveis('js/main.js');

assert.ok(modulos.length > 20, `o grafo de imports foi percorrido (${modulos.length} módulos)`);

const fora = modulos.filter(m => !sw.includes(`'./${m}'`));
assert.deepEqual(fora, [],
  `todo módulo alcançável a partir de js/main.js precisa estar no APP_SHELL, senão o aplicativo quebra offline. Fora do cache: ${fora.join(', ')}`);

// O caminho inverso: cache apontando para arquivo que não existe mais faz
// cache.addAll() rejeitar inteiro — o service worker não instala e o offline
// deixa de existir por completo, silenciosamente.
const noCache = [...sw.matchAll(/'\.\/(js\/[^']+)'/g)].map(m => m[1]);
const inexistentes = noCache.filter(m => !fs.existsSync(path.join(raiz, m)));
assert.deepEqual(inexistentes, [],
  `APP_SHELL não pode listar arquivo inexistente — addAll() rejeita inteiro e o SW não instala. Ausentes: ${inexistentes.join(', ')}`);

console.log('Sync offline shell regression suite completed successfully.');
