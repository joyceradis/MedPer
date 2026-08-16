const freeze = value => Object.freeze(value);

export const REFERENCE_CLASSES = freeze({
  'binding-norm': 'Norma ou obrigação aplicável',
  'validated-method': 'Método técnico validado/adotado',
  recommendation: 'Recomendação',
  'scientific-literature': 'Literatura científica',
  'teaching-material': 'Material didático',
  'pericial-practice-example': 'Exemplo de prática pericial'
});

export const KNOWLEDGE_SOURCES = freeze([
  freeze({
    id: 'abmlpm-dano-pessoal-2025',
    title: 'Diretriz para Avaliação do Dano Pessoal',
    citation: 'Associação Brasileira de Medicina Legal e Perícia Médica (ABMLPM). Diretriz para Avaliação do Dano Pessoal.',
    classes: ['recommendation'],
    nature: 'Diretriz profissional',
    authority: 'ABMLPM — associação brasileira da especialidade',
    version: 'Elaboração: agosto/novembro de 2025; lançamento oficial: 12/01/2026',
    scope: 'Avaliação do dano pessoal nas atividades médico-periciais, com foco declarado nos âmbitos cível e trabalhista.',
    topics: ['body-damage', 'aesthetic', 'functional', 'causation'],
    aliases: [
      'DIRETRIZ-PARA-VERIFICACAO-DO-DANO-CORPORAL-ABMLPM_FINAL-1(1).pdf',
      'DIRETRIZ-DO-DANO-CORPORAL-ABMLPM_FINAL(2).pdf'
    ],
    limitation: 'Não é classificada pelo MedPer como lei ou obrigação vinculante. A própria diretriz determina avaliação crítica e preserva a decisão do médico perito.',
    note: 'Os dois PDFs anexados têm conteúdo textual idêntico e são uma única fonte canônica.'
  }),
  freeze({
    id: 'abmlpm-tabela-dano-corporal-2024',
    title: 'Tabela Brasileira para Apuração do Dano Corporal',
    citation: 'Associação Brasileira de Medicina Legal e Perícia Médica (ABMLPM). Tabela Brasileira para Apuração do Dano Corporal.',
    classes: ['recommendation'],
    nature: 'Barema/tabela profissional',
    authority: 'ABMLPM — associação brasileira da especialidade',
    version: 'Lançamento: setembro de 2024',
    scope: 'Quantificação percentual de sequelas por sistema orgânico, incluindo Capítulo 10 (sistema cutâneo), para uso em perícia cível e trabalhista.',
    topics: ['body-damage', 'functional'],
    limitation: 'Documento distinto da Diretriz para Avaliação do Dano Pessoal (id abmlpm-dano-pessoal-2025) — mesma entidade, publicações diferentes, não confundir. O MedPer ainda não codifica nenhum artigo desta tabela: nenhuma pontuação, faixa ou regra de cumulação do Capítulo 10 está implementada. Registrada aqui apenas como fonte citável; qualquer valor do Capítulo 10 usado num laudo depende de leitura direta do documento pela perita.',
    note: 'A regra de cumulação aplicável aos arts. 69º/70º/73º (Capítulo 10) não foi confirmada por leitura direta do documento e não deve ser presumida a partir de fontes secundárias. A discussão de literatura sobre cumulação (soma direta × capacidade restante) vive nas issues do repositório, fora desta camada — este registro carrega apenas o que é bibliograficamente verificável da própria Tabela.'
  }),
  freeze({
    id: 'aipe-brasil-2016',
    title: 'Validação de instrumento para análise do dano estético no Brasil',
    citation: 'Fernandes MM, Cobo Plana JA, Bouchardet FCH, Michel-Crosato E, Oliveira RN. Saúde Debate. 2016;40(108):118–130. DOI: 10.1590/0103-1104-20161080010.',
    classes: ['validated-method', 'scientific-literature'],
    nature: 'Artigo original de tradução, adaptação cultural e validação',
    authority: 'Publicação científica revisada por pares; autores vinculados a USP, IML Zaragoza e PUC Minas, entre outros',
    version: 'Saúde em Debate, v. 40, n. 108, jan–mar 2016',
    scope: 'AIPE/Brasil aplicado à análise de prejuízo estético; validação com cirurgiões-dentistas e imagens de cicatrizes faciais simuladas.',
    topics: ['aesthetic'],
    aliases: ['DANO ESTETICO(2).pdf'],
    limitation: 'A amostra e o desenho do estudo delimitam a generalização. O instrumento auxilia a valoração e não substitui exame, fundamentação ou decisão pericial.'
  }),
  freeze({
    id: 'dano-estetico-imesc-2017',
    title: 'Valoração Médico-Pericial do Dano Estético',
    citation: 'Leal LPFF, Silva ER, Spina VPL, Borracini JA, Panza FT. Saúde, Ética & Justiça. 2017;22(1):41–49. DOI: 10.11606/issn.2317-2770.v22i1p41-49.',
    classes: ['scientific-literature', 'pericial-practice-example'],
    nature: 'Artigo científico com discussão metodológica e experiência institucional',
    authority: 'Periódico acadêmico da USP; autores ligados ao IMESC',
    version: 'Saúde, Ética & Justiça, v. 22, n. 1, 2017',
    scope: 'Diagnóstico e valoração do dano estético no contexto médico-pericial brasileiro.',
    topics: ['aesthetic', 'body-damage'],
    aliases: ['DANO ESTETICO - ARTIGO CIENTIFICO(2).pdf'],
    limitation: 'Literatura e experiência pericial não equivalem a norma vinculante; a aplicação depende do contexto jurídico e dos achados do caso.'
  }),
  freeze({
    id: 'rpdc-dano-corporal-brasil-2011',
    title: 'Avaliação do dano corporal no Brasil — o caso dos acidentes de viação',
    citation: 'Silva W, Magalhães T. Revista Portuguesa do Dano Corporal. 2011;(22):99–132.',
    classes: ['scientific-literature', 'pericial-practice-example'],
    nature: 'Artigo científico inserido em periódico especializado',
    authority: 'Revista Portuguesa do Dano Corporal / APADAC / Instituto Nacional de Medicina Legal, I.P.',
    version: 'Revista Portuguesa do Dano Corporal, ano XX, n. 22, dezembro de 2011',
    scope: 'Discussão da avaliação do dano corporal no Brasil em acidentes de viação, incluindo modelo corpo–funções–situações, nexo e consolidação.',
    topics: ['body-damage', 'functional', 'causation'],
    aliases: ['Estudo Tridimensional do Dano Corporal- Lesão, Função e Situação(2).pdf'],
    limitation: 'O anexo é o nº 22 completo da revista, não a monografia de 1998 sugerida pelo nome do arquivo. Referências legais e contextuais de 2011 podem estar superadas e não são promovidas a norma atual.'
  }),
  freeze({
    id: 'queimados-aguda-aula',
    title: 'Manejo Integrado do Paciente Queimado',
    citation: 'Material didático fornecido pela usuária, 20 slides.',
    classes: ['teaching-material'],
    nature: 'Apresentação didática',
    authority: 'Autoria e vínculo institucional não identificados no arquivo',
    version: 'Data não identificada no arquivo anexado',
    scope: 'Temas de queimadura aguda, caracterização inicial, tratamento e reabilitação.',
    topics: ['burns'],
    aliases: ['Aula de queimados - aguda(1).pptx'],
    limitation: 'Material didático secundário. Menções a ABA/ISBI não o transformam em diretriz dessas entidades; não deve sustentar isoladamente conduta clínica ou conclusão pericial.'
  })
]);

