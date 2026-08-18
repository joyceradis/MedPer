import {AIPE_CATEGORIES,AIPE_IMPACT_BANDS} from './aipe.js';
import {bodilyDamageProtocol,getApplicableBodilyDamageProtocol} from './bodily-damage-protocol.js';
const q=(id,label,options)=>({id,label,options});
const n=(id,label,help)=>({id,label,help,type:'narrative'});
const aipeRange=category=>category.range[0]===category.range[1]?`${category.range[0]}`:`${category.range[0]}–${category.range[1]}`;
const AIPE_CATEGORY_OPTIONS=AIPE_CATEGORIES.map(category=>`${category.label} (${aipeRange(category)})`);
const AIPE_LEVEL_OPTIONS=[...new Set(Object.values(AIPE_IMPACT_BANDS).flatMap(bands=>bands.map(([level])=>level)))].concat('Não definido');
export const generalMethod=[
{id:'delimitation',title:'Delimitação',fields:[n('object','Objeto pericial','Registre exatamente o que deve ser esclarecido.'),n('controversies','Pontos controvertidos','Questões médicas efetivamente discutidas.'),n('methodChoice','Escolha metodológica','Justifique avaliação presencial, documental, indireta ou combinada.'),n('scopeLimits','Limites da atuação','Questões fora do objeto ou dependentes de outro especialista.')]},
{id:'material',title:'Material analisado',fields:[n('availableMaterial','Elementos disponíveis','Autos, prontuários, imagens, exames e literatura.'),n('missingMaterial','Elementos ausentes','Documentos ou dados necessários não disponibilizados.'),n('sourceQuality','Qualidade das fontes','Autoria, contemporaneidade, integridade e consistência.'),n('contradictions','Divergências documentais','Incompatibilidades entre registros, relato e exame.')]},
{id:'execution',title:'Execução técnica',fields:[n('directedHistory','Anamnese pericial dirigida','História orientada ao objeto.'),n('priorState','Estado anterior','Condições preexistentes e funcionalidade prévia.'),n('objectiveExam','Exame objetivo','Achados positivos e negativos relevantes.'),n('complementaryData','Exames complementares','Resultados e interpretação pericial.'),n('consistency','Consistência interna','Compatibilidade entre relato, documentos, exame e evolução.')]}
];
export const protocols={
bodily_damage:bodilyDamageProtocol,
aesthetic:{id:'aesthetic',title:'Dano estético',steps:[
{id:'eligibility',title:'1. Elegibilidade e consolidação',fields:[q('consolidationStatus','A alteração está consolidada?',['Sim, com fundamento registrado','Não','Não foi possível determinar']),q('objectiveChange','Existe alteração morfológica objetivamente examinável?',['Sim','Não','Avaliação exclusivamente documental','Elementos insuficientes']),q('priorAppearanceStatus','Como foi conhecido o estado estético anterior?',['Documentação objetiva','Apenas relato','Não há informação','Não se aplica'])]},
{id:'description',title:'2. Descrição objetiva',fields:[q('lesionType','Tipo principal de alteração',['Cicatriz','Discromia','Assimetria','Deformidade','Perda de segmento','Alteração de contorno','Outra']),q('topographyChoice','Região anatômica',['Face','Pescoço','Membro superior','Membro inferior','Tronco','Outra']),q('laterality','Lateralidade',['Direita','Esquerda','Mediana','Bilateral','Não aplicável']),q('morphology','Morfologia predominante',['Plana','Elevada','Deprimida','Retrátil','Aderida','Hipertrófica','Queloidiana','Irregular']),q('colorChoice','Coloração predominante',['Normocrômica','Hipocrômica','Hipercrômica','Eritematosa','Heterogênea','Outra']),n('dimensions','Dimensões e mensuração','Comprimento, largura, área aproximada e método de mensuração.'),n('topography','Descrição topográfica','Região, limites anatômicos e relação com áreas expostas.')]},
{id:'perception',title:'3. Percepção estática e dinâmica',fields:[q('distance','Em que distância a alteração se torna perceptível?',['Apenas em exame aproximado','Distância íntima','Distância social','Distância pública','Não perceptível nas condições examinadas']),q('gaze','O olhar é atraído para a alteração?',['Não','Discretamente','Claramente','De forma predominante']),q('movement','A mímica ou o movimento modificam a percepção?',['Não','Tornam mais evidente','Tornam menos evidente','Produzem deformação dinâmica','Não foi possível avaliar']),q('exposure','A região permanece habitualmente exposta?',['Sim','Parcialmente','Apenas em situações específicas','Não'])]},
{id:'photos',title:'4. Protocolo fotográfico',fields:[q('photos','A documentação fotográfica está tecnicamente adequada?',['Sim','Parcialmente','Não realizada','Não aplicável']),q('scale','Foi utilizada escala métrica?',['Sim','Não','Não aplicável']),q('lighting','Iluminação e enquadramento foram padronizados?',['Sim','Parcialmente','Não'])]},
{id:'aipe1',title:'5. AIPE — impressão do impacto',fields:[q('aipeVisibility','Visibilidade',['Não se vê ou praticamente não se vê','Vê-se','Vê-se claramente','É predominante']),q('aipeGaze','Fixação do olhar',['Não atrai','Atrai brevemente','O olhar se fixa','Domina a interação visual']),q('aipeMemory','Memória',['Não permanece','Pode ser lembrada','Permanece claramente','Protagoniza a lembrança']),q('aipeEmotion','Resposta emocional',['Não identificada','Ligeira','Moderada','Intensa']),q('aipeRelations','Relação interpessoal',['Sem alteração perceptível','Alteração discreta','Alteração relevante','Alteração profunda'])]},
{id:'aipe2',title:'6. AIPE — categoria e nível',fields:[q('aipeCategoryChoice','Categoria selecionada',AIPE_CATEGORY_OPTIONS),q('aipeLevel','Graduação dentro da categoria',AIPE_LEVEL_OPTIONS),n('aipeScore','Pontuação registrada','Registre a pontuação sem automatismo decisório. Confira contra a faixa da categoria e a graduação na tabela de referência acima.')]},
{id:'aipe4',title:'7. AIPE — critérios complementares',fields:[q('communication','Comunicação',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável']),q('sexualRelation','Relação sexual',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável']),q('specialExposure','Exposição transitória especial',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável']),q('professionalExposure','Atividade profissional específica',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável'])]},
{id:'synthesis',title:'8. Fundamentação e síntese',fields:[n('aipeRationale','Fundamentação da valoração','Explique por que os achados justificam a categoria e o nível.'),n('specificLimits','Limitações específicas','Ausência de estado anterior, limitações fotográficas ou de examinabilidade.')]}
]},
capacity:{id:'capacity',title:'Incapacidade',steps:[
{id:'condition',title:'1. Condição e função',fields:[q('diagnosisStatus','O diagnóstico está demonstrado?',['Sim','Parcialmente','Não','Inconclusivo']),q('functionalDeficitStatus','Há déficit funcional objetivo?',['Sim','Não','Parcialmente demonstrado','Não foi possível examinar']),n('nosology','Diagnóstico e elementos de sustentação','Diagnóstico, exames e achados pertinentes.')]},
{id:'activity',title:'2. Atividade habitual',fields:[q('activityKnown','A atividade habitual foi caracterizada?',['Sim, detalhadamente','Parcialmente','Não']),q('demandType','Exigência predominante',['Física','Cognitiva','Sensorial','Emocional','Mista']),n('usualActivity','Tarefas reais','Jornada, tarefas, ritmo e responsabilidades.'),n('jobDemands','Exigências da atividade','Demandas relevantes.')]},
{id:'capacity',title:'3. Capacidade residual e temporalidade',fields:[q('capacityDegree','Grau de incapacidade',['Ausente','Parcial','Total','Inconclusivo']),q('durationChoice','Duração provável',['Temporária','Permanente','Indeterminada']),q('rehabChoice','Reabilitação',['Possível','Possível com restrições','Improvável','Não analisada']),n('functionalDeficits','Limitações objetivas','Relacione achados às tarefas comprometidas.'),n('residualCapacity','Capacidade residual','O que permanece possível com segurança.'),n('onset','Data provável de início','Fundamento clínico-documental.'),n('prognosis','Prognóstico','Evolução esperada e tratamento pendente.')]}
]},
causation:{id:'causation',title:'Nexo causal e concausa',steps:[
{id:'event',title:'1. Evento ou exposição',fields:[q('eventProof','O evento ou exposição está demonstrado?',['Sim','Parcialmente','Apenas referido','Não']),q('intensity','A intensidade ou dose é suficiente?',['Sim','Possivelmente','Não','Indeterminada']),n('event','Caracterização do evento','Intensidade, duração, circunstâncias e fonte.')]},
{id:'compatibility',title:'2. Compatibilidades',fields:[q('temporalResult','Compatibilidade temporal',['Compatível','Parcialmente compatível','Incompatível','Indeterminada']),q('anatomicResult','Compatibilidade anatômica',['Compatível','Parcialmente compatível','Incompatível','Não aplicável']),q('mechanismResult','Plausibilidade fisiopatológica',['Plausível','Possível, mas fraca','Improvável','Indeterminada']),n('temporalCompatibility','Fundamentação temporal','Latência, início e evolução.'),n('anatomicCompatibility','Fundamentação anatômica','Relação entre mecanismo, topografia e lesão.'),n('physiopathology','Fundamentação fisiopatológica','Mecanismo médico-científico aplicável.')]},
{id:'alternatives',title:'3. Estado anterior e alternativas',fields:[q('priorContribution','O estado anterior contribuiu?',['Não identificado','Possivelmente','Sim, como concausa','Sim, como causa principal']),q('alternativesStatus','Causas alternativas foram avaliadas?',['Sim','Parcialmente','Não']),n('priorFactors','Estado anterior','Condições preexistentes relevantes.'),n('alternativeCauses','Causas alternativas','Compare hipóteses concorrentes.'),n('concauses','Concausas','Fatores com contribuição material.')]},
{id:'conclusion',title:'4. Síntese causal',fields:[q('causalChoice','Conclusão causal',['Nexo positivo','Nexo negativo','Concausalidade','Inconclusivo']),n('causalDegree','Fundamentação e grau de sustentação','Explique por que a conclusão é proporcional aos dados.')]}
]},
liability:{id:'liability',title:'Responsabilidade profissional',steps:[
{id:'context',title:'1. Contexto assistencial',fields:[q('initialSeverity','Gravidade inicial',['Leve','Moderada','Grave','Crítica','Indeterminada']),q('urgency','Contexto',['Eletivo','Urgente','Emergencial','Indeterminado']),n('initialCondition','Condição inicial','Gravidade, riscos e prognóstico de entrada.'),n('informationAtTime','Informações disponíveis à época','Considere apenas dados conhecidos ou razoavelmente acessíveis naquele momento.')]},
{id:'decision',title:'2. Indicação, alternativas e consentimento',fields:[q('indicationStatus','A indicação estava tecnicamente sustentada?',['Sim','Parcialmente','Não','Inconclusivo']),q('alternativesDiscussed','Alternativas foram consideradas?',['Sim','Parcialmente','Não','Não aplicável']),q('consentStatus','Informação e consentimento',['Adequados','Parciais','Insuficientes','Não documentados','Não aplicável']),n('indication','Indicação e alternativas','Justificativa contextualizada.'),n('consent','Informação e consentimento','Conteúdo e documentação disponíveis.')]},
{id:'execution',title:'3. Execução e acompanhamento',fields:[q('executionStatus','Execução técnica',['Compatível com a prática aceita','Há desvio possível','Há desvio demonstrado','Inconclusiva']),q('followStatus','Acompanhamento',['Adequado','Parcial','Inadequado','Não avaliável']),n('technicalExecution','Execução técnica','Atos realizados e comparação com a prática aceita.'),n('followUp','Acompanhamento','Monitoramento e resposta às intercorrências.')]},
{id:'outcome',title:'4. Resultado, dano e nexo',fields:[q('outcomeType','Natureza do resultado',['Evolução esperada','Risco inerente','Complicação','Possível desvio técnico','Indeterminada']),q('damageStatus','Há dano atual objetivamente demonstrado?',['Sim','Não','Parcialmente','Inconclusivo']),q('nexusStatus','Nexo entre eventual desvio e dano',['Demonstrado','Possível','Não demonstrado','Inconclusivo']),n('adverseOutcome','Resultado adverso ou complicação','Diferencie risco inerente, complicação e desvio.'),n('currentDamage','Dano atual','Descreva dano e repercussões.'),n('deviationDamageNexus','Nexo entre desvio e dano','Fundamente sem confundir resultado adverso com erro.')]}
]}
};

