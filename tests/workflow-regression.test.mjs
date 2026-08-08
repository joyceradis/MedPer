import assert from 'node:assert/strict';

let workflow = null;
let importError = null;
try {
  workflow = await import('../js/ui/workflow.js');
} catch (error) {
  importError = error;
}

assert.equal(importError, null);
assert.deepEqual(
  workflow.WORKFLOW_STAGES.map(stage => stage.id),
  ['delimitation','evidence','timeline','hypotheses','method','reasoning','conclusion','questions','report']
);
assert.equal(workflow.normalizeWorkflowTab('summary'), 'delimitation');
assert.equal(workflow.normalizeWorkflowTab('analysis'), 'reasoning');
assert.equal(workflow.normalizeWorkflowTab('unknown'), 'delimitation');

console.log('Workflow regression suite completed successfully.');
