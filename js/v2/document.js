import { normalizeCaseRecord } from './case-record.js';
import { buildPosasAssessmentFromGuided } from '../methodology/posas.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[ch]));
const nl = value => esc(value).replace(/\n/g, '<br>');
const section = (title, body) => body ? `<section><h2>${esc(title)}</h2><div>${nl(body)}</div></section>` : '';
const labelize = value => String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());

function sourceMap(caseRecord) {
  return new Map(caseRecord.sources.map(source => [source.id, source.title || source.type || source.id]));
}

function methodologySection(caseRecord) {
  const lines = [];
  if (caseRecord.methodology.notes) lines.push(`<p>${nl(caseRecord.methodology.notes)}</p>`);

  const aipe = caseRecord.methodology.aipe || {};
  const aipeEntries = Object.entries(aipe).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  if (aipeEntries.length) {
    const preferred = [];
    if (aipe.category) preferred.push(`<li><strong>Categoria:</strong> ${esc(labelize(aipe.category))}</li>`);
    if (aipe.score !== '' && aipe.score !== undefined) preferred.push(`<li><strong>Pontuação final:</strong> ${esc(aipe.score)}</li>`);
    const details = aipeEntries
      .filter(([key]) => !['category','score'].includes(key))
      .map(([key, value]) => `<li><strong>${esc(labelize(key))}:</strong> ${esc(value)}</li>`);
    lines.push(`<h3>AIPE</h3><ul>${[...preferred, ...details].join('')}</ul>`);
  }

  const posas = caseRecord.methodology.posas || {};
  const posasEntries = Object.entries(posas).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  if (posasEntries.length) {
    let totals = '';
    try {
      const assessment = buildPosasAssessmentFromGuided(posas);
      const totalParts = [];
      if (assessment.patient?.total != null) totalParts.push(`Paciente: ${assessment.patient.total}`);
      if (assessment.observer?.total != null) totalParts.push(`Observador: ${assessment.observer.total}`);
      if (totalParts.length) totals = `<p><strong>Totais:</strong> ${esc(totalParts.join(' · '))}</p>`;
    } catch {
      totals = '';
    }
    const metadata = [];
    if (posas.posasArea) metadata.push(`<li><strong>Área avaliada:</strong> ${esc(posas.posasArea)}</li>`);
    if (posas.posasSelectionCriterion) metadata.push(`<li><strong>Critério de seleção:</strong> ${esc(posas.posasSelectionCriterion)}</li>`);
    const items = posasEntries
      .filter(([key]) => !['posasArea','posasSelectionCriterion'].includes(key))
      .map(([key, value]) => `<li><strong>${esc(labelize(key.replace(/^posas(Patient|Observer)_/, '$1 ')))}:</strong> ${esc(value)}</li>`);
    lines.push(`<h3>POSAS 2.0</h3>${totals}<ul>${[...metadata, ...items].join('')}</ul>`);
  }

  return lines.length ? `<section><h2>Metodologia e instrumentos</h2>${lines.join('')}</section>` : '';
}

function evidenceSection(caseRecord) {
  if (!caseRecord.evidenceClaims.length) return '';
  const sources = sourceMap(caseRecord);
  const claims = caseRecord.evidenceClaims.map((claim, index) => {
    const linked = (claim.sourceIds || []).map(id => sources.get(id) || id).join(', ') || 'Sem fonte vinculada';
    return `<article class="claim"><h3>${index + 1}. ${esc(claim.statement || 'Elemento de evidência')}</h3><p><strong>Fonte:</strong> ${esc(linked)}</p>${claim.finding ? `<p><strong>Achado:</strong> ${nl(claim.finding)}</p>` : ''}${claim.interpretation ? `<p><strong>Interpretação:</strong> ${nl(claim.interpretation)}</p>` : ''}${claim.impact ? `<p><strong>Impacto na conclusão:</strong> ${nl(claim.impact)}</p>` : ''}${claim.confidence ? `<p><strong>Grau de certeza:</strong> ${esc(labelize(claim.confidence))}</p>` : ''}${claim.limitations ? `<p><strong>Limitações:</strong> ${nl(claim.limitations)}</p>` : ''}</article>`;
  }).join('');
  return `<section><h2>Matriz de evidências</h2>${claims}</section>`;
}

