import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const workflowsDir = new URL('../.github/workflows/', import.meta.url);
const workflowFiles = (await readdir(workflowsDir))
  .filter(name => /\.ya?ml$/i.test(name))
  .sort();

assert.ok(workflowFiles.length >= 5, 'expected the canonical MedPer workflow set');

const workflows = new Map();
for (const name of workflowFiles) {
  workflows.set(name, await readFile(new URL(name, workflowsDir), 'utf8'));
}

const combined = [...workflows.entries()]
  .map(([name, body]) => `\n# ${name}\n${body}`)
  .join('\n');

const deprecatedNode20Actions = [
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'actions/setup-python@v5',
  'actions/upload-artifact@v4',
  'actions/download-artifact@v4',
  'actions/github-script@v7'
];

for (const action of deprecatedNode20Actions) {
  assert.equal(
    combined.includes(action),
    false,
    `${action} must not remain after the Node 24 GitHub Actions migration`
  );
}

const requiredRuntimeMajors = [
  ['actions/checkout@v6', /actions\/checkout@/],
  ['actions/setup-node@v7', /actions\/setup-node@/],
  ['actions/setup-python@v6', /actions\/setup-python@/],
  ['actions/upload-artifact@v7', /actions\/upload-artifact@/],
  ['actions/download-artifact@v5', /actions\/download-artifact@/],
  ['actions/github-script@v8', /actions\/github-script@/]
];

for (const [expected, familyPattern] of requiredRuntimeMajors) {
  if (familyPattern.test(combined)) {
    assert.ok(combined.includes(expected), `${expected} must be the canonical major when that action family is used`);
  }
}

const aiWorkflow = workflows.get('ai-review.yml') || '';
assert.match(
  aiWorkflow,
  /actions\/setup-node@v7[\s\S]*?package-manager-cache:\s*false/g,
  'AI review setup-node steps must explicitly disable automatic package-manager caching'
);

console.log(`GitHub Actions runtime regression suite completed successfully across ${workflowFiles.length} workflows.`);
