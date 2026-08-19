import assert from 'node:assert/strict';
import { normalizeCase } from '../js/core/store.js';
import { renderCaseSurface } from '../js/ui/app.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

function bodilyCase(guided = {}) {
  const caseData = normalizeCase({
    id: 'case_bodily_1',
    title: 'Perícia de dano corporal',
    reference: 'TEST-001',
    context: {
      sphere: 'Judicial',
      branch: 'Cível',
      role: 'Perita do juízo',
      matter: 'Dano corporal',
      mode: 'Presencial e documental'
    },
    scope: 'Avaliar dano corporal decorrente do evento.',
    methodology: { guided }
  });
  caseData.methodology.general.object = caseData.scope;
  return caseData;
}

const stepVisible = (html, title) => html.includes(title);
const consolidated = (extra = {}) => bodilyCase({
  personalDamageDamageStatus: 'Sim',
  personalDamageCausalStatus: 'Nexo sustentado',
  personalDamageConsolidationStatus: 'Consolidado',
  ...extra
});

test('dano corporal aparece como protocolo principal na tela de método', () => {
  const html = renderCaseSurface(bodilyCase(), 'method');
  assert.match(html, /Protocolo · Dano corporal \/ dano pessoal/);
  assert.match(html, /Principal/);
});

test('antes dos gates, a tela não despeja módulos temporários e permanentes', () => {
  const html = renderCaseSurface(bodilyCase(), 'method');
  assert.equal(stepVisible(html, '1. Elegibilidade — dano, nexo e consolidação'), true);
  assert.equal(stepVisible(html, '2. Danos temporários'), false);
  assert.equal(stepVisible(html, '3. Eixos permanentes — identificar sem somar'), false);
  assert.match(html, /Há dano biológico relevante ao objeto objetivamente demonstrado\?/);
});

test('nexo sustentado sem consolidação revela temporários mas não permanentes', () => {
  const html = renderCaseSurface(bodilyCase({
    personalDamageDamageStatus: 'Sim',
    personalDamageCausalStatus: 'Nexo sustentado',
    personalDamageConsolidationStatus: 'Não consolidado'
  }), 'method');

  assert.equal(stepVisible(html, '2. Danos temporários'), true);
  assert.equal(stepVisible(html, '3. Eixos permanentes — identificar sem somar'), false);
  assert.equal(stepVisible(html, '4. Eixo funcional permanente'), false);
  assert.match(html, /Déficit funcional temporário total/);
});

test('após consolidação, eixos permanentes tornam-se disponíveis sem escore global', () => {
  const html = renderCaseSurface(consolidated(), 'method');

  assert.equal(stepVisible(html, '2. Danos temporários'), true);
  assert.equal(stepVisible(html, '3. Eixos permanentes — identificar sem somar'), true);
  assert.equal(stepVisible(html, '4. Eixo funcional permanente'), true);
  assert.equal(stepVisible(html, '5. Eixo estético e qualidade cicatricial'), true);
  assert.equal(stepVisible(html, '6. Repercussões permanentes e participação'), true);
  assert.equal(stepVisible(html, '7. Integração médico-pericial'), true);
  assert.equal(stepVisible(html, 'POSAS 2.0 — qualidade cicatricial'), false);
  assert.doesNotMatch(html, /percentual global do dano|dano total\s*[:=]/i);
});

test('repercussões são guiadas por perguntas operacionais em vez de uma caixa abstrata de valoração', () => {
  const html = renderCaseSurface(consolidated(), 'method');
  assert.match(html, /Qual era a atividade profissional antes do evento\?/);
  assert.match(html, /Quais tarefas essenciais essa atividade exigia\?/);
  assert.match(html, /Qual sequela atribuível interfere nessas tarefas\?/);
  assert.match(html, /O impacto profissional está demonstrado\?/);
  assert.match(html, /Atividade física \/ lazer — como era antes do evento\?/);
  assert.match(html, /Atividade física \/ lazer — como está atualmente\?/);
  assert.match(html, /A diferença é atribuível ao evento\?/);
  assert.match(html, /Sem referencial válido, conclua qualitativamente/i);
});

test('POSAS só aparece quando a avaliação cicatricial complementar é explicitamente indicada', () => {
  const html = renderCaseSurface(consolidated({ scarQualityStatus: 'Sim' }), 'method');

  assert.equal(stepVisible(html, 'POSAS 2.0 — qualidade cicatricial'), true);
  assert.match(html, /Patient — Dor/);
  assert.match(html, /Patient — Prurido/);
  assert.match(html, /Observer — Vascularidade/);
  assert.match(html, /Observer — Maleabilidade/);
  assert.match(html, /não.*pontuação de dano estético/i);
});

console.log('Personal damage UI regression suite completed successfully.');
