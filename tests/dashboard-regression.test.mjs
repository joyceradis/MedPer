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

test('os indicadores da prática contam o registrado e nomeiam o ausente, sem interpretar',async()=>{
  const {buildPracticeIndicators}=await import('../js/ui/dashboard-model.js');
  const ind=buildPracticeIndicators([
    {id:'a',status:'Em andamento',context:{legalSphere:'Cível',matter:'Dano estético'},scope:'x',
      operations:{deadlines:[{id:'d1',dueAt:'2026-08-09T12:00:00-03:00'},{id:'d2',dueAt:'2026-08-20T12:00:00-03:00'}],pendingActions:[{id:'p1'}]}},
    {id:'b',status:'Em andamento',context:{legalSphere:'Cível',matter:'Incapacidade'},
      operations:{deadlines:[{id:'d3',dueAt:'2026-08-12T12:00:00-03:00'}],pendingActions:[{id:'p2'},{id:'p3'}]}},
    {id:'c',status:'Em andamento',context:{},operations:{}},
    {id:'d',status:'Concluída',context:{legalSphere:'Trabalhista'},operations:{}},
    {id:'e',status:'Lixeira',context:{legalSphere:'Penal'},operations:{}}
  ],now);

  assert.equal(ind.counts.active,3);
  assert.equal(ind.counts.completed,1);
  // A lixeira não entra em nenhuma contagem; a concluída só no total dela.
  assert.ok(!ind.bySphere.some(x=>x.label==='Penal'||x.label==='Trabalhista'));
  assert.deepEqual(ind.bySphere[0],{label:'Cível',count:2},'ordenado por frequência');
  assert.ok(ind.bySphere.some(x=>x.label==='Não registrado'),'o ausente é nomeado, nunca inventado');
  assert.deepEqual(ind.deadlines,{danger:1,warning:1,neutral:1},'mesma régua do classifyDeadline');
  assert.equal(ind.pending,3);
  // Etapa atual deriva de caseStageProgress: 'a' tem objeto (→ Autos e evidências),
  // 'b' e 'c' não têm nada (→ Delimitação).
  assert.deepEqual(ind.byStage.map(s=>`${s.label}:${s.count}`),['Delimitação:2','Autos e evidências:1']);
});

