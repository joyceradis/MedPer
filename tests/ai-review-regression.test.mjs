import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

const parentSha = '1'.repeat(40);
const beforeSha = '2'.repeat(40);
const emptyTreeSha = '3'.repeat(40);
assert.equal(resolvePushBase({ before: beforeSha, beforeAvailable: true, parent: parentSha, emptyTree: emptyTreeSha }), beforeSha, 'normal push must use github.event.before when that commit is available');
assert.equal(resolvePushBase({ before: beforeSha, beforeAvailable: false, parent: parentSha, emptyTree: emptyTreeSha }), parentSha, 'an unreachable force-push before SHA must fall back to the current head parent');
assert.equal(resolvePushBase({ before: '0'.repeat(40), beforeAvailable: false, parent: parentSha, emptyTree: emptyTreeSha }), parentSha, 'zero before SHA must fall back to the head parent');
assert.equal(resolvePushBase({ before: '0'.repeat(40), beforeAvailable: false, parent: '', emptyTree: emptyTreeSha }), emptyTreeSha, 'first commit must fall back to the empty tree when no parent exists');

const exact = truncateDiff('a'.repeat(60000));
assert.equal(exact.truncated, false);
assert.equal(exact.originalBytes, 60000);
assert.equal(exact.reviewBytes, 60000);

const oversized = truncateDiff('b'.repeat(60001));
assert.equal(oversized.truncated, true);
assert.equal(oversized.originalBytes, 60001);
assert.equal(oversized.reviewBytes, 60000);
assert.equal(Buffer.byteLength(oversized.text, 'utf8'), 60000);

const diffA = 'diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -1 +1 @@\n-old\n+new\n';
const diffB = 'diff --git a/b.js b/b.js\n--- a/b.js\n+++ b/b.js\n@@ -1 +1 @@\n-old\n+new\n';
const diffC = 'diff --git a/c.js b/c.js\n--- a/c.js\n+++ b/c.js\n@@ -1 +1 @@\n-old\n+new\n';
const fullCoverageDiff = `${diffA}${diffB}${diffC}`;
const partialReview = `${diffA}${diffB.slice(0, 35)}`;
const coverage = analyzeDiffCoverage(fullCoverageDiff, partialReview, ['a.js', 'b.js', 'c.js']);
assert.deepEqual(coverage.includedPaths, ['a.js']);
assert.equal(coverage.partialPath, 'b.js');
assert.deepEqual(coverage.omittedPaths, ['c.js']);

