const CONTEXT_ADAPTERS = {
  civil: {
    id: 'civil',
    purposeId: 'personal_damage_assessment',
    purposeLabel: 'Avaliação de dano pessoal',
    priorities: ['existência e características da alteração', 'permanência/consolidação', 'repercussão médico-pericial', 'limitações da avaliação'],
    conclusionBoundary: 'Conclusão médico-pericial limitada ao objeto, às evidências e aos quesitos; não define consequência jurídica.'
  },
  criminal: {
    id: 'criminal',
    purposeId: 'medicolegal_assessment',
    purposeLabel: 'Avaliação médico-legal',
    priorities: ['natureza e extensão dos achados', 'temporalidade', 'mecanismo e compatibilidade', 'permanência quando pertinente', 'quesitos médico-legais apresentados'],
    conclusionBoundary: 'Conclusão médico-legal limitada aos achados, compatibilidades, limitações e quesitos; não realiza tipificação penal.'
  },
  labor: {
    id: 'labor',
    purposeId: 'occupational_medicolegal_assessment',
    purposeLabel: 'Avaliação médico-pericial trabalhista/ocupacional',
    priorities: ['repercussão funcional', 'atividade habitual', 'nexo/concausa quando pertinente', 'capacidade residual', 'temporalidade e prognóstico'],
    conclusionBoundary: 'Conclusão médica sobre capacidade, limitações e causalidade quando cabível; não substitui decisão judicial trabalhista.'
  },
  social_security: {
    id: 'social_security',
    purposeId: 'social_security_assessment',
    purposeLabel: 'Avaliação médico-pericial previdenciária',
    priorities: ['condição atual', 'déficit funcional', 'atividade/participação', 'temporalidade', 'prognóstico e reabilitação quando pertinentes'],
    conclusionBoundary: 'Conclusão médica limitada aos requisitos técnicos examinados; não concede benefício nem decide direito.'
  },
  general: {
    id: 'general',
    purposeId: 'forensic_assessment',
    purposeLabel: 'Avaliação médico-pericial',
    priorities: ['objeto', 'evidências', 'exame', 'hipóteses alternativas', 'limitações', 'grau de sustentação'],
    conclusionBoundary: 'Conclusão médica proporcional às evidências e limitada ao escopo da atuação.'
  }
};

const CONTEXTUAL_PROFILES = {
  'civil:bodily_damage': {
    id: 'bodily_damage_civil',
    baseProtocolId: 'bodily_damage',
    title: 'Dano corporal / dano pessoal · contexto cível',
    suggestedInstrumentIds: [],
    priorities: ['objeto pericial', 'dano biológico demonstrável', 'nexo causal antes da valoração', 'cura ou consolidação médico-legal', 'danos temporários', 'eixos permanentes independentes', 'rastreabilidade do referencial utilizado'],
    cautions: ['Nexo indeterminado não equivale a nexo afastado.', 'Sem consolidação não cabe valoração permanente definitiva.', 'Déficit funcional, prejuízo estético, qualidade cicatricial, dor e repercussões são constructos independentes e não devem ser somados em um escore global.', 'Consequência jurídica e valor indenizatório permanecem fora do motor médico-pericial.']
  },
  'civil:aesthetic_damage': {
    id: 'aesthetic_damage_civil',
    baseProtocolId: 'aesthetic',
    title: 'Dano estético · contexto cível',
    suggestedInstrumentIds: ['aipe'],
    priorities: ['descrição morfológica', 'estado anterior', 'consolidação/permanência', 'visibilidade e percepção', 'documentação fotográfica', 'fundamentação da repercussão estética'],
    cautions: ['AIPE é instrumento possível, não obrigatório.', 'A valoração não deve ser automatizada.', 'A conclusão permanece médica e limitada ao objeto/quesitos.']
  },
  'criminal:aesthetic_damage': {
    id: 'aesthetic_damage_criminal',
    baseProtocolId: 'aesthetic',
    title: 'Alteração estética/sequela · contexto criminal',
    suggestedInstrumentIds: [],
    priorities: ['descrição objetiva da alteração', 'mecanismo', 'cronologia', 'compatibilidade', 'permanência quando pertinente', 'resposta aos quesitos médico-legais'],
    cautions: ['Não reutilizar automaticamente a valoração cível.', 'AIPE não é sugerida por padrão neste perfil.', 'Não realizar tipificação penal automática.']
  },
  'labor:capacity': {
    id: 'capacity_labor',
    baseProtocolId: 'capacity',
    title: 'Incapacidade · contexto trabalhista',
    suggestedInstrumentIds: [],
    priorities: ['atividade habitual real', 'exigências funcionais', 'déficit objetivo', 'capacidade residual', 'temporalidade', 'nexo/concausa quando integrante do objeto'],
    cautions: ['Diagnóstico isolado não demonstra incapacidade.', 'Conclusão funcional deve permanecer ligada às tarefas e aos achados.']
  },
  'social_security:capacity': {
    id: 'capacity_social_security',
    baseProtocolId: 'capacity',
    title: 'Incapacidade · contexto previdenciário',
    suggestedInstrumentIds: [],
    priorities: ['déficit funcional', 'atividade habitual', 'capacidade residual', 'temporalidade', 'prognóstico/reabilitação quando pertinentes'],
    cautions: ['O sistema não decide elegibilidade jurídica a benefício.']
  }
};

