import { normalizeCaseRecord } from './case-record.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const nl = value => esc(value).replace(/\n/g,'<br>');
const section = (title, body) => body ? `<section><h2>${esc(title)}</h2><div>${nl(body)}</div></section>` : '';

export function composeCaseDocument(record) {
  const c = normalizeCaseRecord(record);
  const sources = c.sources.length ? `<section><h2>Fontes e documentos</h2><ol>${c.sources.map(s=>`<li><strong>${esc(s.title||s.type)}</strong>${s.date?` — ${esc(s.date)}`:''}${s.origin?` — ${esc(s.origin)}`:''}${s.notes?`<br>${nl(s.notes)}`:''}</li>`).join('')}</ol></section>` : '';
  const timeline = c.timeline.length ? `<section><h2>Cronologia</h2><ol>${c.timeline.map(e=>`<li><strong>${esc(e.date||'Data não informada')} — ${esc(e.title)}</strong>${e.description?`<br>${nl(e.description)}`:''}</li>`).join('')}</ol></section>` : '';
  const questions = c.questions.length ? `<section><h2>Quesitos</h2>${c.questions.map((q,i)=>`<div class="question"><strong>${i+1}. ${esc(q.question)}</strong><p>${nl(q.answer)}</p></div>`).join('')}</section>` : '';
  const header = `<header><h1>${esc(c.document.title||'Laudo médico-pericial')}</h1><p><strong>Caso:</strong> ${esc(c.identity.title)}</p>${c.identity.processNumber?`<p><strong>Processo:</strong> ${esc(c.identity.processNumber)}</p>`:''}${c.identity.court?`<p><strong>Origem:</strong> ${esc(c.identity.court)}</p>`:''}${c.examinedPerson.name?`<p><strong>Parte examinada:</strong> ${esc(c.examinedPerson.name)}</p>`:''}${c.context.object?`<p><strong>Objeto:</strong> ${esc(c.context.object)}</p>`:''}</header>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(c.identity.title)}</title><style>body{font-family:Georgia,serif;line-height:1.55;color:#111;max-width:180mm;margin:14mm auto;font-size:11pt}h1{font-size:18pt;text-align:center}h2{font-size:13pt;margin-top:22px;border-bottom:1px solid #bbb;padding-bottom:4px}p{margin:6px 0}.question{break-inside:avoid}@page{size:A4;margin:18mm}@media print{body{margin:0;max-width:none}}</style></head><body>${header}${section('Introdução',c.document.introduction)}${sources}${timeline}${section('História e antecedentes',[c.history.summary,c.history.antecedents,c.history.treatments,c.history.complaints,c.history.limitations].filter(Boolean).join('\n\n'))}${section('Exame pericial',[c.examination.summary,c.examination.positives,c.examination.negatives,c.examination.measurements,c.examination.limitations].filter(Boolean).join('\n\n'))}${section('Análise médico-pericial',[c.analysis.medicoLegalQuestion,c.analysis.favorable,c.analysis.contrary,c.analysis.priorState,c.analysis.alternatives,c.analysis.reasoning,c.analysis.limitations,c.document.discussion].filter(Boolean).join('\n\n'))}${questions}${section('Conclusão',[c.conclusion.summary,c.conclusion.nexus,c.conclusion.incapacity,c.conclusion.aestheticDamage,c.conclusion.functionalDamage,c.conclusion.prognosis].filter(Boolean).join('\n\n'))}${section('Assinatura',c.document.signature)}</body></html>`;
}

export function composePlainText(record) {
  const c = normalizeCaseRecord(record);
  return [c.document.title||'Laudo médico-pericial', c.identity.title, c.identity.processNumber, c.context.object, c.history.summary, c.examination.summary, c.analysis.reasoning, c.conclusion.summary].filter(Boolean).join('\n\n');
}
