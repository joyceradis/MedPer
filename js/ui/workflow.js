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
