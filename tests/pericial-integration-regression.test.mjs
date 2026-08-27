import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPericialIntegration, INTEGRATION_BLOCKS, AXIS_STATUS } from '../js/methodology/pericial-integration.js';
import { AIPE_CRITERIA, AIPE_CONTEXTS, AIPE_CONTEXT_OPTIONS, AIPE_PRIOR_EFFECT } from '../js/methodology/aipe.js';
import { protocols } from '../js/methodology/protocols.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

const casoCheio = {
  methodology: {
    temporary: {
      injury: { start: '2026-01-01' },
      totalDisability: { start: '2026-01-01', end: '2026-01-30' },
      partialDisability: { start: '2026-01-31', end: '2026-03-01' },
      workImpact: { start: '2026-01-01', end: '2026-03-01' },
      consolidation: { start: '2026-03-15' }
    },
    guided: {
      aipeScore: '28',
      posasPatient_pain: '4', posasPatient_itch: '3', posasPatient_color: '6',
      posasPatient_stiffness: '5', posasPatient_thickness: '4', posasPatient_irregularity: '5',
      permanentFunctionalStatus: 'Demonstrado',
      permanentProfessionalStatus: 'Indeterminado',
      thirdPartyDependenceStatus: 'Não aplicável',
      quantumDolorisSummary: 'Três cirurgias, curativos diários por seis semanas.'
    }
  }
};

// ----------------------------------------------- a garantia central: não somar

test('a integração não produz escore global — e a ausência é declarada, não omitida', () => {
  const i = buildPericialIntegration(casoCheio);
  assert.equal(i.globalScore, null);
  assert.match(i.globalScoreRule, /não produzem escore global/);

  // Nenhuma chave de agregação pode existir na saída.
  const agregados = Object.keys(i).filter(k => /^(total|sum|overall|aggregate|final)/i.test(k));
  assert.deepEqual(agregados, [], 'constructos heterogêneos não se agregam');
});