function unique(values){return [...new Set(values.filter(Boolean))];}

function inferredPurposeId(caseData={}){
  const explicit=caseData.context?.purposeId;
  if(explicit)return explicit;
  const sphere=caseData.context?.legalSphereId||'';
  return (CONTEXT_ADAPTERS[sphere]||CONTEXT_ADAPTERS.general).purposeId;
}

export function getMethodologyContext(caseData={}){
  const c=caseData.context||{};
  const adapter=CONTEXT_ADAPTERS[c.legalSphereId]||CONTEXT_ADAPTERS.general;
  return {
    settingId:c.settingId||'',
    legalSphereId:c.legalSphereId||'',
    roleId:c.roleId||'',
    matterId:c.matterId||'',
    purposeId:inferredPurposeId(caseData),
    purposeLabel:(c.purposeId?null:adapter.purposeLabel),
    questions:Array.isArray(caseData.questions)?caseData.questions:[],
    priorities:[...adapter.priorities],
    conclusionBoundary:adapter.conclusionBoundary
  };
}

export function getContextualProtocolProfile(caseData={}){
  const c=caseData.context||{};
  const key=`${c.legalSphereId||''}:${c.matterId||''}`;
  const specific=CONTEXTUAL_PROFILES[key];
  if(specific)return structuredClone(specific);
  return {
    id:`${c.matterId||'generic'}_${c.legalSphereId||'general'}`,
    baseProtocolId:null,
    title:'Perfil contextual ainda não validado',
    suggestedInstrumentIds:[],
    priorities:[],
    cautions:['Utilizar o método geral e selecionar manualmente protocolos/instrumentos até existir perfil contextual validado.']
  };
}

export function getSuggestedInstrumentIds(caseData={}){
  const profile=getContextualProtocolProfile(caseData);
  const active=new Set(Array.isArray(caseData.methodology?.activeInstrumentIds)?caseData.methodology.activeInstrumentIds:[]);
  const dismissed=new Set(Array.isArray(caseData.methodology?.dismissedInstrumentIds)?caseData.methodology.dismissedInstrumentIds:[]);
  return unique((profile.suggestedInstrumentIds||[]).filter(id=>!active.has(id)&&!dismissed.has(id)));
}

export function getApplicableInstrumentIds(caseData={}){
  const active=Array.isArray(caseData.methodology?.activeInstrumentIds)?caseData.methodology.activeInstrumentIds:[];
  return unique([...active,...getSuggestedInstrumentIds(caseData)]);
}

export { CONTEXT_ADAPTERS, CONTEXTUAL_PROFILES };
