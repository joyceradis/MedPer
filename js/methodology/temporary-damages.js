// Danos temporários — etapa 1/6 da matriz interna de avaliação do dano pessoal
// (`internal-damage-source.js`, versão 1.5).
//
// A aritmética já existia e estava testada; o que faltava era a tela. Este
// módulo é a camada declarativa entre as duas: descreve os marcos, normaliza o
// registro e produz a síntese — sem repetir a contagem de dias, que continua
// vindo de `calculateTemporaryDays`.
//
// Reconstruir temporários é devido SEMPRE que houve período lesional ou de
// tratamento, mesmo quando não restou sequela. Não é uma etapa condicionada à
// existência de dano permanente.

import { calculateTemporaryDays, INTERNAL_DAMAGE_SOURCE_RULES } from './internal-damage-source.js';

// Marco com `span: false` tem data única (o evento e a consolidação são pontos
// no tempo, não intervalos) e por isso não produz contagem de dias.
export const TEMPORARY_MILESTONES = Object.freeze([
  Object.freeze({
    id: 'injury', label: 'Evento lesivo', span: false,
    help: 'Data do evento que originou a avaliação.'
  }),
  Object.freeze({
    id: 'hospital', label: 'Internação / tratamento intensivo', span: true,
    help: 'Período documentado de internação ou tratamento intensivo.'
  }),
  Object.freeze({
    id: 'totalDisability', label: 'Incapacidade temporária total', span: true,
    synthesis: 'Dias de incapacidade temporária total',
    limit: 'Somente período demonstrado e pertinente ao objeto pericial.'
  }),
  Object.freeze({
    id: 'partialDisability', label: 'Incapacidade temporária parcial', span: true,
    synthesis: 'Dias de incapacidade temporária parcial',
    limit: 'Descrever grau e fundamento separadamente; não inferir percentual sem referencial.'
  }),
  Object.freeze({
    id: 'workImpact', label: 'Repercussão profissional temporária', span: true,
    synthesis: 'Dias de repercussão profissional temporária',
    limit: 'Registrar apenas período em que houve repercussão profissional demonstrável; não confundir com déficit funcional temporário.'
  }),
  Object.freeze({
    id: 'consolidation', label: 'Consolidação médico-legal', span: false,
    synthesis: 'Data de consolidação',
    limit: 'Fixar apenas quando clinicamente e documentalmente justificável.'
  })
]);

export const TEMPORARY_CAUTIONS = INTERNAL_DAMAGE_SOURCE_RULES.temporary.cautions;

const texto = value => String(value ?? '').trim();

export function normalizeTemporaryDamages(value = {}) {
  const origem = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const registro = {};
  for (const marco of TEMPORARY_MILESTONES) {
    const linha = origem[marco.id] || {};
    registro[marco.id] = {
      start: texto(linha.start),
      end: marco.span ? texto(linha.end) : '',
      source: texto(linha.source),
      note: texto(linha.note)
    };
  }
  return registro;
}

function sobrepoem(a, b) {
  if (!a.start || !a.end || !b.start || !b.end) return false;
  return a.start <= b.end && b.start <= a.end;
}

/** Síntese da aba, incluindo o que está internamente contraditório.
 *
 * As checagens NÃO corrigem nada e não alteram número nenhum: elas dizem à
 * perita o que está inconsistente e deixam a decisão com ela. Corrigir uma data
 * automaticamente seria afirmar sobre o caso algo que ninguém declarou.
 */
export function summarizeTemporaryDamages(value = {}) {
  const registro = normalizeTemporaryDamages(value);
  const dias = {};
  const issues = [];

  for (const marco of TEMPORARY_MILESTONES) {
    if (!marco.span) { dias[marco.id] = null; continue; }
    const linha = registro[marco.id];
    dias[marco.id] = calculateTemporaryDays(linha.start, linha.end);
    if (linha.start && linha.end && dias[marco.id] === null) {
      issues.push(`${marco.label}: data final anterior à inicial.`);
    }
  }

  // "Períodos sobrepostos não devem ser somados em duplicidade" — a matriz
  // enuncia a regra; aqui ela vira detecção. Total e parcial descrevem estados
  // que não coexistem: se os intervalos se cruzam, um dos dois está mal
  // delimitado, e somá-los contaria o mesmo dia duas vezes.
  if (sobrepoem(registro.totalDisability, registro.partialDisability)) {
    issues.push('Incapacidade total e parcial têm períodos sobrepostos — o mesmo dia não pode ser contado nos dois.');
  }

  const evento = registro.injury.start;
  const consolidacao = registro.consolidation.start;
  if (evento && consolidacao && consolidacao < evento) {
    issues.push('Consolidação anterior ao evento lesivo.');
  }
  if (consolidacao) {
    for (const marco of TEMPORARY_MILESTONES) {
      const fim = registro[marco.id].end;
      if (marco.span && fim && fim > consolidacao) {
        issues.push(`${marco.label} termina depois da consolidação declarada.`);
      }
    }
  }

  return Object.freeze({
    record: registro,
    days: Object.freeze(dias),
    totalDisabilityDays: dias.totalDisability,
    partialDisabilityDays: dias.partialDisability,
    workImpactDays: dias.workImpact,
    consolidationDate: consolidacao,
    // Ausência de registro não é ausência de dano temporário: é ausência de
    // reconstrução. A distinção importa porque a tela não pode sugerir que zero
    // dias foi uma conclusão pericial quando ninguém preencheu nada.
    started: TEMPORARY_MILESTONES.some(marco => registro[marco.id].start),
    issues: Object.freeze(issues)
  });
}
