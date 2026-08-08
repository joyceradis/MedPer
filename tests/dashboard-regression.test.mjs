import assert from 'node:assert/strict';
import { buildDashboardModel, classifyDeadline } from '../js/ui/dashboard-model.js';

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

test('classifies deadline urgency without recoloring the whole case', () => {
  assert.equal(classifyDeadline('2026-08-09T12:00:00-03:00', now), 'danger');
  assert.equal(classifyDeadline('2026-08-12T23:59:00-03:00', now), 'warning');
  assert.equal(classifyDeadline('2026-08-20T23:59:00-03:00', now), 'neutral');
  assert.equal(classifyDeadline('2026-08-07T23:59:00-03:00', now), 'danger');
});

test('builds a sorted operational dashboard model from normalized cases', () => {
  const model = buildDashboardModel([
    {
      id: 'a', title: 'Caso A', status: 'Em andamento',
      operations: {
        deadlines: [{ id: 'd2', type: 'Laudo', dueAt: '2026-08-12T23:59:00-03:00' }],
        pendingActions: [{ id: 'p1' }]
      }
    },
    {
      id: 'b', title: 'Caso B', status: 'Concluída',
      operations: { deadlines: [], pendingActions: [] }
    },
    {
      id: 'c', title: 'Caso C', status: 'Em andamento',
      operations: {
        deadlines: [{ id: 'd1', type: 'Exame', dueAt: '2026-08-09T12:00:00-03:00' }],
        pendingActions: [{ id: 'p2' }, { id: 'p3' }]
      }
    }
  ], now);

  assert.equal(model.counts.active, 2);
  assert.equal(model.counts.completed, 1);
  assert.equal(model.pendingCount, 3);
  assert.equal(model.deadlines[0].id, 'd1');
  assert.equal(model.deadlines[0].severity, 'danger');
  assert.equal(model.deadlines[1].severity, 'warning');
  assert.equal(model.continueCase.id, 'a');
});

console.log('Dashboard regression suite completed successfully.');
