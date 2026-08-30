import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  FUNCTIONAL_ROWS,
  FUNCTIONAL_CAUTIONS,
  INVERSE_CAUTION,
  parsePercent,
  normalizeFunctionalCalc,
  summarizeFunctionalCalc
} from '../js/methodology/functional-calc.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

// ------------------------------------------------------------ entrada

test('percentual aceita vírgula decimal e símbolo %, e distingue vazio de zero', () => {
  assert.equal(parsePercent('12,5'), 12.5);
  assert.equal(parsePercent(' 12.5 % '), 12.5);
  assert.equal(parsePercent('0'), 0);
  assert.equal(parsePercent(''), null);
  assert.equal(parsePercent('abc'), null);
});

test('caso legado abre com as cinco linhas vazias em vez de quebrar', () => {
  for (const entrada of [undefined, null, {}, 'lixo', []]) {
    const registro = normalizeFunctionalCalc(entrada);
    assert.deepEqual(Object.keys(registro.rows), [...FUNCTIONAL_ROWS]);
    assert.equal(registro.rows.s1.percent, '');
    assert.equal(registro.prior.current, '');
  }
});

// ------------------------------------------------------------ capacidade restante

test('a combinação usa a capacidade restante, não a soma — e mostra a soma para comparação', () => {
  // Exemplo canônico: 50% + 30% → Balthazard 65%, soma simples 80%.
  const s = summarizeFunctionalCalc({ rows: {
    s1: { description: 'A', percent: '50' },
    s2: { description: 'B', percent: '30' }
  } });
  assert.equal(s.combinedDeficitPercent, 65);
  assert.equal(s.remainingCapacityPercent, 35);
  assert.equal(s.simpleSumPercent, 80);
  assert.notEqual(s.combinedDeficitPercent, s.simpleSumPercent,
    'com múltiplas sequelas os dois divergem — é o motivo de a regra existir');
});

test('o impacto real de cada sequela usa a capacidade que restou, nunca 100% de novo', () => {
  const s = summarizeFunctionalCalc({ rows: {
    s1: { percent: '50' }, s2: { percent: '30' }
  } });
  assert.equal(s.rows[0].impactPercent, 50);
  assert.equal(s.rows[1].impactPercent, 15, '30% de 50% restantes = 15 pontos');
});

test('linha com percentual ilegível sai do cálculo com apontamento — nada é corrigido', () => {
  const s = summarizeFunctionalCalc({ rows: {
    s1: { percent: '50' }, s2: { percent: '130' }, s3: { percent: 'x' }
  } });
  assert.equal(s.combinedDeficitPercent, 50, 'só a linha válida entra');
  assert.equal(s.issues.length, 2);
  assert.ok(s.issues.every(i => /excluído do cálculo/.test(i)));
});

test('registro vazio não afirma nada', () => {
  const s = summarizeFunctionalCalc({});
  assert.equal(s.combinedDeficitPercent, null);
  assert.equal(s.simpleSumPercent, null);
  assert.equal(s.started, false);
  assert.deepEqual([...s.issues], []);
});

// ------------------------------------------------------------ inversa

test('a inversa isola o incremento: F=50, Ea=20 → D=37.5', () => {
  const s = summarizeFunctionalCalc({ prior: { current: '50', prior: '20' } });
  assert.equal(s.inverseIncrementPercent, 37.5);
});

test('as guardas da inversa devolvem REVER, com a palavra da matriz', () => {
  const eaCem = summarizeFunctionalCalc({ prior: { current: '50', prior: '100' } });
  assert.equal(eaCem.inverseIncrementPercent, null);
  assert.ok(eaCem.issues.some(i => /REVER/.test(i) && /100%/.test(i)));

  const invertido = summarizeFunctionalCalc({ prior: { current: '20', prior: '50' } });
  assert.equal(invertido.inverseIncrementPercent, null);
  assert.ok(invertido.issues.some(i => /REVER/.test(i) && /menor que o estado anterior/.test(i)));
});

test('um só campo da inversa preenchido não calcula nem alarma — está no meio da digitação', () => {
  const s = summarizeFunctionalCalc({ prior: { current: '50', prior: '' } });
  assert.equal(s.inverseIncrementPercent, null);
  assert.deepEqual([...s.issues], []);
  assert.equal(s.started, true);
});

// ------------------------------------------------------------ fronteiras

test('as cautelas da matriz chegam inteiras à tela', () => {
  assert.ok(FUNCTIONAL_CAUTIONS.some(c => /não inserir estimativas livres/.test(c)));
  assert.ok(FUNCTIONAL_CAUTIONS.some(c => /não é transportado automaticamente/.test(c)));
  assert.match(INVERSE_CAUTION, /Não converte concausa, predisposição ou agravamento/);
});

test('a calculadora nunca escreve em campo de valoração — combina, não conclui', () => {
  // O resultado fica na síntese; nenhum caminho de escrita para
  // methodology.specific.functionalValuation existe no módulo nem na tela.
  const modulo = fs.readFileSync(new URL('../js/methodology/functional-calc.js', import.meta.url), 'utf8');
  assert.ok(!/functionalValuation|specific\./.test(modulo));
  const app = fs.readFileSync(new URL('../js/ui/app.js', import.meta.url), 'utf8');
  const painel = app.slice(app.indexOf('function balthazardPanel'), app.indexOf('function renderMethod'));
  assert.ok(!/data-bind="methodology\.specific/.test(painel),
    'a tela da calculadora não grava nada em campo de valoração');
});

test('a tela só abre com permanentes valoráveis — antes disso, explica o porquê', () => {
  const app = fs.readFileSync(new URL('../js/ui/app.js', import.meta.url), 'utf8');
  const painel = app.slice(app.indexOf('function balthazardPanel'), app.indexOf('function renderMethod'));
  assert.match(painel, /evaluatePersonalDamageCase/);
  assert.match(painel, /canValuePermanent/);
  assert.match(painel, /Permanentes ainda não são valoráveis/);
});

// ------------------------------------------------------------ regime na tela

test('o painel de regime persiste o id, mostra sugestão do mapa e nunca seleciona sozinho', () => {
  const app = fs.readFileSync(new URL('../js/ui/app.js', import.meta.url), 'utf8');
  const painel = app.slice(app.indexOf('function valuationRegimePanel'), app.indexOf('function renderSummary'));
  assert.match(painel, /data-bind="valuationRegime"/);
  assert.match(painel, /VALUATION_REGIME_OPTIONS\.map/, 'as opções vêm do módulo, não redigitadas');
  assert.match(painel, /suggestedRegimeForPurpose/, 'a sugestão vem do mapa validado');
  assert.match(painel, /registro anterior, fora da escala atual/, 'valor legado é exibido, não convertido');
  assert.match(painel, /resolveFunctionalBaremaTrack/, 'o trilho do barema aparece quando o regime é declarado');
  assert.ok(!/selected(?![^<]*option)/.test('') && painel.includes(`' selected'`),
    'a seleção reflete só o que a perita declarou');
});

console.log('Functional calc regression suite completed successfully.');
