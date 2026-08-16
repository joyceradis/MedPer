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
const AUDIT_FIELD_STAGES = {
  object:'delimitation',
  context:'delimitation',
  purpose:'delimitation',
  alternatives:'hypotheses',
  certainty:'conclusion'
};

export function stageForAuditField(field) {
  return AUDIT_FIELD_STAGES[field] || 'method';
}
