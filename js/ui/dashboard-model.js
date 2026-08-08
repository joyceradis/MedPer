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
