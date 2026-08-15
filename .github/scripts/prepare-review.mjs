import { appendFileSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  DEFAULT_DIFF_LIMIT_BYTES,
  isDocumentationOnly,
  resolvePushBase,
  truncateDiff
} from './review-input.mjs';

const OUT_DIR = 'ai-review-input';
const MAX_GIT_BUFFER = 128 * 1024 * 1024;

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: MAX_GIT_BUFFER,
    ...options
  });
}

function gitTrimmed(args, options = {}) {
  return git(args, options).trim();
}

function tryGitTrimmed(args) {
  try {
    return gitTrimmed(args, { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required to prepare the AI review diff`);
  return value;
}

const eventName = process.env.GITHUB_EVENT_NAME || '';
const head = required(
  process.env.REVIEW_HEAD_SHA || tryGitTrimmed(['rev-parse', 'HEAD']),
  'REVIEW_HEAD_SHA'
);

let base = '';
let rangeSource = '';

if (eventName === 'pull_request') {
  base = required(process.env.REVIEW_BASE_SHA, 'REVIEW_BASE_SHA');
  rangeSource = 'pull_request.base.sha';
} else {
  const before = process.env.REVIEW_BEFORE_SHA || '';
  const parent = tryGitTrimmed(['rev-parse', `${head}^`]);
  const emptyTree = gitTrimmed(['hash-object', '-t', 'tree', '--stdin'], { input: '' });
  base = resolvePushBase({ before, parent, emptyTree });
  rangeSource = before && base === before ? 'push.before' : parent && base === parent ? 'head.parent' : 'empty.tree';
}

base = required(base, 'resolved base SHA');

const diff = git(['diff', '--no-ext-diff', '--binary', base, head]);
const changedPathText = git(['diff', '--name-only', base, head]);
const changedPaths = changedPathText
  .split(/\r?\n/)
  .map(path => path.trim())
  .filter(Boolean);

const documentationOnly = isDocumentationOnly(changedPaths);
const emptyDiff = diff.length === 0 || changedPaths.length === 0;
const skipAi = emptyDiff || documentationOnly;
const skipReason = emptyDiff ? 'empty-diff' : documentationOnly ? 'documentation-only' : '';
const truncated = truncateDiff(diff, DEFAULT_DIFF_LIMIT_BYTES);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/diff.review.txt`, truncated.text, 'utf8');
writeFileSync(`${OUT_DIR}/changed-paths.txt`, changedPaths.join('\n') + (changedPaths.length ? '\n' : ''), 'utf8');

const meta = {
  event_name: eventName || 'unknown',
  base_sha: base,
  head_sha: head,
  range_source: rangeSource,
  changed_paths_count: changedPaths.length,
  documentation_only: documentationOnly,
  skip_ai: skipAi,
  skip_reason: skipReason,
  truncated: truncated.truncated,
  original_bytes: truncated.originalBytes,
  review_bytes: truncated.reviewBytes,
  limit_bytes: truncated.limitBytes
};
writeFileSync(`${OUT_DIR}/meta.json`, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

for (const file of ['review-context.md', 'review-openai.mjs', 'review-claude.mjs']) {
  copyFileSync(`.github/scripts/${file}`, `${OUT_DIR}/${file}`);
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `skip_ai=${skipAi}\n`, 'utf8');
  appendFileSync(githubOutput, `truncated=${truncated.truncated}\n`, 'utf8');
  appendFileSync(githubOutput, `base_sha=${base}\n`, 'utf8');
  appendFileSync(githubOutput, `head_sha=${head}\n`, 'utf8');
}

console.log(
  `Prepared AI review input: ${changedPaths.length} paths, ${truncated.originalBytes} bytes` +
  `${truncated.truncated ? ` (truncated to ${truncated.reviewBytes})` : ''}` +
  `${skipAi ? `; AI skipped: ${skipReason}` : ''}.`
);