export const KNOWLEDGE_ITEMS = freeze([
  freeze({
    id: 'abmlpm-eligibility', sourceId: 'abmlpm-dano-pessoal-2025',
    topics: ['body-damage', 'aesthetic', 'functional', 'causation'], stages: ['delimitation', 'hypotheses', 'method'],
    title: 'Sequência de elegibilidade do dano pessoal',
    summary: 'A diretriz organiza a análise em conceito/origem, demonstração do dano, nexo causal, cura ou consolidação médico-legal e avaliação dos parâmetros pertinentes.',
    purpose: 'Checklist de completude metodológica; não altera o protocolo vigente.',
    strength: 'Recomendação institucional da ABMLPM.',
    limitation: 'A aplicação deve ser criticamente avaliada pelo perito; não é regra legal vinculante.',
    locator: 'DIRETRIZ-DO-DANO-CORPORAL-ABMLPM_FINAL(2).pdf — pp. 2–3'
  }),
  freeze({
    id: 'abmlpm-temporary-permanent', sourceId: 'abmlpm-dano-pessoal-2025',
    topics: ['body-damage', 'functional'], stages: ['method', 'reasoning'],
    title: 'Danos temporários e permanentes',
    summary: 'A diretriz diferencia déficit funcional temporário, repercussão profissional temporária e quantum doloris dos parâmetros permanentes, vinculando estes últimos à persistência de sequelas.',
    purpose: 'Lembrar quais dimensões merecem verificação no caso de dano pessoal.',
    strength: 'Recomendação institucional da ABMLPM.',
    limitation: 'Não converte terminologia da diretriz em campos obrigatórios nem substitui o enquadramento do caso.',
    locator: 'DIRETRIZ-DO-DANO-CORPORAL-ABMLPM_FINAL(2).pdf — pp. 4–7'
  }),
  freeze({
    id: 'abmlpm-aesthetic', sourceId: 'abmlpm-dano-pessoal-2025',
    topics: ['aesthetic'], stages: ['method', 'reasoning'],
    title: 'Dano estético permanente na diretriz ABMLPM',
    summary: 'A diretriz aborda repercussão estática e/ou dinâmica, imagem perante si e terceiros e harmonia corporal, recomendando escala de sete graus de gravidade crescente.',
    purpose: 'Expor a recomendação atual da associação ao lado de outros métodos, sem conversão automática.',
    strength: 'Recomendação institucional da ABMLPM.',
    limitation: 'A escala de sete graus não é automaticamente equivalente à pontuação AIPE/Brasil.',
    locator: 'DIRETRIZ-DO-DANO-CORPORAL-ABMLPM_FINAL(2).pdf — p. 6'
  }),
  freeze({
    id: 'three-dimensional-model', sourceId: 'rpdc-dano-corporal-brasil-2011',
    topics: ['body-damage', 'functional'], stages: ['evidence', 'method', 'reasoning'],
    title: 'Corpo, funções e situações',
    summary: 'O artigo descreve uma leitura tridimensional: alterações do corpo, capacidades físicas/mentais e repercussões nas situações concretas de vida, moduladas por fatores pessoais e ambientais.',
    purpose: 'Ampliar a checagem descritiva das repercussões sem impor novo schema ao caso.',
    strength: 'Literatura especializada e exemplo metodológico.',
    limitation: 'O artigo discute o modelo e cita Magalhães (1998); o anexo não é a obra original de 1998.',
    locator: 'Estudo Tridimensional do Dano Corporal- Lesão, Função e Situação(2).pdf — artigo pp. 117–118 (PDF pp. 118–119)'
  }),
  freeze({
    id: 'causation-before-valuation', sourceId: 'rpdc-dano-corporal-brasil-2011',
    topics: ['causation'], stages: ['hypotheses', 'method', 'reasoning'],
    title: 'Nexo antes da valoração',
    summary: 'O artigo trata o nexo como etapa anterior à valoração e discute mecanismo, encadeamento anatomoclínico, adequação temporal, estado anterior e causas alternativas.',
    purpose: 'Apoiar a verificação de hipóteses causais e a explicitação do raciocínio.',
    strength: 'Literatura especializada e exemplo de prática metodológica.',
    limitation: 'Não substitui critérios jurídicos aplicáveis nem atualiza automaticamente normas citadas no artigo de 2011.',
    locator: 'Estudo Tridimensional do Dano Corporal- Lesão, Função e Situação(2).pdf — artigo pp. 118–120 (PDF pp. 119–121)'
  }),
  freeze({
    id: 'aipe-four-frames', sourceId: 'aipe-brasil-2016',
    topics: ['aesthetic'], stages: ['method'],
    title: 'AIPE/Brasil — quatro quadros de referência',
    summary: 'O instrumento encadeia impressão do prejuízo estético, categoria, nível de impacto na categoria e critérios complementares.',
    purpose: 'Abrir a referência AIPE quando o dano estético for pertinente, mantendo a valoração humana.',
    strength: 'Método traduzido, adaptado culturalmente e validado no estudo brasileiro.',
    limitation: 'Validação com cirurgiões-dentistas e imagens faciais simuladas; não gera categoria ou pontuação automática.',
    locator: 'DANO ESTETICO(2).pdf — quadros 1–4, pp. 122–125 (PDF pp. 5–8)'
  }),
  freeze({
    id: 'aesthetic-individualized-method', sourceId: 'dano-estetico-imesc-2017',
    topics: ['aesthetic'], stages: ['method', 'reasoning'],
    title: 'Descrição contextualizada antes da escala',
    summary: 'O artigo enfatiza descrição personalizada do prejuízo estético em perspectivas estática e dinâmica e fundamentação técnica da valoração.',
    purpose: 'Apoiar fundamentação e contextualização sem transformar experiência institucional em regra.',
    strength: 'Literatura científica e experiência médico-pericial descrita por autores do IMESC.',
    limitation: 'Não é norma e não resolve divergências metodológicas com outras fontes.',
    locator: 'DANO ESTETICO - ARTIGO CIENTIFICO(2).pdf — pp. 45–47 (PDF pp. 5–7)'
  }),
  freeze({
    id: 'burn-depth-evidence', sourceId: 'queimados-aguda-aula',
    topics: ['burns'], stages: ['evidence', 'method'],
    title: 'Queimadura — dados para localizar no prontuário',
    summary: 'A aula organiza temas de profundidade, extensão de superfície corporal queimada, topografia e possível lesão inalatória na caracterização inicial.',
    purpose: 'Sugerir quais dados documentais conferir quando o caso mencionar queimadura.',
    strength: 'Material didático contextual.',
    limitation: 'Não é guideline nem fonte normativa; dados clínicos precisam ser confirmados em fontes do caso e, se necessário, diretrizes atuais primárias.',
    locator: 'Aula de queimados - aguda(1).pptx — slides 3–6 e 8–10'
  }),
  freeze({
    id: 'burn-evolution-reference', sourceId: 'queimados-aguda-aula',
    topics: ['burns'], stages: ['timeline'],
    title: 'Queimadura — organizar evolução e reabilitação',
    summary: 'A apresentação agrupa fase aguda, manejo cirúrgico, cicatrização e reabilitação em uma linha temporal didática.',
    purpose: 'Usar somente como roteiro para procurar datas reais na documentação do caso.',
    strength: 'Material didático contextual.',
    limitation: 'A sequência da aula não pode ser presumida como evolução do periciando nem como prazo normativo.',
    locator: 'Aula de queimados - aguda(1).pptx — slides 14–18'
  }),
  freeze({
    id: 'burn-scar-rehabilitation', sourceId: 'queimados-aguda-aula',
    topics: ['burns'], stages: ['method', 'reasoning'],
    title: 'Queimadura — cicatriz e reabilitação como contexto',
    summary: 'A aula inclui cicatriz hipertrófica, contraturas e reabilitação entre os temas tardios.',
    purpose: 'Orientar a busca de registros evolutivos relevantes em casos com queimadura e sequela estética.',
    strength: 'Material didático contextual.',
    limitation: 'Não converter condutas ou prazos da aula em critérios periciais normativos.',
    locator: 'Aula de queimados - aguda(1).pptx — slides 16–18'
  })
]);

