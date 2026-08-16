import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDashboardModel, classifyDeadline } from '../js/ui/dashboard-model.js';

function test(name, callback){try{callback();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}}
const now=new Date('2026-08-08T00:00:00-03:00');

test('classifies deadline urgency without recoloring the whole case',()=>{
  assert.equal(classifyDeadline('2026-08-09T12:00:00-03:00',now),'danger');
  assert.equal(classifyDeadline('2026-08-12T23:59:00-03:00',now),'warning');
  assert.equal(classifyDeadline('2026-08-20T23:59:00-03:00',now),'neutral');
  assert.equal(classifyDeadline('2026-08-07T23:59:00-03:00',now),'danger');
});

test('builds a sorted operational dashboard model from normalized cases',()=>{
  const model=buildDashboardModel([
    {id:'a',title:'Caso A',status:'Em andamento',operations:{deadlines:[{id:'d2',type:'Laudo',dueAt:'2026-08-12T23:59:00-03:00'}],pendingActions:[{id:'p1'}]}},
    {id:'b',title:'Caso B',status:'Concluída',operations:{deadlines:[],pendingActions:[]}},
    {id:'c',title:'Caso C',status:'Em andamento',operations:{deadlines:[{id:'d1',type:'Exame',dueAt:'2026-08-09T12:00:00-03:00'}],pendingActions:[{id:'p2'},{id:'p3'}]}}
  ],now);
  assert.equal(model.counts.active,2);assert.equal(model.counts.completed,1);assert.equal(model.pendingCount,3);assert.equal(model.deadlines[0].id,'d1');assert.equal(model.deadlines[0].severity,'danger');assert.equal(model.deadlines[1].severity,'warning');assert.equal(model.continueCase.id,'a');
});

// A versão anterior deste teste exigia "Etapa 5 de 9" e os marcos "Revisão de
// documentos / Exame / Laudo" no código-fonte da view. Ela travava como
// "composição aprovada" uma barra de progresso inteiramente fixa, que exibia o
// mesmo andamento para qualquer perícia e cujos marcos nem correspondiam às nove
// etapas da navegação. Num sistema médico-pericial, isso não é imprecisão de
// interface: é a tela afirmando sobre o caso algo que ela não tem como saber.
// O teste passa a exigir o oposto — que nenhum progresso seja hardcoded.
test('o progresso exibido é derivado do caso, nunca fixo no código',()=>{
  const view=fs.readFileSync(new URL('../js/ui/dashboard-view.js',import.meta.url),'utf8');
  assert.doesNotMatch(view,/Etapa \d+ de \d+/,'nenhum andamento literal no código da view');
  assert.doesNotMatch(view,/Revisão de documentos/i,'marcos fixos não podem voltar');
  assert.match(view,/caseStageProgress\(/,'o progresso vem do modelo, a partir do caso');
  assert.match(view,/data-surface=/);assert.match(view,/<svg/);
  assert.doesNotMatch(view,/fa-(solid|regular)|FontAwesome/i);
  assert.doesNotMatch(view,/data-scroll-target=/);
});

test('caseStageProgress reflete o que está registrado no caso',async()=>{
  const {caseStageProgress}=await import('../js/ui/dashboard-model.js');
  const vazio=caseStageProgress({});
  assert.equal(vazio.started,0);
  assert.equal(vazio.total,9);
  assert.equal(vazio.currentIndex,0);
  assert.equal(vazio.currentLabel,'Delimitação');

  const comObjeto=caseStageProgress({scope:'Apurar dano estético.'});
  assert.equal(comObjeto.started,1);
  assert.equal(comObjeto.currentLabel,'Autos e evidências','a próxima etapa é a primeira sem registro');

  const comAutos=caseStageProgress({scope:'x',evidence:[{id:'e1',title:'Prontuário'}]});
  assert.equal(comAutos.started,2);
  assert.equal(comAutos.currentLabel,'Cronologia');
});

test('Phase 2 CSS preserves restrained cards, semantic deadlines and canonical navy hierarchy',()=>{
  const base=fs.readFileSync(new URL('../css/dashboard.css',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../css/phase2.css',import.meta.url),'utf8');

  assert.match(base,/\.deadline-indicator\.is-danger/);
  assert.match(base,/\.deadline-indicator\.is-warning/);
  assert.match(css,/\.work-progress-track/);
  assert.match(css,/\.shell \.main\.case-layout/);
  assert.match(css,/--mp-navy:#06172d/);
  assert.match(css,/--mp-navy-mid:#0b2748/);
  assert.match(css,/--mp-navy-top:#12375f/);
  assert.match(css,/\.dashboard-sidebar:before/);
  assert.match(css,/\.dashboard-sidebar:after/);
});

console.log('Dashboard regression suite completed successfully.');
