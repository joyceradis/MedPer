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
  assert.equal(combined.includes(action), false, `${action} must not remain after the Node 24 GitHub Actions migration`);
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
  if (familyPattern.test(combined)) assert.ok(combined.includes(expected), `${expected} must be the canonical major when that action family is used`);
}

const aiWorkflow = workflows.get('ai-review.yml') || '';
assert.match(aiWorkflow, /actions\/setup-node@v7[\s\S]*?package-manager-cache:\s*false/g, 'AI review setup-node steps must explicitly disable automatic package-manager caching');

const authWorkflow = workflows.get('auth-audit.yml') || '';
assert.match(authWorkflow, /Path\('app\.html'\)/, 'auth audit must inspect the application shell');
assert.doesNotMatch(authWorkflow, /Path\('index\.html'\).*auth\.css/s, 'auth audit must not require auth CSS on the public landing page');
assert.match(authWorkflow, /onAccessGranted:startApplication/, 'auth audit must track the current access-granted composition contract');
assert.match(authWorkflow, /onAccessRevoked/, 'auth audit must track access revocation wiring');

const siteMap = await readFile(new URL('../docs/SITE_MAP.md', import.meta.url), 'utf8');
assert.match(siteMap, /runtime Node\.js 24 do GitHub Actions/, 'site map must document the CI runtime boundary');
assert.match(siteMap, /Node 20.*contrato de compatibilidade do projeto/s, 'site map must distinguish Action runtime from MedPer test runtime');

console.log(`GitHub Actions runtime regression suite completed successfully across ${workflowFiles.length} workflows.`);
