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
  if (uses.length === 0) continue;
  for (const use of uses) {
    assert.equal(
      use[1],
      expectedMajor,
      `${family}@${use[1]} is not canonical; every ${family} use must be ${family}@${expectedMajor}`
    );
  }
}

const aiWorkflow = workflows.get('ai-review.yml') || '';
const aiSetupNodeUses = [...aiWorkflow.matchAll(/actions\/setup-node@v7[\s\S]*?(?=\n\s*- uses:|\n\s*- name:|$)/g)];
assert.equal(aiSetupNodeUses.length, 3, 'AI review must keep exactly three setup-node steps');
for (const [index, match] of aiSetupNodeUses.entries()) {
  assert.match(
    match[0],
    /package-manager-cache:\s*false/,
    `AI review setup-node step ${index + 1} must explicitly disable automatic package-manager caching`
  );
}

const authWorkflow = workflows.get('auth-audit.yml') || '';
assert.match(authWorkflow, /Path\('app\.html'\)/, 'auth audit must inspect the application shell');
assert.doesNotMatch(authWorkflow, /Path\('index\.html'\).*auth\.css/s, 'auth audit must not require auth CSS on the public landing page');
assert.match(authWorkflow, /onAccessGranted:startApplication/, 'auth audit must track the current access-granted composition contract');
assert.match(authWorkflow, /onAccessRevoked/, 'auth audit must track access revocation wiring');

const siteMap = await readFile(new URL('../docs/SITE_MAP.md', import.meta.url), 'utf8');
assert.match(siteMap, /runtime Node\.js 24 do GitHub Actions/, 'site map must document the CI runtime boundary');
assert.match(siteMap, /Node 20.*contrato de compatibilidade do projeto/s, 'site map must distinguish Action runtime from MedPer test runtime');

console.log(`GitHub Actions runtime regression suite completed successfully across ${workflowFiles.length} workflows.`);
