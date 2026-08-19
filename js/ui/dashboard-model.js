import { WORKFLOW_STAGES } from './workflow.js';

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function classifyDeadline(dueAt, now = new Date()) {
  const due = toDate(dueAt);
  const base = toDate(now);
  if (!due || !base) return 'neutral';

  const hours = (due.getTime() - base.getTime()) / 36e5;
  if (hours <= 48) return 'danger';
  if (hours <= 168) return 'warning';
  return 'neutral';
}

const text=v=>typeof v==='string'?Boolean(v.trim()):Boolean(v);
const anyText=o=>Object.values(o||{}).some(text);

// Progresso real da perícia, derivado do que está registrado no caso.
//
// A versão anterior desta barra era inteiramente fixa: "Etapa 5 de 9" para
// qualquer caso, com marcos — "Revisão de documentos / Exame / Laudo" — que nem
// correspondiam às nove etapas da navegação. A tela afirmava sobre o andamento
// do trabalho algo que não tinha como saber, e num sistema médico-pericial isso
// não é imprecisão de interface: é declaração falsa sobre o caso.
//
// Aqui cada etapa é considerada iniciada quando há registro dela no caso. Não
// julga qualidade nem suficiência — para isso existe a auditoria em engine.js.
const STAGE_HAS_RECORD={
  delimitation:c=>text(c.scope)||text(c.methodology?.general?.object),
  evidence:c=>(c.evidence?.length||0)>0||(c.facts?.length||0)>0,
  timeline:c=>(c.events?.length||0)>0,
  hypotheses:c=>text(c.methodology?.decision?.claim)||text(c.documentGaps),
  method:c=>['methodChoice','controversies','scopeLimits','availableMaterial','objectiveExam'].some(k=>text(c.methodology?.general?.[k]))||anyText(c.methodology?.specific)||anyText(c.methodology?.guided),
  reasoning:c=>['favorable','contrary','limits','alternatives'].some(k=>text(c.methodology?.decision?.[k])),
  conclusion:c=>text(c.methodology?.decision?.certainty)||text(c.methodology?.decision?.admissibleConclusion),
  questions:c=>(c.questions||[]).some(q=>text(q?.answer)),
  report:()=>false
};

export function caseStageProgress(caseData={}){
  const done=WORKFLOW_STAGES.map(stage=>Boolean(STAGE_HAS_RECORD[stage.id]?.(caseData)));
  const pending=done.indexOf(false);
  const currentIndex=pending===-1?WORKFLOW_STAGES.length-1:pending;
  return{
    done,
    started:done.filter(Boolean).length,
    total:WORKFLOW_STAGES.length,
    currentIndex,
    currentLabel:WORKFLOW_STAGES[currentIndex].label
  };
}

// Indicadores da prática — a transposição do "Health Analytics" (Expert
// Ocupacional) para a escala de uma perita: leitura agregada da própria
// carteira, derivada SOMENTE do que está registrado nos casos. Conta e
// distribui; não julga mérito, não interpreta, não recomenda. O que não foi
// registrado aparece como "Não registrado" — nunca é inventado.
export function buildPracticeIndicators(cases = [], now = new Date()) {
  const active = cases.filter(c => c.status === 'Em andamento');
  const completed = cases.filter(c => c.status === 'Concluída');

  const tally = pick => {
    const map = new Map();
    for (const c of active) {
      const key = (pick(c) || '').trim() || 'Não registrado';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
  };

  const stageCount = new Map();
  for (const c of active) {
    const p = caseStageProgress(c);
    stageCount.set(p.currentIndex, (stageCount.get(p.currentIndex) || 0) + 1);
  }
  const byStage = WORKFLOW_STAGES
    .map((stage, i) => ({ id: stage.id, label: stage.label, count: stageCount.get(i) || 0 }))
    .filter(entry => entry.count > 0);

  const deadlines = { danger: 0, warning: 0, neutral: 0 };
  for (const c of active) {
    for (const d of c.operations?.deadlines || []) {
      if (!toDate(d.dueAt)) continue;
      deadlines[classifyDeadline(d.dueAt, now)] += 1;
    }
  }

  return {
    counts: { active: active.length, completed: completed.length },
    bySphere: tally(c => c.context?.legalSphere || c.context?.branch),
    byMatter: tally(c => c.context?.matter),
    byStage,
    deadlines,
    pending: active.reduce((total, c) => total + (c.operations?.pendingActions?.length || 0), 0)
  };
}

export function buildDashboardModel(cases = [], now = new Date()) {
  const active = cases.filter(item => item.status === 'Em andamento');
  const completed = cases.filter(item => item.status === 'Concluída');
  const trash = cases.filter(item => item.status === 'Lixeira');

  const deadlines = active.flatMap(caseData =>
    (caseData.operations?.deadlines || []).map(deadline => ({
      ...deadline,
      caseId: caseData.id,
      caseTitle: caseData.title,
      severity: classifyDeadline(deadline.dueAt, now)
    }))
  )
    .filter(item => toDate(item.dueAt))
    .sort((a, b) => toDate(a.dueAt) - toDate(b.dueAt));

  const pendingCount = active.reduce(
    (total, caseData) => total + (caseData.operations?.pendingActions?.length || 0),
    0
  );

  return {
    counts: {
      active: active.length,
      completed: completed.length,
      trash: trash.length
    },
    continueCase: active[0] || null,
    deadlines,
    pendingCount
  };
}