test('nenhuma soma entre eixos no código — a ausência de aritmética é o recurso', () => {
  const fonte = fs.readFileSync(new URL('../js/methodology/pericial-integration.js', import.meta.url), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  assert.ok(!/\breduce\s*\(/.test(fonte), 'nada de reduce sobre eixos');
  assert.ok(!/\bsum\b|\+\s*aipe|aipe\s*\+|posas\.\w+\.total\s*\+/i.test(fonte), 'eixos não se somam');
});

test('os bloqueios metodológicos da matriz chegam inteiros', () => {
  assert.ok(INTEGRATION_BLOCKS.includes('POSAS não infere AIPE.'));
  assert.ok(INTEGRATION_BLOCKS.includes('AIPE não prova nexo.'));
  assert.ok(INTEGRATION_BLOCKS.includes('Balthazard não cria percentual clínico.'));
  assert.ok(INTEGRATION_BLOCKS.includes('Constructos independentes não são somados em um percentual global.'));
});

// ----------------------------------------------- cada eixo com seu denominador

test('cada eixo carrega o próprio denominador, e eles não coincidem', () => {
  const i = buildPericialIntegration(casoCheio);
  const porId = Object.fromEntries(i.axes.map(a => [a.id, a]));
  assert.equal(porId.aesthetic.value, '28');
  assert.equal(porId.aesthetic.unit, '/ 50');
  assert.equal(porId.scarPatient.value, '27');
  assert.equal(porId.scarPatient.unit, '/ 60');
  // 28/50 e 27/60 não são comparáveis nem somáveis: é exatamente por isso que
  // cada um mostra o próprio denominador em vez de virar "28 + 27".
  assert.notEqual(porId.aesthetic.unit, porId.scarPatient.unit);
});

test('a categoria do AIPE é lida da faixa, não digitada de novo', () => {
  assert.equal(buildPericialIntegration({ methodology: { guided: { aipeScore: '28' } } })
    .axes.find(a => a.id === 'aesthetic').note, 'Bastante importante');
  assert.equal(buildPericialIntegration({ methodology: { guided: { aipeScore: '0' } } })
    .axes.find(a => a.id === 'aesthetic').note, 'Não relevante');
});

test('POSAS incompleto não vira total parcial', () => {
  const i = buildPericialIntegration({ methodology: { guided: { posasPatient_pain: '4' } } });
  assert.equal(i.axes.find(a => a.id === 'scarPatient').value, '');
  assert.equal(i.axes.find(a => a.id === 'scarPatient').status, AXIS_STATUS.pending);
});

test('dias temporários chegam contados e com plural correto', () => {
  const i = buildPericialIntegration(casoCheio);
  const porId = Object.fromEntries(i.axes.map(a => [a.id, a]));
  assert.equal(porId.temporaryTotal.value, '30 dias');
  assert.equal(porId.consolidation.value, '2026-03-15');
  assert.equal(buildPericialIntegration({
    methodology: { temporary: { totalDisability: { start: '2026-01-01', end: '2026-01-01' } } }
  }).axes.find(a => a.id === 'temporaryTotal').value, '1 dia');
});

test('os eixos de repercussão vêm do que a perita declarou, sem inferência', () => {
  const i = buildPericialIntegration(casoCheio);
  const porId = Object.fromEntries(i.axes.map(a => [a.id, a]));
  assert.equal(porId.professional.value, 'Indeterminado');
  assert.equal(porId.thirdParty.value, 'Não aplicável');
  // "Não aplicável" é uma declaração, não uma ausência: conta como registrado.
  assert.equal(porId.thirdParty.status, AXIS_STATUS.recorded);
  // Eixo nunca respondido fica pendente, e não vira "Não demonstrado".
  assert.equal(porId.sexual.status, AXIS_STATUS.pending);
  assert.equal(porId.sexual.value, '');
});

test('quantum doloris aparece como registro narrativo, sem graduação numérica', () => {
  const i = buildPericialIntegration(casoCheio);
  const qd = i.axes.find(a => a.id === 'quantumDoloris');
  assert.equal(qd.value, 'Registrado');
  assert.equal(qd.unit, '');
  assert.match(qd.note, /sem graduação numérica/);
});

test('caso vazio não quebra e não afirma nada', () => {
  for (const entrada of [undefined, {}, { methodology: {} }]) {
    const i = buildPericialIntegration(entrada);
    assert.ok(i.axes.length > 0);
    assert.ok(i.axes.every(a => a.status !== AXIS_STATUS.recorded));
    assert.equal(i.globalScore, null);
  }
});

test('as contradições dos danos temporários sobem para a integração', () => {
  const i = buildPericialIntegration({
    methodology: {
      temporary: {
        totalDisability: { start: '2026-01-01', end: '2026-01-15' },
        partialDisability: { start: '2026-01-10', end: '2026-01-20' }
      }
    }
  });
  assert.ok(i.temporaryIssues.some(x => /sobrepostos/.test(x)));
});

// ----------------------------------------------- AIPE: uma única transcrição

test('o Quadro 1 do AIPE tem três opções por eixo, não quatro', () => {
  // O formulário guiado oferecia uma escala de quatro pontos onde o instrumento
  // publicado tem três, e a tabela de referência ao lado mostrava três: a tela
  // exibia duas transcrições divergentes do mesmo quadro.
  for (const criterion of AIPE_CRITERIA) {
    assert.equal(criterion.options.length, 3, `${criterion.id} tem três opções`);
  }
  // E a opção mais grave do eixo do olhar é EVITAR, não fixar ao máximo.
  assert.equal(AIPE_CRITERIA.find(c => c.id === 'gaze').options.at(-1), 'Tende a evitar o olhar');
});

test('o formulário guiado deriva do instrumento em vez de redigitá-lo', () => {
  const passo = protocols.aesthetic.steps.find(s => s.id === 'aipe1');
  assert.deepEqual(passo.fields.map(f => f.id), AIPE_CRITERIA.map(c => c.field));
  for (const [indice, field] of passo.fields.entries()) {
    assert.deepEqual(field.options, AIPE_CRITERIA[indice].options,
      'as opções do formulário são as mesmas do instrumento, por construção');
  }
});

test('o Quadro 4 cobre os cinco focos e o efeito sobre a avaliação anterior', () => {
  const passo = protocols.aesthetic.steps.find(s => s.id === 'aipe4');
  const ids = passo.fields.map(f => f.id);
  for (const context of AIPE_CONTEXTS) assert.ok(ids.includes(context.field), `${context.id} tem campo`);
  assert.ok(ids.includes(AIPE_PRIOR_EFFECT.field), 'o efeito sobre a avaliação anterior é registrável');
  assert.deepEqual(passo.fields[0].options, AIPE_CONTEXT_OPTIONS);
  // A revisão é declarada pela perita; o Quadro 4 não a automatiza.
  assert.deepEqual(AIPE_PRIOR_EFFECT.options,
    ['Mantém', 'Justifica revisão para maior intensidade', 'Justifica revisão para menor intensidade']);
});

// ----------------------------------------------- o documento final

test('o documento final passa a mostrar os eixos, que antes eram invisíveis nele', () => {
  const app = fs.readFileSync(new URL('../js/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /function reportAxes\(c\)/, 'o laudo monta os eixos');
  assert.match(app, /\$\{reportAxes\(c\)\}/, 'e os insere no documento');
  assert.match(app, /DANOS TEMPORÁRIOS E CONSOLIDAÇÃO/);
  assert.match(app, /EIXOS PERMANENTES E REPERCUSSÕES/);
  // A regra de não-somar precisa estar na peça que vai ao juízo, não só na tela.
  assert.match(app, /globalScoreRule/, 'o documento afirma que os eixos não se somam');
});

console.log('Pericial integration regression suite completed successfully.');
