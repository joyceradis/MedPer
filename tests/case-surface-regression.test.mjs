import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCase } from '../js/core/store.js';
import { auditCase } from '../js/methodology/engine.js';
import { stageForAuditField } from '../js/ui/workflow.js';
import { renderCaseSurface } from '../js/ui/app.js';

function test(name, fn){
  try{fn();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}
}

const emptyAesthetic = () => normalizeCase({
  id:'case_1',
  title:'Perícia de dano estético',
  reference:'0002862-73.2019.8.08.0035',
  context:{sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano estético',mode:'Presencial e documental'}
});

const OBJECT_HELP = 'Transcreva ou sintetize o objeto nos limites da nomeação ou contratação.';

// A auditoria é a regra médico-pericial. O reordenamento da tela não pode tê-la
// tocado: mesmas pendências, mesmas severidades, mesma redação. Este bloco é o
// guarda dessa fronteira — se ele quebrar por uma mudança de interface, a mudança
// de interface é que está errada.
test('auditCase keeps the same pendencies, severities and wording for an empty aesthetic case', () => {
  const audit = auditCase(emptyAesthetic());
  assert.deepEqual(audit.issues.map(i => [i.severity, i.text]), [
    ['block','Objeto pericial não delimitado.'],
    ['block','Escolha metodológica não justificada.'],
    ['warning','Material analisado não descrito.'],
    ['warning','Exame objetivo não registrado.'],
    ['warning','Hipóteses alternativas não analisadas.'],
    ['warning','Grau de sustentação não registrado.'],
    ['block','Sem consolidação fundamentada, não cabe sequela estética permanente definitiva.'],
    ['block','A valoração estética exige alteração morfológica objetivamente demonstrada.'],
    ['block','Descrição morfológica incompleta: topografia e dimensões são necessárias.']
  ]);
  assert.equal(audit.blocks, 5);
  assert.equal(audit.warnings, 4);
});

test('every audit pendency declares the field that produced it', () => {
  for (const issue of auditCase(emptyAesthetic()).issues) {
    assert.ok(issue.field && typeof issue.field === 'string', `pendency without provenance: ${issue.text}`);
  }
});

test('audit fields route to the stage that renders the answer, defaulting to the method screen', () => {
  assert.equal(stageForAuditField('object'), 'delimitation');
  assert.equal(stageForAuditField('purpose'), 'delimitation');
  assert.equal(stageForAuditField('alternatives'), 'hypotheses');
  assert.equal(stageForAuditField('certainty'), 'conclusion');
  assert.equal(stageForAuditField('consolidationStatus'), 'method');
  assert.equal(stageForAuditField('campo-que-ainda-nao-existe'), 'method');
});

test('delimitation opens with the task, not with reference material', () => {
  const html = renderCaseSurface(emptyAesthetic(), 'delimitation');
  const at = needle => {const i = html.indexOf(needle); assert.notEqual(i, -1, `not rendered: ${needle}`); return i;};
  const objeto = at('<h2>Objeto pericial</h2>');
  assert.ok(objeto < at('<h2>Enquadramento</h2>'), 'framing must come after the pericial object');
  assert.ok(objeto < at('<h2>Situação metodológica</h2>'), 'the audit must come after the pericial object');
  assert.ok(objeto < at('class="knowledge-panel"'), 'the technical base must come after the work of the stage');
});

test('the pericial object field is stated once, and still persists to the same path', () => {
  const html = renderCaseSurface(emptyAesthetic(), 'delimitation');
  assert.equal(html.split(OBJECT_HELP).length - 1, 1, 'the supporting text must not be echoed around the field');
  assert.match(html, /data-bind="scope"/);
  assert.match(html, /class="sr-only">Objeto pericial<\/span>/);
});

// Um caso recém-aberto exibia cinco bloqueios sobre exame, consolidação e morfologia
// antes de a médica escrever a primeira palavra. O total continua declarado e a lista
// continua inteira na tela; muda apenas o que fica em primeiro plano.
test('the audit is scoped to the stage without hiding anything from the case', () => {
  const caseData = emptyAesthetic();
  const audit = auditCase(caseData);
  const html = renderCaseSurface(caseData, 'delimitation');

  assert.match(html, /5 bloqueios e 4 ressalvas no caso/);

  const aheadStart = html.indexOf('<details class="audit-ahead">');
  assert.notEqual(aheadStart, -1, 'pendencies from later stages must remain reachable');
  const ahead = html.slice(aheadStart, html.indexOf('</details>', aheadStart));
  const current = html.slice(0, aheadStart);

  assert.match(current, /Objeto pericial não delimitado\./);
  assert.doesNotMatch(current, /Sem consolidação fundamentada/);
  assert.match(ahead, /Sem consolidação fundamentada/);
  assert.match(ahead, /8 pendências registradas para etapas seguintes/);

  for (const issue of audit.issues) {
    assert.ok(html.includes(issue.text), `pendency dropped from the screen: ${issue.text}`);
  }
});

test('a delimited object clears this stage while later stages stay accounted for', () => {
  const caseData = emptyAesthetic();
  caseData.scope = 'Apurar existência e extensão de dano estético.';
  caseData.methodology.general.object = caseData.scope;
  const html = renderCaseSurface(caseData, 'delimitation');
  assert.doesNotMatch(html.slice(0, html.indexOf('<details class="audit-ahead">')), /Objeto pericial não delimitado/);
  assert.match(html, /4 bloqueios e 4 ressalvas no caso/);
});

test('the stage bar says which stage it is', () => {
  assert.match(renderCaseSurface(emptyAesthetic(), 'delimitation'), /Etapa 1 de 9/);
  assert.match(renderCaseSurface(emptyAesthetic(), 'conclusion'), /Etapa 7 de 9/);
});

// O blur acontece no mousedown. Redesenhar a tela nesse instante apagava o elemento
// sob o ponteiro antes do mouseup e engolia o clique — depois de escrever qualquer
// campo, trocar de etapa ou abrir uma lista exigia clicar duas vezes. O redesenho
// precisa continuar esperando o ponteiro ser solto.
test('committing a field never redraws the screen while the pointer is still down', () => {
  const source = readFileSync(new URL('../js/ui/app.js', import.meta.url), 'utf8');
  assert.match(source, /addEventListener\('pointerup'/, 'the deferred redraw must still be flushed on pointerup');
  assert.match(source, /addEventListener\('pointercancel'/, 'an interrupted gesture must not strand a pending redraw');
  assert.doesNotMatch(source, /commitBoundValue\(e\.target,\{notify:true\}\)/, 'blur must not redraw synchronously');
});

console.log('Case surface regression suite completed successfully.');
