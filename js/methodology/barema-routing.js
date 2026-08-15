// Roteamento de barema funcional por finalidade médico-jurídica.
//
// Decisão da Founder (issue #56): a seleção do barema é determinada pela
// finalidade/natureza médico-jurídica da perícia — nunca pela etiologia do
// trauma. Um acidente de trânsito não implica automaticamente tabela DPVAT.
//
// Este módulo não contém pontuação, fórmula de pontos nem conteúdo de escala
// de nenhum barema. Cada trilho é só uma referência (id + rótulo + status do
// dado) até que a Founder valide e o conteúdo entre no repositório por decisão
// explícita — a mesma disciplina já aplicada a js/knowledge/library.js.
//
// Garantia estrutural, não só documental: `resolveFunctionalBaremaTrack` não
// tem parâmetro de etiologia/tipo de trauma. Não é possível, nem por engano,
// fazer a etiologia influenciar o trilho escolhido — a assinatura da função
// não permite.

export const FUNCTIONAL_BAREMA_TRACKS = Object.freeze({
  abmlpm_functional: Object.freeze({
    id: 'abmlpm_functional',
    label: 'Tabela Brasileira para Apuração do Dano Corporal (ABMLPM)',
    hasScoringData: false,
    note: 'Fonte citada em js/knowledge/library.js (abmlpm-tabela-dano-corporal-2024). Pontuação e regra de cumulação do Capítulo 10 ainda não confirmadas por leitura direta — ver issue #55.'
  }),
  dpvat: Object.freeze({
    id: 'dpvat',
    label: 'Tabela DPVAT / seguro obrigatório',
    hasScoringData: false,
    note: 'Base normativa verificada por triangulação (issue #55): Lei nº 6.194/1974, art. 3º, §1º, com a tabela anexa na redação da Lei nº 11.945/2009 — perda parcial completa aplica o percentual da tabela; perda parcial incompleta sofre dupla redução, pelo enquadramento no segmento e depois pela intensidade da sequela. Os percentuais NÃO estão codificados no MedPer; qualquer cálculo depende de leitura direta da norma pela perita.'
  })
});

// Rótulos exibidos na UI (protocols.js deriva as opções daqui, no mesmo idioma
// já usado para AIPE: a entrada nunca duplica a taxonomia à mão). A perita
// declara a finalidade explicitamente — esta lista não é inferida de nada.
export const FINALIDADE_OPTIONS = Object.freeze([
  Object.freeze({
    id: 'civil_liability',
    label: 'Responsabilidade civil — indenização contra causador, empresa ou empregador'
  }),
  Object.freeze({
    id: 'insurance_dpvat',
    label: 'Finalidade securitária — DPVAT ou tabela normativa equivalente'
  }),
  Object.freeze({ id: 'social_security', label: 'Benefício previdenciário' }),
  Object.freeze({ id: 'labor', label: 'Trabalhista/ocupacional' })
]);

// O caso persiste o `id`, nunca o rótulo. Invariante de engenharia 3/4 da
// arquitetura: label visível não é contrato do domínio, e id interno estável tem
// de sobreviver à mudança de redação da UI. Casos gravados antes desta correção
// guardaram o rótulo; são reconhecidos aqui e migrados pelo store.
export function normalizeFinalidadeId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (FINALIDADE_OPTIONS.some(option => option.id === raw)) return raw;
  return FINALIDADE_OPTIONS.find(option => option.label === raw)?.id || '';
}

// Em quais casos a escolha de barema funcional está em jogo — e, portanto, a
// finalidade precisa estar declarada.
//
// Esta é a lista mínima conservadora, não uma classificação médico-pericial
// completa. Cobre o protocolo de incapacidade e a matéria "Dano corporal", que é
// oferecida no cadastro, não tem protocolo próprio (cai no genérico) e é a
// matéria a que a Tabela Brasileira para Apuração do Dano Corporal se dirige pelo
// próprio nome. Gatear apenas em `capacity` deixava justamente o caso central da
// issue #56 fora do roteador. Ampliar ou reduzir esta lista é decisão
// metodológica e não deve ser feita aqui em silêncio.
//
// Como o resolvedor, não recebe etiologia nem tipo de trauma.
const FUNCTIONAL_BAREMA_MATTERS = Object.freeze(['Dano corporal']);
const FUNCTIONAL_BAREMA_MATTER_IDS = Object.freeze(['capacity']);

