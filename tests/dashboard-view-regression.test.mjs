import assert from 'node:assert/strict';
import { renderDashboardHome, renderDashboardSurface } from '../js/ui/dashboard-view.js';

function test(name, callback){try{callback();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}}

const now=new Date('2026-08-08T00:00:00-03:00');
const state={cases:[{id:'case_1',title:'Queimadura e sequela cicatricial',reference:'0002862-73.2019.8.08.0024',status:'Em andamento',context:{setting:'Judicial',legalSphere:'Cível',sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano estético',tribunal:'TJES',unit:'1ª Vara Cível de Vila Velha',feeRegime:'AJG'},operations:{deadlines:[{id:'d1',type:'Exame presencial',dueAt:'2026-08-09T18:00:00-03:00'},{id:'d2',type:'Entrega do laudo',dueAt:'2026-08-12T23:59:00-03:00'}],pendingActions:[{id:'p1',label:'Responder 2 quesitos'}]}}]};

test('renders the approved overview hierarchy',()=>{const html=renderDashboardHome(state,'active',{now,displayName:'Dra. Joyce'});assert.match(html,/class="app-shell-dashboard"/);assert.match(html,/class="dashboard-sidebar"/);assert.match(html,/<span class="wordmark-med">Med<\/span><span class="wordmark-per">Per<\/span>/);assert.match(html,/Visão geral/);assert.match(html,/Continuar trabalhando/);assert.match(html,/Próximos prazos/);assert.match(html,/Queimadura e sequela cicatricial/);assert.match(html,/1ª Vara Cível de Vila Velha/);assert.match(html,/AJG/);assert.doesNotMatch(html,/data-scroll-target=/);});

test('uses deadline severity as a micro-indicator instead of recoloring case cards',()=>{const html=renderDashboardHome(state,'active',{now});assert.match(html,/deadline-indicator is-danger/);assert.match(html,/deadline-indicator is-warning/);assert.doesNotMatch(html,/dashboard-case-card[^\"]*is-danger/);assert.doesNotMatch(html,/continue-card[^\"]*is-danger/);});

test('keeps a single primary new-case action in overview',()=>{const html=renderDashboardHome(state,'active',{now});assert.equal((html.match(/data-new-case/g)||[]).length,1);});

test('preserves lifecycle filtering and inspector access on Meus casos surface',()=>{const html=renderDashboardSurface(state,'cases','active',{now});assert.match(html,/data-case-filter="active"/);assert.match(html,/data-case-filter="completed"/);assert.match(html,/data-case-filter="trash"/);assert.match(html,/data-inspect-case="case_1"/);assert.match(html,/data-case-action="complete"/);assert.match(html,/data-case-action="trash"/);});

console.log('Dashboard view regression suite completed successfully.');
