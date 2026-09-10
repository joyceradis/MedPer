import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const workflowsDir = new URL('../.github/workflows/', import.meta.url);
const workflowFiles = (await readdir(workflowsDir))
  .filter(name => /\.ya?ml$/i.test(name))
  .sort();

// The autonomous ai-review workflow was intentionally removed during security
// containment. The canonical active set is therefore the three frontend/auth/
// regression gates plus backend-tests.
const requiredWorkflows = [
  'auth-audit.yml',
  'backend-tests.yml',
  'frontend-audit.yml',
  'regression-audit.yml'
];
for (const name of requiredWorkflows) {
  assert.ok(workflowFiles.includes(name), `required workflow missing: ${name}`);
}
assert.equal(workflowFiles.includes('ai-review.yml'), false,
  'autonomous ai-review workflow must remain absent unless deliberately re-approved');

const workflows = new Map();
for (const name of workflowFiles) workflows.set(name, await readFile(new URL(name, workflowsDir), 'utf8'));
const combined = [...workflows.entries()].map(([name, body]) => `\n# ${name}\n${body}`).join('\n');

const canonicalActionMajors = new Map([
  ['actions/checkout', 'v6'],
  ['actions/setup-node', 'v7'],
  ['actions/setup-python', 'v6'],
  ['actions/upload-artifact', 'v7'],
  ['actions/download-artifact', 'v5'],
  ['actions/github-script', 'v8']
]);
for (const [family, expectedMajor] of canonicalActionMajors) {
  const uses = [...combined.matchAll(new RegExp(`${family.replace('/', '\\/')}@(v\\d+)`, 'g'))];
  for (const use of uses) {
    assert.equal(use[1], expectedMajor,
      `${family}@${use[1]} is not canonical; every ${family} use must be ${family}@${expectedMajor}`);
  }
}

const authWorkflow = workflows.get('auth-audit.yml') || '';
assert.match(authWorkflow, /Path\('app\.html'\)/, 'auth audit must inspect the application shell');
assert.doesNotMatch(authWorkflow, /Path\('index\.html'\).*auth\.css/s,
  'auth audit must not require auth CSS on the public landing page');
assert.match(authWorkflow, /Legacy authentication implementation damaged/,
  'auth audit must preserve the dormant legacy auth implementation');
assert.match(authWorkflow, /V2 local-first boundary validated/,
  'auth audit must enforce the active local-first boundary');

const frontendWorkflow = workflows.get('frontend-audit.yml') || '';
assert.match(frontendWorkflow, /['"]?package\.json['"]?/,
  'frontend audit must run when package.json changes the canonical JS gates');
assert.match(frontendWorkflow, /['"]?\.github\/workflows\/\*\*['"]?/,
  'frontend audit must run the runtime regression gate for every workflow YAML change');
assert.match(frontendWorkflow, /MedPer V2 application composition/,
  'frontend audit must validate the active V2 composition');

const regressionWorkflow = workflows.get('regression-audit.yml') || '';
assert.match(regressionWorkflow, /- ['"]?package\.json['"]?/,
  'regression audit must run when package.json changes test wiring');
assert.match(regressionWorkflow, /js\/v2\/app\.js/,
  'regression audit must treat the V2 entrypoint as canonical');

const siteMap = await readFile(new URL('../docs/SITE_MAP.md', import.meta.url), 'utf8');
assert.match(siteMap, /runtime Node\.js 24 do GitHub Actions/,
  'site map must document the CI runtime boundary');
assert.match(siteMap, /Node 20.*contrato de compatibilidade do projeto/s,
  'site map must distinguish Action runtime from MedPer test runtime');

console.log(`GitHub Actions runtime regression suite completed successfully across ${workflowFiles.length} workflows.`);
