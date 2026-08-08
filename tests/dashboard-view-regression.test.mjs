import assert from 'node:assert/strict';
import { renderDashboardHome } from '../js/ui/dashboard-view.js';

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const now = new Date('2026-08-08T00:00:00-03:00');
const state = {
  cases: [
    {
      id: 'case_1',
      title: 'Queimadura e sequela cicatricial',
      reference: '0002862-73.2019.8.08.0024',
      status: 'Em andamento',
      context: {
        sphere: 'Judicial',
        branch: 'Cível',
        role: 'Perita do juízo',
        matter: 'Dano estético',
        tribunal: 'TJES',
        unit: '1ª Vara Cível de Vila Velha',
        feeRegime: 'AJG'
      },
      operations: {
        deadlines: [
          { id: 'd1', type: 'Exame presencial', dueAt: '2026-08-09T18:00:00-03:00' },
          { id: 'd2', type: 'Entrega do laudo', dueAt: '2026-08-12T23:59:00-03:00' }
        ],
        pendingActions: [{ id: 'p1', label: 'Responder 2 quesitos' }]
      }
    }
  ]
};

test('renders the approved operational dashboard hierarchy', () => {
  const html = renderDashboardHome(state, 'active', { now, displayName: 'Dra. Joyce' });

  assert.match(html, /class="app-shell-dashboard"/);
  assert.match(html, /class="dashboard-sidebar"/);
  assert.match(html, /<span class="wordmark-med">Med<\/span><span class="wordmark-per">Per<\/span>/);
  assert.match(html, /Visão geral/);
  assert.match(html, /Meus casos/);
  assert.match(html, /Agenda e prazos/);
  assert.match(html, /Referências técnicas/);
  assert.match(html, /Continuar trabalhando/);
  assert.match(html, /Próximos prazos/);
  assert.match(html, /Queimadura e sequela cicatricial/);
  assert.match(html, /1ª Vara Cível de Vila Velha/);
  assert.match(html, /AJG/);
});

test('uses deadline severity as a micro-indicator instead of recoloring the case card', () => {
  const html = renderDashboardHome(state, 'active', { now });

  assert.match(html, /deadline-indicator is-danger/);
  assert.match(html, /deadline-indicator is-warning/);
  assert.doesNotMatch(html, /case-card[^\"]*is-danger/);
  assert.doesNotMatch(html, /continue-card[^\"]*is-danger/);
});

test('keeps a single primary new-case action in dashboard composition', () => {
  const html = renderDashboardHome(state, 'active', { now });
  const matches = html.match(/data-new-case/g) || [];
  assert.equal(matches.length, 1);
});

test('preserves lifecycle filtering and direct case access below the overview', () => {
  const html = renderDashboardHome(state, 'active', { now });

  assert.match(html, /data-case-filter="active"/);
  assert.match(html, /data-case-filter="completed"/);
  assert.match(html, /data-case-filter="trash"/);
  assert.match(html, /data-open-case="case_1"/);
  assert.match(html, /data-case-action="complete"/);
  assert.match(html, /data-case-action="trash"/);
});

console.log('Dashboard view regression suite completed successfully.');
