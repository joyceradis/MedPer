const FILTER_STATUS = {
  active:'Em andamento',
  completed:'Concluída',
  trash:'Lixeira'
};

export const CASE_FILTERS = [
  { id:'active', label:'Em andamento' },
  { id:'completed', label:'Concluídas' },
  { id:'trash', label:'Lixeira' }
];

export function filterCasesByLifecycle(cases=[], filter='active') {
  const status=FILTER_STATUS[filter]||FILTER_STATUS.active;
  return cases.filter(caseData=>caseData.status===status);
}

export function countCasesByLifecycle(cases=[]) {
  return Object.fromEntries(
    CASE_FILTERS.map(({id})=>[id,filterCasesByLifecycle(cases,id).length])
  );
}

export function applyLifecycleAction(caseData, action) {
  caseData.lifecycle ||= {};
  if(action==='complete')caseData.status='Concluída';
  if(action==='reopen')caseData.status='Em andamento';
  if(action==='trash'){
    if(caseData.status!=='Lixeira')caseData.lifecycle.previousStatus=caseData.status;
    caseData.status='Lixeira';
  }
  if(action==='restore'){
    caseData.status=caseData.lifecycle.previousStatus==='Concluída'?'Concluída':'Em andamento';
    delete caseData.lifecycle.previousStatus;
  }
  return caseData;
}
