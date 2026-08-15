import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderDashboardHome, renderDashboardSurface } from '../js/ui/dashboard-view.js';
import { CONFERENCE_PROTOCOL, CONFERENCE_SEVERITY } from '../js/models/checklists.js';
import { REPORT_STRUCTURE } from '../js/models/report-structure.js';

function test(name, fn){
  try{fn();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}
}

const state={cases:[{
  id:'case_1',title:'Queimadura e sequela cicatricial',reference:'0002862-73.2019.8.08.0024',status:'Em andamento',
  context:{setting:'Judicial',legalSphere:'Cível',role:'Perita do juízo',matter:'Dano estético',tribunal:'TJES',unit:'1ª Vara Cível de Vila Velha',feeRegime:'AJG'},
  operations:{deadlines:[{id:'d1',type:'Exame presencial',dueAt:'2026-08-09T18:00:00-03:00'}],pendingActions:[{id:'p1',label:'Responder quesitos'}]}
}]};
const now=new Date('2026-08-08T00:00:00-03:00');

test('sidebar navigation targets real dashboard surfaces',()=>{
  const html=renderDashboardSurface(state,'overview','active',{now});
  assert.match(html,/data-surface="overview"/);
  assert.match(html,/data-surface="cases"/);
  assert.match(html,/data-surface="deadlines"/);
  assert.match(html,/data-surface="references"/);
  assert.doesNotMatch(html,/data-scroll-target=/);
});

test('cases surface is distinct from overview and preserves lifecycle controls',()=>{
  const html=renderDashboardSurface(state,'cases','active',{now});
  assert.match(html,/data-dashboard-surface="cases"/);
  assert.match(html,/<h1>Meus casos<\/h1>/);
  assert.doesNotMatch(html,/Continuar trabalhando/);
  assert.match(html,/data-case-filter="active"/);
  assert.match(html,/data-case-action="complete"/);
  assert.match(html,/data-inspect-case="case_1"/);
});

test('deadlines surface is distinct and renders operational deadlines',()=>{
  const html=renderDashboardSurface(state,'deadlines','active',{now});
  assert.match(html,/data-dashboard-surface="deadlines"/);
  assert.match(html,/<h1>Agenda e prazos<\/h1>/);
  assert.match(html,/Exame presencial/);
  assert.doesNotMatch(html,/Continuar trabalhando/);
});

test('references surface is distinct and keeps knowledge governance explicit',()=>{
  const html=renderDashboardSurface(state,'references','active',{now});
  assert.match(html,/data-dashboard-surface="references"/);
  assert.match(html,/<h1>Referências técnicas<\/h1>/);
  assert.match(html,/não altera automaticamente o método/i);
});

test('overview preserves the approved operational hierarchy',()=>{
  const html=renderDashboardSurface(state,'overview','active',{now});
  assert.match(html,/Continuar trabalhando/);
  assert.match(html,/Próximos prazos/);
  assert.match(html,/Perita do juízo/);
  assert.match(html,/Etapa 5 de 9/);
  assert.match(html,/dashboard-pending/);
});

test('renderDashboardHome resolves the visible surface from the application hash',()=>{
  const casesHtml=renderDashboardHome(state,'active',{now,hash:'#/dashboard/cases'});
  const deadlinesHtml=renderDashboardHome(state,'active',{now,hash:'#/dashboard/deadlines'});
  const referencesHtml=renderDashboardHome(state,'active',{now,hash:'#/dashboard/references'});

  assert.match(casesHtml,/data-dashboard-surface="cases"/);
  assert.match(casesHtml,/<h1>Meus casos<\/h1>/);
  assert.match(deadlinesHtml,/data-dashboard-surface="deadlines"/);
  assert.match(referencesHtml,/data-dashboard-surface="references"/);
});

test('the models surface publishes the conference protocol instead of a placeholder', () => {
  const html = renderDashboardSurface(state, 'models', 'active', { now });
  assert.match(html, /data-dashboard-surface="models"/);
  assert.match(html, /<h1>Modelos e checklists<\/h1>/);
  assert.doesNotMatch(html, /Área reservada/, 'the placeholder must not silently return');
  assert.match(html, /Protocolo de Conferência Pericial/);

  for (const dimension of CONFERENCE_PROTOCOL.dimensions) {
    assert.ok(html.includes(dimension.code), `dimension ${dimension.code} must render`);
    assert.ok(html.includes(dimension.title), `dimension title "${dimension.title}" must render`);
  }
  assert.equal(CONFERENCE_PROTOCOL.dimensions.length, 8, 'the protocol has eight dimensions');

  for (const severity of Object.values(CONFERENCE_SEVERITY)) {
    assert.ok(html.includes(severity.label), `severity "${severity.label}" must render`);
  }
  assert.match(html, /Fora de escopo/, 'the surface must state what the protocol does not assess');
});

test('the conference protocol stays outside the decision engine', () => {
  const checklists = readFileSync(new URL('../js/models/checklists.js', import.meta.url), 'utf8');
  assert.doesNotMatch(checklists, /core\/store|localStorage/, 'checklists must not touch persisted state');
  assert.doesNotMatch(checklists, /import .*engine\.js|import .*protocols\.js/, 'checklists must not reach into the methodology engine');
  const engine = readFileSync(new URL('../js/methodology/engine.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /models\/checklists/, 'the engine must not consume the conference checklist');
});

test('the models surface publishes the report structure alongside the conference protocol', () => {
  const html = renderDashboardSurface(state, 'models', 'active', { now });
  assert.match(html, /Estrutura de Laudo Pericial Judicial/);
  assert.equal(REPORT_STRUCTURE.sections.length, 16, 'the structure has sixteen sections');
  for (const section of REPORT_STRUCTURE.sections) {
    assert.ok(html.includes(section.title), `section "${section.title}" must render`);
  }
  assert.ok(html.indexOf('Estrutura de Laudo') < html.indexOf('Protocolo de Conferência'),
    'composition comes before conference: you write the report, then you check it');
});

test('the report structure prescribes form, never clinical content', () => {
  const source = readFileSync(new URL('../js/models/report-structure.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /core\/store|localStorage/, 'the model must not touch persisted state');
  assert.doesNotMatch(source, /import .*engine\.js|import .*aipe\.js|import .*protocols\.js/,
    'the model must not reach into methodology modules');
  // Sem caso: nenhum identificador, data de atendimento ou número de processo.
  assert.doesNotMatch(source, /\d{2}\/\d{2}\/\d{4}/, 'no case dates may appear in a structural model');
  assert.doesNotMatch(source, /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/, 'no process numbers may appear');
  const engine = readFileSync(new URL('../js/methodology/engine.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /models\/report-structure/, 'the engine must not consume the report structure');
});

console.log('Dashboard surfaces regression suite completed successfully.');
