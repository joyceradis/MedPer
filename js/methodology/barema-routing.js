// Roteamento de barema funcional pelo regime de valoração declarado.
//
// Decisão da Founder (issue #56): a seleção do barema é determinada pela
// finalidade/natureza médico-jurídica da perícia — nunca pela etiologia do
// trauma. Um acidente de trânsito não implica automaticamente tabela DPVAT.
//
// O MedPer separa duas dimensões que a palavra "finalidade" confundia:
//   context.purposeId  — O QUE se avalia (dano pessoal, previdenciária, …)
//   regime de valoração — QUAL TABELA governa a quantificação funcional
// Este módulo trata apenas da segunda. Nada aqui afirma equivalência entre as
// duas listas; se elas se correspondem, e como, é decisão médico-pericial que
// permanece em aberto na issue #56.
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

// Regime de valoração: QUAL TABELA governa a quantificação funcional.
//
// Não confundir com a finalidade médico-pericial, que já existe em
// `context.purposeId` e responde a outra pergunta — O QUE está sendo avaliado
// (dano pessoal, previdenciária, trabalhista, forense). São duas dimensões
// distintas e assim nomeadas, por decisão da assistente técnica/UX: a primeira
// versão deste campo se chamava "finalidade" e colidia com a canônica, de modo
// que a mesma tela podia exibir duas finalidades diferentes e a auditoria
// declarava não-declarado algo que o sistema já conhecia.
//
// A perita declara o regime explicitamente — esta lista não é inferida de nada.
export const VALUATION_REGIME_OPTIONS = Object.freeze([
  Object.freeze({
    id: 'civil_liability',
    label: 'Responsabilidade civil — indenização contra causador, empresa ou empregador'
  }),
  Object.freeze({
    id: 'insurance_dpvat',
    label: 'Securitário — DPVAT (seguro obrigatório)'
  }),
  Object.freeze({ id: 'social_security', label: 'Benefício previdenciário' }),
  Object.freeze({ id: 'labor', label: 'Trabalhista/ocupacional' })
]);

// O caso persiste o `id`, nunca o rótulo. Invariante de engenharia 3/4 da
// arquitetura: label visível não é contrato do domínio, e id interno estável tem
// de sobreviver à mudança de redação da UI. Rótulos de versões anteriores deste
// campo continuam sendo reconhecidos aqui, para que nenhum registro fique órfão.
const LEGACY_REGIME_LABELS = Object.freeze({
  'Finalidade securitária — DPVAT ou tabela normativa equivalente': 'insurance_dpvat',
  'Securitário — DPVAT ou tabela normativa equivalente': 'insurance_dpvat'
});

export function normalizeRegimeId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (VALUATION_REGIME_OPTIONS.some(option => option.id === raw)) return raw;
  return VALUATION_REGIME_OPTIONS.find(option => option.label === raw)?.id
    || LEGACY_REGIME_LABELS[raw]
    || '';
}

function withRole(track, role) {
  return Object.freeze({ ...track, role });
}

// Não recebe etiologia/tipo de trauma — ver nota no topo do arquivo.
// dpvatQuesitoExplicit: true quando um quesito pede DPVAT por nome; nesse caso
// o trilho aparece como subsidiário, nunca substitui o principal em silêncio
// (issue #56: "pode haver cálculo subsidiário e separado, sem substituir
// silenciosamente o barema principal").
export function resolveFunctionalBaremaTrack({ regimeId, dpvatQuesitoExplicit = false } = {}) {
  if (regimeId === 'civil_liability') {
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

  // O rótulo desta opção dizia "DPVAT ou tabela normativa equivalente" e resolvia
  // sempre para o trilho DPVAT, cuja nota cita a Lei nº 6.194/1974 nominalmente.
  // Num seguro privado com tabela contratual, a tela afirmaria uma base normativa
  // que não governa o caso — o pior erro possível aqui, porque a perita pode
  // confiar nela. A opção passa a nomear exatamente o trilho que existe; regimes
  // securitários sem trilho registrado simplesmente não têm opção, que é o estado
  // verdadeiro do repositório.
  if (regimeId === 'insurance_dpvat') {
    return {
      principal: withRole(FUNCTIONAL_BAREMA_TRACKS.dpvat, 'principal'),
      subsidiary: [],
      requiresManualChoice: false,
      rationale: 'Regime securitário/normativo específico declarado: a tabela correspondente (DPVAT ou equivalente) é o barema principal desta perícia.'
    };
  }

  if (regimeId === 'social_security' || regimeId === 'labor') {
    return {
      principal: null,
      subsidiary: [],
      requiresManualChoice: true,
      // Não instrui uma ação que não tem controle. O MedPer declara o próprio limite
      // e diz onde a decisão vive; não existe campo de barema manual nem de
      // justificativa no repositório, e mandar "registre a justificativa" produziria
      // uma instrução impossível de cumprir.
      rationale: `Regime de valoração "${regimeId}" reconhecido. O MedPer não tem trilho de barema funcional registrado para ele: a seleção da tabela e sua fundamentação permanecem inteiramente com a perita, fora do sistema.`
    };
  }

  return {
    principal: null,
    subsidiary: [],
    requiresManualChoice: true,
    rationale: 'Regime de valoração ainda não declarado. A escolha do barema funcional depende dele — não deve ser inferida da causa do trauma.'
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