export const REFERENCE_DIVERGENCES = freeze([
  freeze({
    id: 'aesthetic-scale-models',
    topics: ['aesthetic'],
    stages: ['method', 'reasoning'],
    title: 'Escalas de dano estético coexistentes',
    sourceIds: ['abmlpm-dano-pessoal-2025', 'aipe-brasil-2016', 'dano-estetico-imesc-2017'],
    description: 'A diretriz ABMLPM e o artigo de Leal et al. trabalham com escala de sete graus, enquanto o AIPE/Brasil estrutura categorias e pontuação de 0 a 50.',
    handling: 'Exibir as referências em paralelo; não converter automaticamente entre escalas e não escolher uma delas pelo usuário.'
  }),
  freeze({
    id: 'aipe-published-extreme-row',
    topics: ['aesthetic'],
    stages: ['method'],
    title: 'Inconsistência no Quadro 3 do AIPE/Brasil anexado',
    sourceIds: ['aipe-brasil-2016'],
    description: 'No PDF anexado, a categoria “Importantíssimo” é indicada como 31–50 no Quadro 2, mas a linha correspondente do Quadro 3 repete, na faixa de valor final, 25, 26, 27–28, 29 e 30.',
    handling: 'Manter a inconsistência documental explícita e conferir a fonte/metodologia antes de qualquer reconciliação; não corrigir nem converter automaticamente.'
  })
]);

