import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderDashboardHome, renderDashboardSurface } from '../js/ui/dashboard-view.js';
import { CONFERENCE_PROTOCOL, CONFERENCE_SEVERITY, conferenceItemId, conferenceItems, conferenceProgress } from '../js/models/checklists.js';

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
  assert.match(html,/data-surface="indicators"/);
  assert.match(html,/data-surface="references"/);
  assert.doesNotMatch(html,/data-scroll-target=/);
});

test('a superfície de indicadores lê a carteira e não oferece nenhum controle de edição',()=>{
  const html=renderDashboardSurface(state,'indicators','active',{now,hash:'#/dashboard/indicators'});
  assert.match(html,/data-dashboard-surface="indicators"/);
  assert.match(html,/<h1>Indicadores<\/h1>/);
  assert.match(html,/Por esfera/);
  assert.match(html,/Por matéria/);
  assert.match(html,/Etapa atual das perícias/);
  assert.match(html,/Prazos por urgência/);
  assert.match(html,/Conferência pericial por caso/);
  assert.match(html,/Cível/);
  assert.match(html,/Dano estético/);
  // A honestidade da régua fica declarada na própria tela.
  assert.match(html,/contam registros; não avaliam mérito/);
  // Leitura, não formulário: nada editável nesta superfície.
  assert.doesNotMatch(html,/<input|<textarea|<select/);

  // A rota resolve pelo hash como as demais.
  assert.match(renderDashboardHome(state,'active',{now,hash:'#/dashboard/indicators'}),/data-dashboard-surface="indicators"/);

  // Sem casos, a superfície diz isso — não desenha grade vazia.
  const vazio=renderDashboardSurface({cases:[]},'indicators','active',{now});
  assert.match(vazio,/Sem casos para medir/);
  assert.doesNotMatch(vazio,/ind-grid/);
});

test('cases surface is distinct from overview and preserves lifecycle controls',()=>{
  const html=renderDashboardSurface(state,'cases','active',{now});
  assert.match(html,/data-dashboard-surface="cases"/);
  assert.match(html,/<h1>Meus casos<\/h1>/);
  assert.doesNotMatch(html,/class="work-card"/);
  assert.match(html,/data-case-filter="active"/);
  assert.match(html,/data-case-action="complete"/);
  assert.match(html,/data-inspect-case="case_1"/);
});

test('deadlines surface is distinct and renders operational deadlines',()=>{
  const html=renderDashboardSurface(state,'deadlines','active',{now});
  assert.match(html,/data-dashboard-surface="deadlines"/);
  assert.match(html,/<h1>Agenda e prazos<\/h1>/);
  assert.match(html,/Exame presencial/);
  assert.doesNotMatch(html,/class="work-card"/);
});

test('references surface is distinct and keeps knowledge governance explicit',()=>{
  const html=renderDashboardSurface(state,'references','active',{now});
  assert.match(html,/data-dashboard-surface="references"/);
  assert.match(html,/<h1>Referências técnicas<\/h1>/);
  assert.match(html,/não altera automaticamente o método/i);
});

test('a visão geral abre pela perícia em aberto, com progresso real',()=>{
  const html=renderDashboardSurface(state,'overview','active',{now});
  assert.match(html,/class="work-card"/);
  assert.match(html,/Perita do juízo/);
  assert.match(html,/Queimadura e sequela cicatricial/);
  assert.match(html,/Próximos prazos/);
  // O andamento vem do caso: este não tem registro em etapa nenhuma.
  assert.match(html,/0 de 9 etapas com registro/);
  assert.doesNotMatch(html,/Etapa 5 de 9/,'nenhum andamento fixo');
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
  assert.ok(html.includes(CONFERENCE_PROTOCOL.scopeLimit.slice(0, 40)), 'the surface must state what the protocol does not assess');
});