const genericProtocol = matter => ({
  id:'generic',
  title:matter||'Método específico',
  steps:[{id:'generic',title:'Método específico',fields:[
    n('specificQuestion','Pergunta técnica específica','Qual questão médica precisa ser resolvida?'),
    n('technicalProcedure','Procedimento técnico','Como a avaliação foi executada?'),
    n('specificCriteria','Critérios específicos','Parâmetros científicos e normativos.'),
    n('resultInterpretation','Interpretação','Como os resultados respondem ao objeto?')
  ]}]
});

const legacyMatterToProtocolId = {
  'Dano corporal':'bodily_damage',
  'Dano estético':'aesthetic',
  'Incapacidade':'capacity',
  'Nexo causal e concausa':'causation',
  'Responsabilidade profissional':'liability'
};
const suggestionRules = [
  ['aesthetic', /\b(dano|preju[ií]zo)\s+est[eé]tico\b|\bcicatriz\b|\bdeformidade\b/i],
  ['capacity', /\bincapacidad|\bcapacidade\s+(laboral|laborativa|funcional)|\brepercuss[aã]o\s+funcional/i],
  ['causation', /\bnexo\s+causal|\bconcaus|\bcausalidade\b/i],
  ['liability', /\bresponsabilidade\s+profissional|\berro\s+m[eé]dico|\bfalha\s+assistencial|\bdesvio\s+t[eé]cnico/i]
];

