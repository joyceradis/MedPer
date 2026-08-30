// Calculadora funcional — etapa 2/6 da matriz interna de avaliação do dano
// pessoal (versão 1.5): capacidade restante (Balthazard) e a forma inversa.
//
// A aritmética vive em `internal-damage-source.js`, transcrita da matriz e
// testada; este módulo é a camada entre ela e a tela: normaliza o registro,
// interpreta percentuais como a perita os escreve (vírgula decimal, símbolo %)
// e produz a síntese com as contradições apontadas.
//
// O que este módulo NÃO faz, por regra da matriz e da issue #56 (invariante 5):
// não cria percentual clínico — os percentuais de entrada são os que a perita
// já fixou pelo referencial aplicável; não combina estética, profissão ou dor
// com déficit funcional; e não escreve o resultado em nenhum campo de valoração
// — transportá-lo para o laudo é ato dela.

import { combineRemainingCapacity, isolateIncrementFromPriorState } from './internal-damage-source.js';

// Cinco linhas, como a matriz. Registro fixo em vez de lista dinâmica: a ordem
// de lançamento deve seguir a fonte utilizada (nota da própria matriz), e linhas
// numeradas estáveis preservam essa ordem entre edições.
export const FUNCTIONAL_ROWS = Object.freeze(['s1', 's2', 's3', 's4', 's5']);

export const FUNCTIONAL_CAUTIONS = Object.freeze([
  'Use somente percentuais rastreáveis ao referencial técnico aplicável e a sequelas objetivamente demonstradas — não inserir estimativas livres.',
  'Aplicar apenas a déficits funcionais independentes, quando o barema ou referencial pertinente determinar a combinação pela capacidade restante.',
  'A ordem de lançamento deve seguir a fonte utilizada; não é requisito matemático da fórmula.',
  'O resultado não é transportado automaticamente para a valoração — registrar no laudo é decisão da perita.'
]);

export const INVERSE_CAUTION =
  'A Balthazard inversa (D = (F − Ea) / (1 − Ea)) só se aplica quando há déficit funcional preexistente objetivamente quantificável, no mesmo domínio e referencial. Não converte concausa, predisposição ou agravamento em percentual.';

const texto = value => String(value ?? '').trim();

// "12,5%", "12.5", " 12 % " → 12.5. Devolve null para vazio ou ilegível — a
// distinção entre "não preenchido" e "zero" importa: zero é uma declaração.
export function parsePercent(value) {
  const bruto = texto(value).replace('%', '').replace(',', '.').trim();
  if (!bruto) return null;
  const numero = Number(bruto);
  return Number.isFinite(numero) ? numero : null;
}

export function normalizeFunctionalCalc(value = {}) {
  const origem = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const registro = { rows: {}, prior: {} };
  for (const id of FUNCTIONAL_ROWS) {
    const linha = origem.rows?.[id] || {};
    registro.rows[id] = {
      description: texto(linha.description),
      percent: texto(linha.percent),
      source: texto(linha.source)
    };
  }
  registro.prior = {
    current: texto(origem.prior?.current),
    prior: texto(origem.prior?.prior)
  };
  return registro;
}

/** Síntese da calculadora. Nada é corrigido: entrada inválida vira apontamento
 * e a linha sai do cálculo, para que o resultado nunca inclua um número que a
 * perita não reconheceria como seu. */
export function summarizeFunctionalCalc(value = {}) {
  const registro = normalizeFunctionalCalc(value);
  const issues = [];
  const filled = [];

  for (const [indice, id] of FUNCTIONAL_ROWS.entries()) {
    const linha = registro.rows[id];
    if (!linha.percent) continue;
    const pct = parsePercent(linha.percent);
    if (pct === null || pct < 0 || pct > 100) {
      issues.push(`Sequela ${indice + 1}: percentual ilegível ou fora de 0–100 ("${linha.percent}") — excluído do cálculo.`);
      continue;
    }
    filled.push({ id, index: indice + 1, description: linha.description, percent: pct, source: linha.source });
  }

  // A fração é a linguagem de `combineRemainingCapacity`; a tela fala em %.
  const combined = combineRemainingCapacity(filled.map(row => row.percent / 100));
  const rows = filled.map((row, i) => Object.freeze({
    ...row,
    impactPercent: combined.valid ? round2(combined.impacts[i] * 100) : null
  }));

  const simpleSum = filled.reduce((sum, row) => sum + row.percent, 0);

  // Inversa — só computa quando os DOIS campos estão preenchidos e legíveis.
  const current = parsePercent(registro.prior.current);
  const prior = parsePercent(registro.prior.prior);
  let inverse = null;
  if (registro.prior.current || registro.prior.prior) {
    if (current === null || prior === null || current < 0 || current > 100 || prior < 0 || prior > 100) {
      if (registro.prior.current && registro.prior.prior) {
        issues.push('Balthazard inversa: valores ilegíveis ou fora de 0–100 — não calculada.');
      }
    } else {
      const isolated = isolateIncrementFromPriorState(current / 100, prior / 100);
      if (isolated === null) {
        // As guardas da fórmula, com a mensagem da própria matriz.
        issues.push(prior >= 100
          ? 'Balthazard inversa: REVER — estado anterior de 100% não deixa capacidade a isolar.'
          : 'Balthazard inversa: REVER — déficit atual menor que o estado anterior.');
      } else {
        inverse = round2(isolated * 100);
      }
    }
  }

  return Object.freeze({
    record: registro,
    rows: Object.freeze(rows),
    combinedDeficitPercent: combined.valid && filled.length ? round2(combined.deficit * 100) : null,
    remainingCapacityPercent: combined.valid && filled.length ? round2(combined.remaining * 100) : null,
    // A soma simples aparece AO LADO do resultado, como na matriz: é a
    // comparação que mostra por que a capacidade restante existe — nunca o
    // resultado a transportar.
    simpleSumPercent: filled.length ? round2(simpleSum) : null,
    inverseIncrementPercent: inverse,
    started: filled.length > 0 || Boolean(registro.prior.current || registro.prior.prior),
    issues: Object.freeze(issues)
  });
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
