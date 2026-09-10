import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import {
  DEFAULT_DIFF_LIMIT_BYTES,
  analyzeDiffCoverage,
  isDocumentationOnly,
  isZeroSha,
  resolvePushBase,
  truncateDiff
} from '../.github/scripts/review-input.mjs';

assert.equal(DEFAULT_DIFF_LIMIT_BYTES, 60000);
assert.equal(isZeroSha('0'.repeat(40)), true);
assert.equal(isZeroSha('1'.repeat(40)), false);
assert.equal(isZeroSha(''), false);
assert.equal(isDocumentationOnly(['README.md']), true);
assert.equal(isDocumentationOnly(['docs/ARCHITECTURE.md', 'docs/SITE_MAP.md']), true);
assert.equal(isDocumentationOnly(['docs/notes.txt']), true);
assert.equal(isDocumentationOnly(['js/core/store.js']), false);
assert.equal(isDocumentationOnly(['README.md', 'js/main.js']), false);
assert.equal(isDocumentationOnly([]), false);

const parentSha='1'.repeat(40), beforeSha='2'.repeat(40), emptyTreeSha='3'.repeat(40);
assert.equal(resolvePushBase({before:beforeSha,beforeAvailable:true,parent:parentSha,emptyTree:emptyTreeSha}),beforeSha);
assert.equal(resolvePushBase({before:beforeSha,beforeAvailable:false,parent:parentSha,emptyTree:emptyTreeSha}),parentSha);
assert.equal(resolvePushBase({before:'0'.repeat(40),beforeAvailable:false,parent:parentSha,emptyTree:emptyTreeSha}),parentSha);
assert.equal(resolvePushBase({before:'0'.repeat(40),beforeAvailable:false,parent:'',emptyTree:emptyTreeSha}),emptyTreeSha);

const exact=truncateDiff('a'.repeat(60000));
assert.equal(exact.truncated,false); assert.equal(exact.originalBytes,60000); assert.equal(exact.reviewBytes,60000);
const oversized=truncateDiff('b'.repeat(60001));
assert.equal(oversized.truncated,true); assert.equal(oversized.originalBytes,60001); assert.equal(oversized.reviewBytes,60000); assert.equal(Buffer.byteLength(oversized.text,'utf8'),60000);

const diffA='diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -1 +1 @@\n-old\n+new\n';
const diffB='diff --git a/b.js b/b.js\n--- a/b.js\n+++ b/b.js\n@@ -1 +1 @@\n-old\n+new\n';
const diffC='diff --git a/c.js b/c.js\n--- a/c.js\n+++ b/c.js\n@@ -1 +1 @@\n-old\n+new\n';
const coverage=analyzeDiffCoverage(`${diffA}${diffB}${diffC}`,`${diffA}${diffB.slice(0,35)}`,['a.js','b.js','c.js']);
assert.deepEqual(coverage.includedPaths,['a.js']); assert.equal(coverage.partialPath,'b.js'); assert.deepEqual(coverage.omittedPaths,['c.js']);

// The autonomous dual-provider workflow was intentionally removed during
// security containment. Its absence is now the safe production state. If a
// workflow with this name is reintroduced later, this regression fails closed
// so the security design must be reviewed deliberately rather than silently.
const workflowUrl=new URL('../.github/workflows/ai-review.yml',import.meta.url);
let workflowExists=true;
try { await access(workflowUrl,constants.F_OK); } catch { workflowExists=false; }
assert.equal(workflowExists,false,'autonomous ai-review.yml must remain absent unless explicitly re-designed and re-approved');

// The pure preparation/reviewer helpers remain regression-tested because they
// are useful code and must not decay into an unsafe state while retained.
const prepare=await readFile(new URL('../.github/scripts/prepare-review.mjs',import.meta.url),'utf8');
assert.match(prepare,/fetch[\s\S]*--depth=1[\s\S]*origin/);
assert.match(prepare,/beforeAvailable/);
assert.match(prepare,/merge-base/);
assert.doesNotMatch(prepare,/['"]--binary['"]/);
assert.match(prepare,/changed_paths:\s*changedPaths/);
assert.match(prepare,/omitted_paths:/);
assert.match(prepare,/partial_path:/);

const openai=await readFile(new URL('../.github/scripts/review-openai.mjs',import.meta.url),'utf8');
assert.doesNotMatch(openai,/from ['"]openai['"]|require\(['"]openai['"]\)/);
assert.match(openai,/max_completion_tokens|max_output_tokens/);
assert.match(openai,/AI_REVIEW_INPUT_DIR[^\n]*ai-review-input/);
assert.match(openai,/changed_paths/); assert.match(openai,/omitted_paths/); assert.match(openai,/partial_path/);

const claude=await readFile(new URL('../.github/scripts/review-claude.mjs',import.meta.url),'utf8');
assert.doesNotMatch(claude,/from ['"]@anthropic-ai\/sdk['"]|require\(['"]@anthropic-ai\/sdk['"]\)/);
assert.match(claude,/claude-opus-5/);
assert.match(claude,/thinking\s*:\s*\{[\s\S]*?type:\s*['"]adaptive['"]/);
assert.match(claude,/output_config\s*:\s*\{[\s\S]*?effort/);
assert.doesNotMatch(claude,/budget_tokens/);
assert.match(claude,/stop_reason/); assert.match(claude,/refusal/);

// Security invariants in retained helpers.
assert.equal(isDocumentationOnly(['.github/scripts/review-context.md']),false);
assert.equal(isDocumentationOnly(['.github/workflows/ai-review.yml','docs/SITE_MAP.md']),false);
assert.equal(isDocumentationOnly(['docs/ARCHITECTURE.md']),true);
assert.match(prepare,/randomUUID/); assert.match(prepare,/fence/);
for (const [name,source] of [['openai',openai],['claude',claude]]) {
  assert.match(source,/meta\.fence/,`${name} must delimit untrusted input`);
  assert.doesNotMatch(source,/```diff/);
  assert.match(source,/throw new Error\([^)]*fence/);
}
const reviewContext=await readFile(new URL('../.github/scripts/review-context.md',import.meta.url),'utf8');
assert.match(reviewContext,/inje[cç]/i);
assert.match(reviewContext,/leg[ií]tima/i);
assert.match(prepare,/policyRef/);
assert.match(prepare,/policyRef = targetBase/);
assert.doesNotMatch(prepare,/copyFileSync[\s\S]{0,120}review-context\.md/);
assert.match(prepare,/context_source/);

console.log('AI review containment regression suite completed successfully.');