function questionsSection(caseRecord) {
  if (!caseRecord.questions.length) return '';
  return `<section><h2>Quesitos</h2>${caseRecord.questions.map((question, index) => `<div class="question"><strong>${index + 1}. ${esc(question.question)}</strong>${question.origin ? `<p><em>Origem: ${esc(question.origin)}</em></p>` : ''}${question.answer ? `<p>${nl(question.answer)}</p>` : '<p>Não respondido.</p>'}${question.rationale ? `<p><strong>Fundamentação:</strong> ${nl(question.rationale)}</p>` : ''}</div>`).join('')}</section>`;
}

export function composeCaseDocument(record) {
  const c = normalizeCaseRecord(record);
  const sources = c.sources.length ? `<section><h2>Fontes e documentos</h2><ol>${c.sources.map(source => `<li><strong>${esc(source.title || source.type)}</strong>${source.date ? ` — ${esc(source.date)}` : ''}${source.origin ? ` — ${esc(source.origin)}` : ''}${source.notes ? `<br>${nl(source.notes)}` : ''}</li>`).join('')}</ol></section>` : '';
  const timeline = c.timeline.length ? `<section><h2>Cronologia</h2><ol>${c.timeline.map(event => {
    const linked = (event.sourceIds || []).map(id => sourceMap(c).get(id) || id).join(', ');
    return `<li><strong>${esc(event.date || 'Data não informada')} — ${esc(event.title)}</strong>${event.description ? `<br>${nl(event.description)}` : ''}${linked ? `<br><small>Fonte: ${esc(linked)}</small>` : ''}</li>`;
  }).join('')}</ol></section>` : '';
  const header = `<header><h1>${esc(c.document.title || 'Laudo médico-pericial')}</h1><p><strong>Caso:</strong> ${esc(c.identity.title)}</p>${c.identity.processNumber ? `<p><strong>Processo:</strong> ${esc(c.identity.processNumber)}</p>` : ''}${c.identity.court ? `<p><strong>Origem:</strong> ${esc(c.identity.court)}</p>` : ''}${c.examinedPerson.name ? `<p><strong>Parte examinada:</strong> ${esc(c.examinedPerson.name)}</p>` : ''}${c.context.object ? `<p><strong>Objeto:</strong> ${esc(c.context.object)}</p>` : ''}</header>`;
  const history = [c.history.summary, c.history.antecedents, c.history.treatments, c.history.complaints, c.history.limitations].filter(Boolean).join('\n\n');
  const examination = [c.examination.summary, c.examination.positives, c.examination.negatives, c.examination.measurements, c.examination.limitations, c.examination.photographs].filter(Boolean).join('\n\n');
  const analysis = [c.analysis.medicoLegalQuestion, c.analysis.favorable, c.analysis.contrary, c.analysis.priorState, c.analysis.alternatives, c.analysis.reasoning, c.analysis.limitations, c.document.discussion].filter(Boolean).join('\n\n');
  const conclusion = [c.conclusion.summary, c.conclusion.nexus, c.conclusion.incapacity, c.conclusion.aestheticDamage, c.conclusion.functionalDamage, c.conclusion.prognosis].filter(Boolean).join('\n\n');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(c.identity.title)}</title><style>body{font-family:Georgia,serif;line-height:1.55;color:#111;max-width:180mm;margin:14mm auto;font-size:11pt}h1{font-size:18pt;text-align:center}h2{font-size:13pt;margin-top:22px;border-bottom:1px solid #bbb;padding-bottom:4px}h3{font-size:11.5pt;margin:14px 0 5px}p{margin:6px 0}.question,.claim{break-inside:avoid;margin:12px 0}.claim{padding:8px 0;border-bottom:1px solid #ddd}small{color:#444}@page{size:A4;margin:18mm}@media print{body{margin:0;max-width:none}}</style></head><body>${header}${section('Introdução', c.document.introduction)}${sources}${timeline}${section('História e antecedentes', history)}${section('Exame pericial', examination)}${methodologySection(c)}${evidenceSection(c)}${section('Análise médico-pericial', analysis)}${questionsSection(c)}${section('Conclusão', conclusion)}${section('Assinatura', c.document.signature)}</body></html>`;
}

export function composePlainText(record) {
  const c = normalizeCaseRecord(record);
  return [c.document.title || 'Laudo médico-pericial', c.identity.title, c.identity.processNumber, c.context.object, c.history.summary, c.examination.summary, c.methodology.notes, c.analysis.reasoning, c.conclusion.summary].filter(Boolean).join('\n\n');
}