const SOURCE_BY_ID = new Map(KNOWLEDGE_SOURCES.map(entry => [entry.id, entry]));

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function caseText(caseData = {}) {
  return normalize([
    caseData.title,
    caseData.context?.matter,
    caseData.scope,
    caseData.documentGaps,
    caseData.methodology?.general?.object,
    ...(caseData.evidence || []).flatMap(entry => [entry.title, entry.description]),
    ...(caseData.facts || []).flatMap(entry => [entry.text, entry.nature]),
    ...(caseData.events || []).flatMap(entry => [entry.title, entry.description])
  ].filter(Boolean).join(' '));
}

export function deriveCaseTopics(caseData = {}) {
  const text = caseText(caseData);
  const matter = normalize(caseData.context?.matter);
  const topics = new Set();
  if (/dano estetico|prejuizo estetico|cicatri|deformidade|imagem corporal|aparencia/.test(text) || matter === 'dano estetico') {
    topics.add('aesthetic');
    topics.add('body-damage');
  }
  if (/queimad|escaldad|termic|chama|combust/.test(text)) topics.add('burns');
  if (/dano corporal|dano pessoal|sequela|consolidacao|traumat|acidente|quantum doloris|deficit funcional/.test(text) || matter === 'dano corporal') topics.add('body-damage');
  if (/incapacidad|capacidade labor|limitacao funcional|deficit funcional|repercussao profissional|sequela/.test(text) || matter === 'incapacidade') topics.add('functional');
  if (/nexo causal|causalidade|concaus|imputabilidade/.test(text) || matter === 'nexo causal e concausa') topics.add('causation');
  return [...topics];
}

export function getRelevantKnowledge(caseData = {}, { stageId } = {}) {
  const topics = new Set(deriveCaseTopics(caseData));
  return KNOWLEDGE_ITEMS.filter(entry =>
    entry.topics.some(topic => topics.has(topic)) &&
    (!stageId || entry.stages.includes(stageId))
  );
}

export function getRelevantSources(caseData = {}, options = {}) {
  const seen = new Set();
  return getRelevantKnowledge(caseData, options).flatMap(entry => {
    if (seen.has(entry.sourceId)) return [];
    seen.add(entry.sourceId);
    return SOURCE_BY_ID.has(entry.sourceId) ? [SOURCE_BY_ID.get(entry.sourceId)] : [];
  });
}

export function getRelevantDivergences(caseData = {}, { stageId } = {}) {
  const topics = new Set(deriveCaseTopics(caseData));
  return REFERENCE_DIVERGENCES.filter(entry =>
    entry.topics.some(topic => topics.has(topic)) &&
    (!stageId || entry.stages.includes(stageId))
  );
}

export function getKnowledgeSource(sourceId) {
  return SOURCE_BY_ID.get(sourceId) || null;
}