test('Phase 2 CSS preserves semantic deadlines and the canonical navy, without ornament',()=>{
  const base=fs.readFileSync(new URL('../css/dashboard.css',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../css/phase2.css',import.meta.url),'utf8');

  assert.match(base,/\.deadline-indicator\.is-danger/);
  assert.match(base,/\.deadline-indicator\.is-warning/);
  assert.match(css,/\.work-progress-track/);
  assert.match(css,/\.shell \.main\.case-layout/);

  // A marca é congelada em PRODUCT_ANCHOR §3.1 e não muda por passe de desenho.
  assert.match(css,/--mp-navy:#06172d/);
  assert.match(css,/--mp-navy-mid:#0b2748/);
  assert.match(css,/--mp-navy-top:#12375f/);

  // A textura diagonal atrás da navegação não era marca: eram três gradientes
  // empilhados em 56,2%/56,5% simulando relevo. Este teste protegia a
  // decoração; passa a proteger a remoção dela. Só o gradiente vertical da
  // barra — esse sim identidade — permanece.
  assert.match(css,/\.dashboard-sidebar:before,\.dashboard-sidebar:after\{content:none\}/,
    'a barra lateral não pode voltar a desenhar textura em pseudo-elemento');
  assert.match(css,/\.dashboard-sidebar\{[^}]*linear-gradient\(180deg,var\(--mp-navy-top\)/,
    'o gradiente vertical da marca continua');
});

test('Phase 2 CSS holds the interface direction: legible floor, continuous progress, status is never a fill',()=>{
  const css=fs.readFileSync(new URL('../css/phase2.css',import.meta.url),'utf8');

  // Piso de legibilidade. O desenho anterior descia a 8,5px em rótulos.
  const tamanhos=[...css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map(m=>Number(m[1]));
  assert.ok(tamanhos.length>20,'a folha declara tamanhos de tipo');
  assert.ok(Math.min(...tamanhos)>=10,`nenhum tipo abaixo de 10px (menor encontrado: ${Math.min(...tamanhos)}px)`);

  // Progresso é uma barra contínua, não nove pílulas soltas com selo flutuante.
  for (const [nome,bloco] of [
    ['.work-progress-track',css.match(/\.work-progress-track\{([^}]*)\}/)],
    ['.shell .stage-status',css.match(/\.shell \.stage-status\{([^}]*)\}/)]
  ]) {
    assert.ok(bloco,`${nome} declarado`);
    assert.match(bloco[1],/gap:0/,`${nome} sem folga entre segmentos`);
    assert.match(bloco[1],/overflow:hidden/,`${nome} é um trilho único`);
  }
  assert.doesNotMatch(css,/\.(work-progress|stage-status)[^{]*is-current[^{]*\{[^}]*content:['"]✓/,
    'o selo de visto flutuando fora do trilho não volta');

  // Severidade é o glifo, nunca a tinta do fundo: o texto tem de continuar legível.
  const auditoria=css.match(/\.audit-item\.block,\.audit-item\.warning\{([^}]*)\}/);
  assert.ok(auditoria,'a especificidade de .audit-item.block é neutralizada explicitamente');
  assert.match(auditoria[1],/background:var\(--mp-window\)/,'bloqueio e ressalva não tingem o fundo');
  assert.match(css,/\.audit-item\.block:before\{background:var\(--mp-red\)\}/);
  assert.match(css,/\.audit-item\.warning:before\{background:var\(--mp-orange\)\}/);

  // Uma superfície que contém listas não desenha a própria moldura.
  assert.match(css,/\.surface-panel,\.reference-library,\.conf-surface\{\s*border:0;border-radius:0;background:transparent;box-shadow:none/,
    'painel que hospeda lista não pode voltar a ser caixa dentro de caixa');
});

test('toda grade de layout redefinida na camada visual carrega o próprio degrau responsivo',()=>{
  // Armadilha de cascata, encontrada medindo: `phase2.css` é a última folha
  // carregada, então uma regra base declarada aqui vence os `@media` das folhas
  // anteriores. Ao reescrever `.protocol-selector` em quatro colunas sem repetir
  // os degraus que existiam em `guided-methodology.css`, a grade ficou fixa em
  // qualquer largura e a página passou a estourar 427px num viewport de 420.
  // Regra: se esta camada declara uma grade de layout na base, ela também
  // precisa estreitá-la aqui. Trilhos de progresso usam `repeat(N,1fr)` sem
  // `minmax` e ficam de fora — não são layout, são um único elemento medido.
  const css=fs.readFileSync(new URL('../css/phase2.css',import.meta.url),'utf8');

  // Separa o que está dentro de @media do que está fora, contando chaves.
  let base='',media='',profundidade=0,dentro=false;
  for (let i=0;i<css.length;i++) {
    if (!dentro && css.startsWith('@media',i)) { dentro=true; profundidade=0; }
    (dentro?(media+=css[i]):(base+=css[i]));
    if (dentro) {
      if (css[i]==='{') profundidade++;
      else if (css[i]==='}' && --profundidade===0) dentro=false;
    }
  }

  const grades=[...base.matchAll(/(?:^|\n)([^@\s{][^{}\n]*)\{[^{}]*grid-template-columns:repeat\((\d+),\s*minmax\(0,\s*1fr\)\)/g)]
    .filter(m=>Number(m[2])>1)
    .map(m=>m[1].trim().split(',')[0].trim());

  assert.ok(grades.length>=3,`a folha declara grades de layout (encontradas: ${grades.length})`);
  for (const seletor of grades) {
    assert.ok(media.includes(`${seletor}{`),
      `${seletor} declara grade multi-coluna na base e precisa de um degrau em @media nesta mesma folha`);
  }
});

console.log('Dashboard regression suite completed successfully.');
