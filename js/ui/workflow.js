export const WORKFLOW_STAGES = [
  { id:'delimitation', label:'Delimitação' },
  { id:'evidence', label:'Autos e evidências' },
  { id:'timeline', label:'Cronologia' },
  { id:'hypotheses', label:'Hipóteses e diligências' },
  { id:'method', label:'Exame e método' },
  { id:'reasoning', label:'Fundamentação' },
  { id:'conclusion', label:'Conclusão' },
  { id:'questions', label:'Quesitos' },
  { id:'report', label:'Documento' }
];

const LEGACY_TABS = {
  summary:'delimitation',
  documents:'evidence',
  analysis:'reasoning'
};

export function normalizeWorkflowTab(value) {
  const candidate=LEGACY_TABS[value]||value;
  return WORKFLOW_STAGES.some(stage=>stage.id===candidate)?candidate:'delimitation';
}

// Em qual tela a médica registra a resposta de cada pendência da auditoria.
// É roteamento de interface, não classificação metodológica: severidade, texto e
// condição de cada pendência permanecem definidos exclusivamente em engine.js, e
// nenhuma pendência deixa de existir por causa deste mapa — ele apenas decide onde
// ela aparece em primeiro plano. O padrão é 'method' porque é a tela que renderiza
// o método geral e os protocolos específicos por inteiro.
//
// O critério é onde vive o CONTROLE que resolve a pendência, não onde a situação
// se origina. A distinção não é acadêmica: `context` e `purpose` nascem do
// enquadramento do caso, mas a ressalva de perfil contextual manda "selecionar
// protocolos/instrumentos manualmente", e tanto o seletor de protocolos quanto o
// card de instrumentos existem apenas em Exame e método
// (method-context-controller.js só se renderiza quando a rota termina em /method).
// Roteá-las para a Delimitação punha a ressalva ao lado de uma faixa somente-leitura,
// onde nada podia ser feito a respeito.
const AUDIT_FIELD_STAGES = {
  object:'delimitation',
  context:'method',
  purpose:'method',
  alternatives:'hypotheses',
  certainty:'conclusion'
};

export function stageForAuditField(field) {
  return AUDIT_FIELD_STAGES[field] || 'method';
}
