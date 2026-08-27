// Integração pericial — etapa 6/6 da matriz interna (versão 1.5).
//
// A regra que este módulo existe para cumprir é NEGATIVA: os constructos são
// apresentados lado a lado e **nunca somados**. Déficit funcional, prejuízo
// estético, qualidade cicatricial, dor e repercussões medem coisas diferentes,
// em escalas diferentes, com denominadores diferentes — 30/50 de AIPE e 40/60 de
// POSAS não se agregam em nada que signifique alguma coisa.
//
// Por isso não existe aqui nenhuma função que devolva um total. A ausência é o
// recurso, e um teste falha se alguém acrescentar uma.
//
// Este módulo NÃO decide nada: lê o que a perita já declarou nas telas de método
// e apenas o reorganiza por eixo. Nenhum valor é derivado, arredondado,
// convertido ou preenchido por inferência.

import { AIPE_CATEGORIES } from './aipe.js';
import { buildPosasAssessmentFromGuided } from './posas.js';
import { summarizeTemporaryDamages } from './temporary-damages.js';

export const INTEGRATION_BLOCKS = Object.freeze([
  'Nexo precede valoração.',
  'POSAS não infere AIPE.',
  'AIPE não prova nexo.',
  'Balthazard não cria percentual clínico.',
  'Estado anterior não é concausa automática.',
  'Constructos independentes não são somados em um percentual global.'
]);

// `pending` é eixo que o caso pede e a perita ainda não preencheu; `absent` é
// eixo cuja tela o MedPer ainda não oferece. Confundir os dois faria a interface
// cobrar dela uma resposta que não tem onde ser dada.
export const AXIS_STATUS = Object.freeze({ recorded: 'recorded', pending: 'pending', absent: 'absent' });

// Eixos permanentes declarados em "3. Eixos permanentes" — a chave do `guided` e
// o rótulo da integração vêm daqui, para que acrescentar um eixo seja uma linha
// e não uma caçada por três arquivos.
const PERMANENT_AXES = Object.freeze([
  Object.freeze({ id: 'professional', field: 'permanentProfessionalStatus', label: 'Repercussão profissional permanente' }),
  Object.freeze({ id: 'leisure', field: 'permanentLeisureStatus', label: 'Atividade física / lazer' }),
  Object.freeze({ id: 'social', field: 'permanentSocialStatus', label: 'Relações sociais / exposição' }),
  Object.freeze({ id: 'sexual', field: 'permanentSexualStatus', label: 'Repercussão sexual' }),
  Object.freeze({ id: 'thirdParty', field: 'thirdPartyDependenceStatus', label: 'Dependência de terceira pessoa' })
]);

function aipeCategoryFor(score) {
  if (!Number.isFinite(score)) return '';
  return AIPE_CATEGORIES.find(c => score >= c.range[0] && score <= c.range[1])?.label || '';
}

function aipeScore(guided = {}) {
  const bruto = guided.aipeScore;
  if (bruto === '' || bruto === null || bruto === undefined) return null;
  const numero = Number(bruto);
  return Number.isFinite(numero) && numero >= 0 && numero <= 50 ? numero : null;
}

const dias = valor => (Number.isFinite(valor) ? `${valor} ${valor === 1 ? 'dia' : 'dias'}` : '');
const texto = valor => String(valor ?? '').trim();

/** Eixos do caso, cada um com seu próprio denominador, na ordem da matriz. */
export function buildPericialIntegration(caseData = {}) {
  const guided = caseData?.methodology?.guided || {};
  const temporarios = summarizeTemporaryDamages(caseData?.methodology?.temporary);
  const posas = buildPosasAssessmentFromGuided(guided);
  const aipe = aipeScore(guided);

  const eixo = (id, label, value, { unit = '', note = '', status, group } = {}) => Object.freeze({
    id, label, value: texto(value), unit, note, group,
    status: status || (texto(value) ? AXIS_STATUS.recorded : AXIS_STATUS.pending)
  });

  const temporais = [
    eixo('temporaryTotal', 'Incapacidade temporária total', dias(temporarios.totalDisabilityDays),
      { group: 'temporal', note: 'Somente período demonstrado e pertinente ao objeto pericial.' }),
    eixo('temporaryPartial', 'Incapacidade temporária parcial', dias(temporarios.partialDisabilityDays),
      { group: 'temporal', note: 'Grau e fundamento descritos separadamente; sem percentual inferido.' }),
    eixo('temporaryWork', 'Repercussão profissional temporária', dias(temporarios.workImpactDays),
      { group: 'temporal', note: 'Não se confunde com déficit funcional temporário.' }),
    eixo('consolidation', 'Consolidação médico-legal', temporarios.consolidationDate,
      { group: 'temporal', note: 'Permanentes só são valoráveis depois dela.' })
  ];

  const permanentes = [
    eixo('functional', 'Déficit funcional permanente', guided.permanentFunctionalStatus, {
      group: 'permanent',
      // A combinação numérica por capacidade restante existe implementada
      // (`internal-damage-source.js`) e ainda não tem tela. Declarar isso é mais
      // honesto do que exibir o eixo como se só faltasse a perita preencher.
      note: 'Combinação por capacidade restante (Balthazard) ainda sem tela no MedPer.'
    }),
    eixo('aesthetic', 'Prejuízo estético — AIPE', aipe === null ? '' : String(aipe), {
      group: 'permanent', unit: '/ 50',
      note: aipe === null ? 'Pontuação registrada em Exame e método.' : aipeCategoryFor(aipe)
    }),
    eixo('scarPatient', 'POSAS Patient', posas.patient.total === null ? '' : String(posas.patient.total),
      { group: 'permanent', unit: '/ 60', note: 'Qualidade cicatricial; não é pontuação de dano estético.' }),
    eixo('scarObserver', 'POSAS Observer', posas.observer.total === null ? '' : String(posas.observer.total),
      { group: 'permanent', unit: '/ 60', note: 'Independente do Patient; os dois não se somam.' })
  ];

  const repercussoes = [
    // Quantum doloris é registrado como síntese narrativa na etapa de danos
    // temporários. Não existe campo de graduação numérica, e não se inventa um:
    // graduar sofrimento exige referencial que o MedPer não declara ter.
    eixo('quantumDoloris', 'Quantum doloris', texto(guided.quantumDolorisSummary) ? 'Registrado' : '',
      { group: 'repercussion', note: 'Síntese narrativa; sem graduação numérica por ausência de referencial declarado.' }),
    ...PERMANENT_AXES.map(item => eixo(item.id, item.label, guided[item.field], { group: 'repercussion' }))
  ];

  return Object.freeze({
    axes: Object.freeze([...temporais, ...permanentes, ...repercussoes]),
    groups: Object.freeze([
      Object.freeze({ id: 'temporal', label: 'Danos temporários e consolidação' }),
      Object.freeze({ id: 'permanent', label: 'Eixos permanentes' }),
      Object.freeze({ id: 'repercussion', label: 'Dor e repercussões' })
    ]),
    blocks: INTEGRATION_BLOCKS,
    temporaryIssues: temporarios.issues,
    limitations: texto(guided.personalDamageLimitations),
    synthesis: texto(guided.personalDamageSynthesis),
    // Declarado no objeto para que a ausência seja legível, e não uma omissão
    // que alguém "conserta" de boa-fé seis meses depois.
    globalScore: null,
    globalScoreRule: 'Constructos heterogêneos não produzem escore global. A ausência é metodológica, não uma funcionalidade faltando.'
  });
}