const workflow = await readFile(new URL('../.github/workflows/ai-review.yml', import.meta.url), 'utf8');
assert.match(workflow, /^  prepare:/m, 'workflow must have a single prepare job');
assert.equal((workflow.match(/actions\/checkout@v\d+/g) || []).length, 1, 'only the prepare job should clone the repository');
assert.match(workflow, /name:\s*review-input/, 'prepare job must upload canonical review input');
assert.match(workflow, /needs:\s*\[?prepare/, 'reviewer jobs must depend on prepare');
assert.match(workflow, /skip_ai/, 'workflow must propagate documentation-only/empty diff skip metadata');
assert.match(workflow, /<!-- medper-ai-dual-review -->/, 'PR comment needs a stable marker');
assert.match(workflow, /issues\.updateComment/, 'existing review comment must be updated in place');
assert.match(workflow, /truncated/, 'published review must disclose truncation state');
assert.match(workflow, /prepare_failure/, 'post-comment must publish an explanatory body when prepare input is unavailable');
assert.match(workflow, /readJson/, 'post-comment must parse metadata through a guarded helper');
assert.match(workflow, /MAX_COMMENT_CHARS\s*=\s*60000/, 'combined review comments need a conservative GitHub size ceiling');
assert.match(workflow, /MAX_FINDING_CHARS\s*=\s*25000/, 'each provider must retain an explicit independent publication budget');
assert.match(workflow, /MAX_PATH_SUMMARY_CHARS\s*=\s*3000/, 'path disclosure must reserve comment space for both provider findings');
assert.match(workflow, /candidate\.length\s*>\s*MAX_PATH_SUMMARY_CHARS/, 'path summaries must be bounded by characters, not only by path count');
assert.match(workflow, /capFinding/, 'each provider finding must be bounded before composing the PR comment');
assert.match(workflow, /Resultado truncado no comentário/, 'comment-side truncation must be disclosed explicitly');
assert.match(workflow, /capFinding\(gptRaw/, 'GPT findings must pass through the comment cap');
assert.match(workflow, /capFinding\(claudeRaw/, 'Claude findings must pass through the comment cap');

const prepare = await readFile(new URL('../.github/scripts/prepare-review.mjs', import.meta.url), 'utf8');
assert.match(prepare, /fetch[\s\S]*--depth=1[\s\S]*origin/, 'prepare must try to recover a missing nonzero before SHA from origin');
assert.match(prepare, /beforeAvailable/, 'prepare must tell the pure range resolver whether the before commit is reachable');
assert.match(prepare, /merge-base/, 'pull request review must resolve the merge base instead of diffing the moving target tip directly');
assert.doesNotMatch(prepare, /['"]--binary['"]/, 'review-only diffs must not embed binary patches into the 60 KB budget');
assert.match(prepare, /changed_paths:\s*changedPaths/, 'metadata must expose the complete changed-path list');
assert.match(prepare, /omitted_paths:/, 'metadata must expose paths omitted by truncation');
assert.match(prepare, /partial_path:/, 'metadata must expose the path whose diff was only partially included');

const openai = await readFile(new URL('../.github/scripts/review-openai.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(openai, /from ['"]openai['"]|require\(['"]openai['"]\)/, 'OpenAI SDK must not be added');
assert.match(openai, /max_completion_tokens|max_output_tokens/, 'OpenAI response must have an explicit token ceiling');
assert.match(openai, /AI_REVIEW_INPUT_DIR[^\n]*ai-review-input/, 'OpenAI must default to the canonical prepared input directory');
assert.match(openai, /\$\{INPUT_DIR\}\/diff\.review\.txt/, 'OpenAI must consume the canonical prepared diff');
assert.match(openai, /changed_paths/, 'OpenAI prompt must receive the complete changed-path inventory');
assert.match(openai, /omitted_paths/, 'OpenAI prompt must disclose paths wholly omitted by truncation');
assert.match(openai, /partial_path/, 'OpenAI prompt must disclose a partially included path');

const claude = await readFile(new URL('../.github/scripts/review-claude.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(claude, /from ['"]@anthropic-ai\/sdk['"]|require\(['"]@anthropic-ai\/sdk['"]\)/, 'Anthropic SDK must not be added');
assert.match(claude, /claude-opus-5/, 'Claude review should default to Opus 5 during calibration');
assert.match(claude, /thinking\s*:\s*\{[\s\S]*?type:\s*['"]adaptive['"]/, 'Opus 5 must use adaptive thinking');
assert.match(claude, /output_config\s*:\s*\{[\s\S]*?effort/, 'Claude request must set explicit effort through output_config');
assert.doesNotMatch(claude, /budget_tokens/, 'budget_tokens is rejected by Opus 5 and must not return');
assert.match(claude, /stop_reason/, 'Claude response must inspect stop_reason');
assert.match(claude, /refusal/, 'Claude refusal must be reported explicitly rather than treated as an empty response');
assert.match(claude, /AI_REVIEW_INPUT_DIR[^\n]*ai-review-input/, 'Claude must default to the canonical prepared input directory');
assert.match(claude, /\$\{INPUT_DIR\}\/diff\.review\.txt/, 'Claude must consume the canonical prepared diff');
assert.match(claude, /changed_paths/, 'Claude prompt must receive the complete changed-path inventory');
assert.match(claude, /omitted_paths/, 'Claude prompt must disclose paths wholly omitted by truncation');
assert.match(claude, /partial_path/, 'Claude prompt must disclose a partially included path');

console.log('AI review regression suite completed successfully.');