export function getProtocol(matterOrId){
  const id=protocols[matterOrId]?matterOrId:legacyMatterToProtocolId[matterOrId];
  return protocols[id]||genericProtocol(matterOrId);
}

export function getSuggestedProtocolIds(caseData={}){
  const primaryId=getProtocol(caseData.context?.matter).id;
  const explicit=new Set(Array.isArray(caseData.methodology?.activeProtocolIds)?caseData.methodology.activeProtocolIds:[]);
  const dismissed=new Set(Array.isArray(caseData.methodology?.dismissedProtocolIds)?caseData.methodology.dismissedProtocolIds:[]);
  const objectText=String(caseData.methodology?.general?.object||caseData.scope||'');
  return suggestionRules
    .filter(([id,pattern])=>id!==primaryId&&!explicit.has(id)&&!dismissed.has(id)&&pattern.test(objectText))
    .map(([id])=>id);
}

export function getApplicableProtocols(caseData={}){
  const primary=getProtocol(caseData.context?.matter);
  const ids=[
    primary.id,
    ...(Array.isArray(caseData.methodology?.activeProtocolIds)?caseData.methodology.activeProtocolIds:[])
  ];
  const seen=new Set();
  return ids.flatMap(id=>{
    if(seen.has(id))return [];
    seen.add(id);
    if(id==='generic')return [primary];
    if(id==='bodily_damage')return [getApplicableBodilyDamageProtocol(caseData)];
    const protocol=protocols[id];
    return protocol?[protocol]:[];
  });
}