export function functionalBaremaIsAtStake({ matter = '', matterId = '', protocolIds = [] } = {}) {
  if (new Set(protocolIds).has('capacity')) return true;
  if (FUNCTIONAL_BAREMA_MATTER_IDS.includes(String(matterId).trim())) return true;
  return FUNCTIONAL_BAREMA_MATTERS.includes(String(matter).trim());
}

function withRole(track, role) {
  return Object.freeze({ ...track, role });
}

// Não recebe etiologia/tipo de trauma — ver nota no topo do arquivo.
// dpvatQuesitoExplicit: true quando um quesito pede DPVAT por nome; nesse caso
// o trilho aparece como subsidiário, nunca substitui o principal em silêncio
// (issue #56: "pode haver cálculo subsidiário e separado, sem substituir
// silenciosamente o barema principal").
export function resolveFunctionalBaremaTrack({ finalidadeId, dpvatQuesitoExplicit = false } = {}) {
  if (finalidadeId === 'civil_liability') {
    const subsidiary = dpvatQuesitoExplicit
      ? [{
          ...withRole(FUNCTIONAL_BAREMA_TRACKS.dpvat, 'subsidiary'),
          rationale: 'Quesito judicial pediu cálculo por DPVAT explicitamente. Cálculo subsidiário e separado — não substitui o barema principal.'
        }]
      : [];
    return {
      principal: withRole(FUNCTIONAL_BAREMA_TRACKS.abmlpm_functional, 'principal'),
      subsidiary,
      requiresManualChoice: false,
      rationale: 'Responsabilidade civil contra causador, empresa ou empregador: o barema funcional principal é o de dano corporal geral (ABMLPM), não um regime securitário específico — mesmo que o evento tenha sido um acidente de trânsito.'
    };
  }

  if (finalidadeId === 'insurance_dpvat') {
    return {
      principal: withRole(FUNCTIONAL_BAREMA_TRACKS.dpvat, 'principal'),
      subsidiary: [],
      requiresManualChoice: false,
      rationale: 'Finalidade securitária/normativa específica declarada: a tabela correspondente (DPVAT ou equivalente) é o barema principal desta perícia.'
    };
  }

  if (finalidadeId === 'social_security' || finalidadeId === 'labor') {
    return {
      principal: null,
      subsidiary: [],
      requiresManualChoice: true,
      rationale: `Finalidade "${finalidadeId}" reconhecida, mas o MedPer ainda não tem um trilho de barema funcional específico registrado para ela. Selecione manualmente e registre a justificativa.`
    };
  }

  return {
    principal: null,
    subsidiary: [],
    requiresManualChoice: true,
    rationale: 'Finalidade médico-jurídica da perícia ainda não foi declarada. A escolha do barema funcional depende dela — não deve ser inferida da causa do trauma.'
  };
}

// Contrato estrutural: eixos de dano (funcional, estético, repercussão
// profissional, quantum doloris) nunca são somados entre si — são dimensões
// distintas (issue #56, invariante 2). Esta função agrupa para exibição lado a
// lado; nenhuma operação aritmética entre eixos existe neste módulo nem em
// qualquer outro do MedPer.
export function combineAxisResults(axisResults = []) {
  return Object.freeze(axisResults.map(entry => Object.freeze({ ...entry })));
}

// Regra da capacidade restante (Balthazard): fórmula matemática geral e
// publicamente documentada, não conteúdo médico-pericial — o que a torna
// segura para implementar aqui. Usa como base, a partir da segunda sequela, o
// percentual restante após a primeira, nunca 100% de novo.
//
// Só deve ser chamada quando o barema aplicável expressamente permitir
// (issue #56, invariante 5) e apenas dentro do domínio funcional — esta
// função não decide isso, apenas calcula uma composição já autorizada.
export function remainingCapacity(sequelaePercentages = []) {
  let remaining = 100;
  for (const pct of sequelaePercentages) {
    remaining -= (remaining * pct) / 100;
  }
  return Math.round((100 - remaining) * 100) / 100;
}
