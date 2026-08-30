// Guia de seleção de instrumentos — justificativa para AUXILIAR a escolha.
//
// Diretriz da Founder (30/08/2026, registrada na issue #56): não se usam todas
// as tabelas disponíveis, e sim a adequada a cada caso, conforme o objeto da
// perícia e as delimitações do juízo. O perito escolhe — mas "ninguém grava
// qual tabela usar e para qual área ela serve", então o sistema apresenta a
// justificativa de cada instrumento para AUXILIAR a escolha. Auxiliar, não
// decidir: nada aqui seleciona instrumento automaticamente.
//
// Cada entrada é TRANSCRIÇÃO de fonte já governada neste repositório — a
// matriz interna v1.5, os invariantes da issue #56, `aipe.js`, `posas.js`,
// `barema-routing.js`. Nenhuma frase abaixo é regra nova: quem quiser conferir
// uma afirmação encontra a origem no campo `basis` da própria entrada.

export const INSTRUMENT_GUIDE = Object.freeze({
  aipe: Object.freeze({
    id: 'aipe',
    label: 'AIPE — Brasil',
    construct: 'Prejuízo estético: impressão e impacto da alteração da imagem corporal.',
    whenAdequate: 'Trilho de prejuízo estético, quando há alteração pejorativa permanente da imagem, distinta da função. Pode coexistir com a avaliação funcional.',
    boundaries: Object.freeze([
      'AIPE não prova nexo — o nexo precede a valoração.',
      'Não mede qualidade cicatricial: isso é o POSAS, em trilho próprio.',
      'A pontuação (0–50) não se soma a nenhum outro eixo.'
    ]),
    basis: 'Fernandes et al., Saúde Debate 2016;40(108) · issue #56, invariante 3 · matriz interna v1.5, etapa 3/6.'
  }),

  posas: Object.freeze({
    id: 'posas',
    label: 'POSAS 2.0',
    construct: 'Qualidade morfológica da cicatriz, em duas escalas independentes (Patient e Observer).',
    whenAdequate: 'Caracterização cicatricial complementar, na área definida para o instrumento, quando a qualidade da cicatriz é pertinente ao objeto.',
    boundaries: Object.freeze([
      'Não alimenta matematicamente a AIPE nem é pontuação de dano estético.',
      'Não valora amputação em si.',
      'Patient e Observer não se somam entre si; a opinião global fica separada.',
      'Não substitui exame tátil por fotografia.'
    ]),
    basis: 'POSAS 2.0 — posas.nl · issue #56, invariante 4 · matriz interna v1.5, etapa 4/6.'
  }),

  balthazard: Object.freeze({
    id: 'balthazard',
    label: 'Balthazard / capacidade restante',
    construct: 'Não é instrumento de medida: é REGRA DE COMBINAÇÃO de déficits funcionais já valorados, pela capacidade restante.',
    whenAdequate: 'Somente dentro do domínio funcional, com múltiplas sequelas independentes, e quando o barema aplicável expressamente permitir a combinação.',
    boundaries: Object.freeze([
      'Não cria percentual clínico — combina percentuais que a perita já fixou pelo referencial.',
      'Não combina estética, profissão ou dor com déficit funcional.',
      'A forma inversa (D = (F − Ea) / (1 − Ea)) isola estado anterior funcional QUANTIFICÁVEL; não converte concausa ou predisposição em percentual.'
    ]),
    basis: 'Issue #56, invariante 5 · matriz interna v1.5, etapa 2/6 (`internal-damage-source.js`).'
  }),

  abmlpm_functional: Object.freeze({
    id: 'abmlpm_functional',
    label: 'Tabela ABMLPM (dano corporal)',
    construct: 'Barema funcional: quantificação do déficit funcional permanente.',
    whenAdequate: 'Trilho funcional principal quando o regime de valoração é responsabilidade civil — mesmo que o evento tenha sido acidente de trânsito. A etiologia do trauma nunca seleciona a tabela.',
    boundaries: Object.freeze([
      'A pontuação NÃO está codificada no MedPer: a aplicação depende de leitura direta do instrumento pela perita.',
      'Um constructo, uma régua principal: não se aplica simultaneamente com outro barema funcional ao mesmo déficit.'
    ]),
    basis: 'Issue #56 (regra canônica e invariante 1) · `barema-routing.js` (trilho sem dado de pontuação — issue #55).'
  }),

  dpvat: Object.freeze({
    id: 'dpvat',
    label: 'Tabela DPVAT (seguro obrigatório)',
    construct: 'Barema securitário normativo: percentuais da tabela anexa à Lei nº 6.194/1974 (redação da Lei nº 11.945/2009).',
    whenAdequate: 'Quando a finalidade securitária/normativa do caso exige DPVAT, ou como cálculo SUBSIDIÁRIO e separado quando um quesito judicial o pede por nome — sem substituir o barema principal.',
    boundaries: Object.freeze([
      'Acidente de trânsito NÃO implica DPVAT: a seleção vem do regime de valoração, nunca da etiologia.',
      'Os percentuais não estão codificados no MedPer; qualquer cálculo depende de leitura direta da norma pela perita.'
    ]),
    basis: 'Issue #56 (regra canônica) · `barema-routing.js` (base normativa triangulada — issue #55).'
  })
});

export function instrumentGuidance(instrumentId) {
  if (typeof instrumentId !== 'string' || !Object.hasOwn(INSTRUMENT_GUIDE, instrumentId)) return null;
  return INSTRUMENT_GUIDE[instrumentId];
}

// Correspondência entre finalidade canônica (O QUE se avalia) e regime de
// valoração (QUAL tabela quantifica) — a pergunta que a issue #56 deixou em
// aberto, decidida pela Founder em 30/08/2026: as duas listas permanecem, com
// mapa validado entre elas.
//
// `null` é declaração, não omissão: avaliação médico-legal e forense não têm
// regime de valoração correspondente, e o regime DPVAT não tem finalidade
// canônica própria — é alcançado pela declaração explícita da perita, nunca
// por inferência.
export const PURPOSE_REGIME_CORRESPONDENCE = Object.freeze({
  personal_damage_assessment: 'civil_liability',
  social_security_assessment: 'social_security',
  occupational_medicolegal_assessment: 'labor',
  medicolegal_assessment: null,
  forensic_assessment: null
});

// Sugestão, nunca seleção: a issue #56 exige escolha consciente e documentada
// quando há mais de um referencial possível (comportamento esperado, itens 3 e
// 4). O retorno carrega a justificativa exatamente para a tela AUXILIAR — a
// declaração do regime continua sendo ato da perita.
export function suggestedRegimeForPurpose(purposeId) {
  const regimeId = (typeof purposeId === 'string' && Object.hasOwn(PURPOSE_REGIME_CORRESPONDENCE, purposeId))
    ? PURPOSE_REGIME_CORRESPONDENCE[purposeId]
    : null;
  if (!regimeId) return null;
  return Object.freeze({
    regimeId,
    rationale: 'Correspondência validada pela Founder (issue #56, 30/08/2026) entre a finalidade deste caso e o regime de valoração. Sugestão para conferência — a declaração do regime é sua.'
  });
}
