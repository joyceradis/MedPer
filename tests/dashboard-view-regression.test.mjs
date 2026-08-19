import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderDashboardHome, renderDashboardSurface } from '../js/ui/dashboard-view.js';

function test(name, callback){try{callback();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}}

const now=new Date('2026-08-08T00:00:00-03:00');
const state={cases:[{id:'case_1',title:'Queimadura e sequela cicatricial',reference:'0002862-73.2019.8.08.0024',status:'Em andamento',context:{setting:'Judicial',legalSphere:'Cível',sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano estético',tribunal:'TJES',unit:'1ª Vara Cível de Vila Velha',feeRegime:'AJG'},operations:{deadlines:[{id:'d1',type:'Exame presencial',dueAt:'2026-08-09T18:00:00-03:00'},{id:'d2',type:'Entrega do laudo',dueAt:'2026-08-12T23:59:00-03:00'}],pendingActions:[{id:'p1',label:'Responder 2 quesitos'}]}}]};

test('renders the approved overview hierarchy',()=>{const html=renderDashboardHome(state,'active',{now,displayName:'Dra. Joyce'});assert.match(html,/class="app-shell-dashboard"/);assert.match(html,/class="dashboard-sidebar"/);assert.match(html,/<span class="wordmark-med">Med<\/span><span class="wordmark-per">Per<\/span>/);assert.match(html,/Visão geral/);assert.match(html,/Queimadura e sequela cicatricial/);assert.match(html,/1ª Vara Cível de Vila Velha/);assert.match(html,/AJG/);assert.match(html,/Próximos prazos/);assert.doesNotMatch(html,/data-scroll-target=/);
  // Os três atalhos do topo repetiam a barra lateral inteira e ocupavam a
  // primeira dobra sem oferecer nada novo. A perícia em aberto é a âncora.
  assert.doesNotMatch(html,/class="dashboard-shortcuts"/,'atalhos duplicando a navegação não voltam');
  assert.ok(html.indexOf('work-card')<html.indexOf('work-side'),'o trabalho vem antes do apoio');});

test('estado vazio não ocupa a tela com caixas que anunciam o nada',()=>{
  const semNada={cases:[{id:'c9',title:'Perícia recém-criada',status:'Em andamento',context:{role:'Perita do juízo'},operations:{}}]};
  const html=renderDashboardHome(semNada,'active',{now,displayName:'Dra. Joyce'});
  assert.doesNotMatch(html,/Nenhum prazo registrado/);
  assert.doesNotMatch(html,/O que exigir ação aparecerá aqui/);
  assert.match(html,/class="work-quiet"/,'o vazio se anuncia em uma linha');
  assert.equal((html.match(/work-side/g)||[]).length,0,'sem prazos e sem pendências, não há painéis de apoio');});

test('uses deadline severity as a micro-indicator instead of recoloring case cards',()=>{const html=renderDashboardHome(state,'active',{now});assert.match(html,/deadline-indicator is-danger/);assert.match(html,/deadline-indicator is-warning/);assert.doesNotMatch(html,/dashboard-case-card[^\"]*is-danger/);assert.doesNotMatch(html,/continue-card[^\"]*is-danger/);});

test('keeps a single primary new-case action in overview',()=>{const html=renderDashboardHome(state,'active',{now});assert.equal((html.match(/data-new-case/g)||[]).length,1);});

test('preserves lifecycle filtering and inspector access on Meus casos surface',()=>{const html=renderDashboardSurface(state,'cases','active',{now});assert.match(html,/data-case-filter="active"/);assert.match(html,/data-case-filter="completed"/);assert.match(html,/data-case-filter="trash"/);assert.match(html,/data-inspect-case="case_1"/);assert.match(html,/data-case-action="complete"/);assert.match(html,/data-case-action="trash"/);});

test('a identidade exibida vem da sessão — nenhuma pessoa fica escrita no código',()=>{
  // Encontrado auditando para o piloto: a barra lateral trazia as iniciais "JR",
  // o papel "Perita médica" e a saudação "Dra. Joyce" fixos no código, e nada
  // no aplicativo fornecia displayName — o padrão sempre vencia. Num piloto com
  // várias peritas, todas veriam a identidade da mesma pessoa.
  const fonte=fs.readFileSync(new URL('../js/ui/dashboard-view.js',import.meta.url),'utf8');
  const semComentarios=fonte.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(semComentarios,/Dra\. Joyce/,'nenhum nome próprio no código da view');
  assert.doesNotMatch(semComentarios,/>JR</,'nenhuma inicial fixa');
  assert.doesNotMatch(semComentarios,/Perita médica/,'nenhum papel fixo — o produto serve peritos de qualquer gênero');

  // Com sessão: nome e iniciais derivadas dele.
  const comNome=renderDashboardHome(state,'active',{now,displayName:'Marina Toledo Alves',accountEmail:'marina@exemplo.br'});
  assert.match(comNome,/Boa noite, Marina Toledo Alves/);
  assert.match(comNome,/class="profile-avatar">MA</,'iniciais do primeiro e do último nome');

  // Nome de uma palavra: duas primeiras letras, nunca erro.
  assert.match(renderDashboardHome(state,'active',{now,displayName:'Joyce'}),/class="profile-avatar">JO</);

  // Sem sessão (modo local): cumprimenta sem nome e não inventa identidade.
  const semNome=renderDashboardHome(state,'active',{now});
  assert.match(semNome,/Boa noite</,'a saudação não fabrica um nome');
  assert.doesNotMatch(semNome,/Boa noite, /);
  assert.match(semNome,/class="profile-avatar">MP</,'sem nome e sem e-mail, iniciais neutras do produto');

  // Só e-mail: usa o e-mail, não um nome inventado.
  const soEmail=renderDashboardHome(state,'active',{now,accountEmail:'perita@exemplo.br'});
  assert.match(soEmail,/perita@exemplo\.br/);
});

console.log('Dashboard view regression suite completed successfully.');