test('the conference protocol stays outside the decision engine', () => {
  const checklists = readFileSync(new URL('../js/models/checklists.js', import.meta.url), 'utf8');
  assert.doesNotMatch(checklists, /core\/store|localStorage/, 'checklists must not touch persisted state');
  assert.doesNotMatch(checklists, /import .*engine\.js|import .*protocols\.js/, 'checklists must not reach into the methodology engine');
  const engine = readFileSync(new URL('../js/methodology/engine.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /models\/checklists/, 'the engine must not consume the conference checklist');
});

test('the conference is a tool, not a document: it checks, counts and persists per case', () => {
  const withCase = { cases: [{ ...state.cases[0], conference: { 'D1.1': true, 'D1.2': true } }] };
  const html = renderDashboardSurface(withCase, 'models', 'active', { now, conferenceCaseId: 'case_1' });

  assert.match(html, /data-conference-item="D1\.1"/, 'every item must be markable');
  assert.match(html, /data-conference-item="D1\.1"[^>]*checked/, 'a marked item must render checked');
  assert.doesNotMatch(html, /data-conference-item="D1\.1"[^>]*disabled/, 'a selected case must keep the conference interactive');
  assert.match(html, /data-conference-case="case_1"/, 'the perita must choose which case she is checking');

  const progress = conferenceProgress(withCase.cases[0].conference);
  assert.ok(html.includes(`${progress.done} de ${progress.total} conferidos`), 'progress must be visible');
  assert.equal(progress.done, 2);
  assert.equal(progress.byDimension.D1.done, 2, 'progress is accounted per dimension too');

  // Sem caso escolhido a superfície continua servindo como modelo de leitura,
  // mas não pode aceitar marcações que seriam descartadas silenciosamente.
  const asModel = renderDashboardSurface(withCase, 'models', 'active', { now });
  assert.doesNotMatch(asModel, /data-conference-item="D1\.1"[^>]*checked/, 'the model view carries no case state');
  assert.match(asModel, /data-conference-item="D1\.1"[^>]*disabled/, 'the model view must not accept disposable marks');
  assert.match(asModel, /conf-hint/, 'the model view must explain how to start checking');
});

test('a dimensão aberta é a primeira com trabalho pendente, não a primeira da lista', () => {
  // Encontrado medindo no navegador: escolher a perícia — a única ação que a
  // própria tela pede para começar — fechava as oito dimensões de uma vez. A
  // regra abria a D1 apenas enquanto NÃO houvesse caso, então o instante em que
  // passava a haver o que fazer era exatamente o instante em que tudo se fechava.
  const abertas = html => [...html.matchAll(/<details class="conf-row[^"]*"( open)?>[\s\S]*?<span class="conf-code">(D\d)</g)]
    .filter(m => m[1]).map(m => m[2]);

  const semCaso = renderDashboardSurface(state, 'models', 'active', { now });
  assert.deepEqual(abertas(semCaso), ['D1'], 'em leitura, a D1 abre como amostra do instrumento');

  // D1 tem 5 itens; marcados os cinco, o próximo passo é a D2.
  const d1Completa = Object.fromEntries(
    CONFERENCE_PROTOCOL.dimensions[0].items.map((_, i) => [conferenceItemId('D1', i), true]));
  const comD1 = { cases: [{ ...state.cases[0], conference: d1Completa }] };
  assert.deepEqual(
    abertas(renderDashboardSurface(comD1, 'models', 'active', { now, conferenceCaseId: 'case_1' })),
    ['D2'], 'com a D1 conferida, abre onde a perita parou');

  // Caso recém-escolhido, nada marcado: abre a D1 — nunca as oito fechadas.
  const zerado = { cases: [{ ...state.cases[0], conference: {} }] };
  assert.deepEqual(
    abertas(renderDashboardSurface(zerado, 'models', 'active', { now, conferenceCaseId: 'case_1' })),
    ['D1'], 'escolher a perícia não pode fechar tudo');

  // Conferência completa não tem próximo passo: nenhuma dimensão abre sozinha.
  const tudo = Object.fromEntries(conferenceItems().map(item => [item.id, true]));
  assert.deepEqual(
    abertas(renderDashboardSurface({ cases: [{ ...state.cases[0], conference: tudo }] },
      'models', 'active', { now, conferenceCaseId: 'case_1' })),
    [], 'conferência completa não abre dimensão');
});

test('os documentos operacionais são rascunhos administrativos copiáveis, fora do conteúdo pericial', async () => {
  const { OPERATIONAL_LETTERS } = await import('../js/models/letters.js');
  const html = renderDashboardSurface(state, 'models', 'active', { now });

  assert.match(html, /Documentos operacionais/);
  assert.ok(OPERATIONAL_LETTERS.length >= 5, 'aceite, escusa, agendamento, prazo e documentos');
  for (const letter of OPERATIONAL_LETTERS) {
    assert.ok(html.includes(letter.title), `modelo "${letter.title}" renderiza`);
    assert.match(html, new RegExp(`data-copy-letter="${letter.id}"`), `"${letter.title}" tem botão de copiar`);
    assert.match(letter.body, /«[^»]+»/, 'o corpo declara os campos a preencher — nada vem pronto');
    assert.match(letter.basis, /^CPC, art/, 'a base declarada é procedimental, do CPC');
    // Rascunho administrativo: o corpo não afirma conclusão médico-pericial.
    assert.doesNotMatch(letter.body, /nexo causal|incapacidade|dano estético|diagnóstic/i,
      'o expediente não carrega conteúdo médico-pericial');
  }
  // O texto copiado vem do módulo de dados, não de scraping do DOM.
  const controller = readFileSync(new URL('../js/ui/surface-controller.js', import.meta.url), 'utf8');
  assert.match(controller, /OPERATIONAL_LETTERS/, 'o controlador copia a partir do módulo');
  // E o módulo permanece declarativo, fora do motor e do armazenamento.
  const source = readFileSync(new URL('../js/models/letters.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /core\/store|localStorage|engine\.js/, 'letters.js é dado, não comportamento');
});

test('item ids survive a rewording of the item text', () => {
  // A chave de persistência é código+posição, não o texto: corrigir a redação de um
  // item não pode apagar a conferência que a perita já fez.
  assert.equal(conferenceItemId('D1', 0), 'D1.1');
  assert.equal(conferenceItemId('D8', 2), 'D8.3');
  const source = readFileSync(new URL('../js/models/checklists.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /conferenceItemId\([^)]*text/, 'the id must never derive from the item text');
});

console.log('Dashboard surfaces regression suite completed successfully.');
