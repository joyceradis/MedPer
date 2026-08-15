import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_DIFF_LIMIT_BYTES,
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
assert.equal(
  resolvePushBase({ before: beforeSha, parent: parentSha, emptyTree: emptyTreeSha }),
  beforeSha,
  'normal push must use github.event.before'
);
assert.equal(
  resolvePushBase({ before: '0'.repeat(40), parent: parentSha, emptyTree: emptyTreeSha }),
  parentSha,
  'zero before SHA must fall back to the head parent'
);
assert.equal(
  resolvePushBase({ before: '0'.repeat(40), parent: '', emptyTree: emptyTreeSha }),
  emptyTreeSha,
  'first commit must fall back to the empty tree when no parent exists'
);

const exact = truncateDiff('a'.repeat(60000));
assert.equal(exact.truncated, false);
assert.equal(exact.originalBytes, 60000);
assert.equal(exact.reviewBytes, 60000);

const oversized = truncateDiff('b'.repeat(60001));
assert.equal(oversized.truncated, true);
assert.equal(oversized.originalBytes, 60001);
assert.equal(oversized.reviewBytes, 60000);
assert.equal(Buffer.byteLength(oversized.text, 'utf8'), 60000);

const workflow = await readFile(new URL('../.github/workflows/ai-review.yml', import.meta.url), 'utf8');
assert.match(workflow, /^  prepare:/m, 'workflow must have a single prepare job');
assert.equal(
  (workflow.match(/actions\/checkout@v4/g) || []).length,
  1,
  'only the prepare job should clone the repository'
);
assert.match(workflow, /name:\s*review-input/, 'prepare job must upload canonical review input');
assert.match(workflow, /needs:\s*\[?prepare/, 'reviewer jobs must depend on prepare');
assert.match(workflow, /skip_ai/, 'workflow must propagate documentation-only/empty diff skip metadata');
assert.match(workflow, /<!-- medper-ai-dual-review -->/, 'PR comment needs a stable marker');
assert.match(workflow, /issues\.updateComment/, 'existing review comment must be updated in place');
assert.match(workflow, /truncated/, 'published review must disclose truncation state');

const openai = await readFile(new URL('../.github/scripts/review-openai.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(openai, /from ['"]openai['"]|require\(['"]openai['"]\)/, 'OpenAI SDK must not be added');
assert.match(openai, /max_completion_tokens|max_output_tokens/, 'OpenAI response must have an explicit token ceiling');
assert.match(openai, /AI_REVIEW_INPUT_DIR[^\n]*ai-review-input/, 'OpenAI must default to the canonical prepared input directory');
assert.match(openai, /\$\{INPUT_DIR\}\/diff\.review\.txt/, 'OpenAI must consume the canonical prepared diff');

const claude = await readFile(new URL('../.github/scripts/review-claude.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(claude, /from ['"]@anthropic-ai\/sdk['"]|require\(['"]@anthropic-ai\/sdk['"]\)/, 'Anthropic SDK must not be added');
assert.match(claude, /claude-opus-5/, 'Claude review should default to Opus 5 during calibration');
assert.match(claude, /thinking\s*:/, 'Claude request must configure thinking explicitly');
assert.match(claude, /budget_tokens/, 'Claude thinking must have a bounded budget');
assert.match(claude, /stop_reason/, 'Claude response must inspect stop_reason');
assert.match(claude, /AI_REVIEW_INPUT_DIR[^\n]*ai-review-input/, 'Claude must default to the canonical prepared input directory');
assert.match(claude, /\$\{INPUT_DIR\}\/diff\.review\.txt/, 'Claude must consume the canonical prepared diff');

console.log('AI review regression suite completed successfully.');
