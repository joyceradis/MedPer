import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TEMPORARY_MILESTONES,
  TEMPORARY_CAUTIONS,
  normalizeTemporaryDamages,
  summarizeTemporaryDamages
} from '../js/methodology/temporary-damages.js';
import { INTERNAL_DAMAGE_SOURCE_RULES } from '../js/methodology/internal-damage-source.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

// ------------------------------------------------------------ os marcos

test('os marcos reproduzem a matriz interna, com evento e consolidação como datas únicas', () => {
  assert.deepEqual(TEMPORARY_MILESTONES.map(m => m.id),
    ['injury', 'hospital', 'totalDisability', 'partialDisability', 'workImpact', 'consolidation']);

  // Evento e consolidação são pontos no tempo. Dar-lhes data final produziria
  // uma contagem de dias que não significa nada.
  assert.equal(TEMPORARY_MILESTONES.find(m => m.id === 'injury').span, false);
  assert.equal(TEMPORARY_MILESTONES.find(m => m.id === 'consolidation').span, false);
  assert.equal(TEMPORARY_MILESTONES.find(m => m.id === 'totalDisability').span, true);
});

test('as cautelas vêm da fonte, não de uma segunda cópia que envelheceria sozinha', () => {
  assert.equal(TEMPORARY_CAUTIONS, INTERNAL_DAMAGE_SOURCE_RULES.temporary.cautions);
  assert.ok(TEMPORARY_CAUTIONS.some(c => /Tempo de tratamento não equivale/.test(c)));
  assert.ok(TEMPORARY_CAUTIONS.some(c => /Retorno ao trabalho não exclui sequela/.test(c)));
});

// ------------------------------------------------------------ normalização

test('caso legado abre com os marcos vazios em vez de quebrar a tela', () => {
  for (const entrada of [undefined, null, {}, 'lixo', []]) {
    const registro = normalizeTemporaryDamages(entrada);
    assert.deepEqual(Object.keys(registro).sort(), TEMPORARY_MILESTONES.map(m => m.id).sort());
    assert.equal(registro.totalDisability.start, '');
  }
});

test('marco de data única não guarda data final, mesmo se alguém escrever uma', () => {
  const registro = normalizeTemporaryDamages({ consolidation: { start: '2026-03-01', end: '2026-04-01' } });
  assert.equal(registro.consolidation.start, '2026-03-01');
  assert.equal(registro.consolidation.end, '');
});

// ------------------------------------------------------------ contagem

test('a contagem é inclusiva: um único dia conta como um dia', () => {
  const s = summarizeTemporaryDamages({ totalDisability: { start: '2026-01-01', end: '2026-01-01' } });
  assert.equal(s.totalDisabilityDays, 1);
});

test('DFTT, DFTP e repercussão profissional são contados separadamente', () => {
  const s = summarizeTemporaryDamages({
    totalDisability: { start: '2026-01-01', end: '2026-01-10' },
    partialDisability: { start: '2026-01-11', end: '2026-01-20' },
    workImpact: { start: '2026-01-01', end: '2026-02-01' }
  });
  assert.equal(s.totalDisabilityDays, 10);
  assert.equal(s.partialDisabilityDays, 10);
  assert.equal(s.workImpactDays, 32);
  // E não existe soma dos três: são períodos que se sobrepõem por natureza.
  assert.equal('totalDays' in s, false, 'somar os três contaria o mesmo dia mais de uma vez');
});

// ------------------------------------------------------------ contradições

test('período invertido é apontado, não convertido em duração negativa', () => {
  const s = summarizeTemporaryDamages({ totalDisability: { start: '2026-02-01', end: '2026-01-01' } });
  assert.equal(s.totalDisabilityDays, null);
  assert.ok(s.issues.some(i => /data final anterior à inicial/.test(i)));
});

test('total e parcial sobrepostos são apontados — o mesmo dia não pode contar duas vezes', () => {
  const s = summarizeTemporaryDamages({
    totalDisability: { start: '2026-01-01', end: '2026-01-15' },
    partialDisability: { start: '2026-01-10', end: '2026-01-20' }
  });
  assert.ok(s.issues.some(i => /sobrepostos/.test(i)));
  // Os números continuam intactos: quem decide o que fazer é a perita.
  assert.equal(s.totalDisabilityDays, 15);
  assert.equal(s.partialDisabilityDays, 11);
});

test('períodos encostados mas não sobrepostos não geram alarme falso', () => {
  const s = summarizeTemporaryDamages({
    totalDisability: { start: '2026-01-01', end: '2026-01-10' },
    partialDisability: { start: '2026-01-11', end: '2026-01-20' }
  });
  assert.deepEqual(s.issues, []);
});

test('consolidação anterior ao evento, e período que a ultrapassa, são apontados', () => {
  const invertida = summarizeTemporaryDamages({
    injury: { start: '2026-05-01' }, consolidation: { start: '2026-01-01' }
  });
  assert.ok(invertida.issues.some(i => /Consolidação anterior ao evento/.test(i)));

  const extrapola = summarizeTemporaryDamages({
    injury: { start: '2026-01-01' },
    totalDisability: { start: '2026-01-01', end: '2026-06-01' },
    consolidation: { start: '2026-03-01' }
  });
  assert.ok(extrapola.issues.some(i => /termina depois da consolidação/.test(i)));
});

test('registro em branco não produz alarme nenhum e se declara não iniciado', () => {
  const s = summarizeTemporaryDamages({});
  assert.deepEqual(s.issues, []);
  // Zero dias seria uma conclusão pericial; ausência de reconstrução não é.
  assert.equal(s.started, false);
  assert.equal(s.totalDisabilityDays, null);
  assert.equal(summarizeTemporaryDamages({ injury: { start: '2026-01-01' } }).started, true);
});

// ------------------------------------------------------------ fronteira

test('o módulo não inventa percentual nem escore a partir de dias', () => {
  // A saída é contagem de dias e datas. Converter dias em percentual exigiria um
  // referencial que o MedPer não declara ter — e a matriz interna proíbe
  // expressamente inferir percentual sem ele.
  const s = summarizeTemporaryDamages({
    totalDisability: { start: '2026-01-01', end: '2026-01-10' },
    partialDisability: { start: '2026-01-11', end: '2026-01-20' }
  });
  const derivados = Object.keys(s).filter(k => /percent|score|grau|severity/i.test(k));
  assert.deepEqual(derivados, [], 'a síntese temporária não expõe percentual nem escore');

  // E nenhuma aritmética de percentagem no código — comentários e textos de
  // limite falam em "percentual" justamente para proibi-lo, então o teste olha
  // o código com os literais de texto removidos.
  const fonte = fs.readFileSync(new URL('../js/methodology/temporary-damages.js', import.meta.url), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  assert.ok(!/[*/]\s*100\b/.test(fonte), 'nenhuma conversão de dias em percentagem');
});

console.log('Temporary damages regression suite completed successfully.');
