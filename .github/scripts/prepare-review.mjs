import { appendFileSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_DIFF_LIMIT_BYTES,
  analyzeDiffCoverage,
  isDocumentationOnly,
  isZeroSha,
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

function hasCommit(sha) {
  if (!sha || isZeroSha(sha)) return false;
  return Boolean(tryGitTrimmed(['rev-parse', '--verify', `${sha}^{commit}`]));
}

function ensureCommit(sha) {
  if (hasCommit(sha)) return true;
  if (!sha || isZeroSha(sha)) return false;

  try {
    git(['fetch', '--no-tags', '--depth=1', 'origin', sha], {
      stdio: ['ignore', 'ignore', 'ignore']
    });
  } catch {
    return false;
  }

  return hasCommit(sha);
}

const eventName = process.env.GITHUB_EVENT_NAME || '';
const head = required(
  process.env.REVIEW_HEAD_SHA || tryGitTrimmed(['rev-parse', 'HEAD']),
  'REVIEW_HEAD_SHA'
);

let base = '';
let rangeSource = '';
// Revisão de onde vêm as REGRAS, deliberadamente distinta da base do delta. O
// merge-base é o ponto correto para calcular o que a PR mudou; para política, o
// ponto correto é o tip da base — é a versão mais atual das regras que já passou
// por revisão. Um merge-base antigo entregaria política desatualizada.
let policyRef = '';

if (eventName === 'pull_request') {
  const targetBase = required(process.env.REVIEW_BASE_SHA, 'REVIEW_BASE_SHA');
  const targetAvailable = ensureCommit(targetBase);
  const mergeBase = targetAvailable ? tryGitTrimmed(['merge-base', targetBase, head]) : '';
  base = mergeBase || targetBase;
  rangeSource = mergeBase ? 'pull_request.merge-base' : 'pull_request.base.sha';
  policyRef = targetBase;
} else {
  const before = process.env.REVIEW_BEFORE_SHA || '';
  const parent = tryGitTrimmed(['rev-parse', `${head}^`]);
  const emptyTree = gitTrimmed(['hash-object', '-t', 'tree', '--stdin'], { input: '' });
  const beforeAvailable = ensureCommit(before);
  base = resolvePushBase({ before, beforeAvailable, parent, emptyTree });

  if (before && !isZeroSha(before) && beforeAvailable && base === before) {
    rangeSource = 'push.before';
  } else if (parent && base === parent) {
    rangeSource = before && !isZeroSha(before)
      ? 'head.parent-after-unavailable-before'
      : 'head.parent';
  } else {
    rangeSource = 'empty.tree';
  }
}

base = required(base, 'resolved base SHA');
// Em push não existe tip da base distinto do head: a revisão confiável é o estado
// anterior ao push, que já é o base resolvido acima.
if (!policyRef) policyRef = base;

const diff = git(['diff', '--no-ext-diff', base, head]);
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
const coverage = analyzeDiffCoverage(diff, truncated.text, changedPaths);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/diff.review.txt`, truncated.text, 'utf8');
writeFileSync(`${OUT_DIR}/changed-paths.txt`, changedPaths.join('\n') + (changedPaths.length ? '\n' : ''), 'utf8');

// Delimitador imprevisível, gerado por execução. Todo dado controlado por quem abre
// a Pull Request — diff e nomes de arquivo — vai dentro dele. Uma cerca fixa pode ser
// fechada pelo próprio conteúdo revisado, e o restante passaria a ser lido como texto
// do operador.
const fence = `MEDPER-UNTRUSTED-INPUT-${randomUUID()}`;

// As regras de revisão não podem vir da Pull Request que está sendo revisada. Se
// viessem, uma PR que altera `review-context.md` seria julgada pelas regras que ela
// mesma escreveu, e "revisado, nenhum problema" passaria a ser resultado controlado
// pelo autor da PR.
let contextSource = `base:${policyRef.slice(0, 7)}`;
let contextText = tryGitTrimmed(['show', `${policyRef}:.github/scripts/review-context.md`]);

if (!contextText) {
  // Não existe versão na revisão confiável (arquivo novo). Não há política
  // independente a aplicar: usa a da PR e declara a procedência no comentário.
  contextText = readFileSync('.github/scripts/review-context.md', 'utf8');
  contextSource = 'head (sem versão na base)';
}

const meta = {
  event_name: eventName || 'unknown',
  base_sha: base,
  head_sha: head,
  fence,
  context_source: contextSource,
  range_source: rangeSource,
  changed_paths_count: changedPaths.length,
  changed_paths: changedPaths,
  included_paths: coverage.includedPaths,
  partial_path: coverage.partialPath,
  omitted_paths: coverage.omittedPaths,
  documentation_only: documentationOnly,
  skip_ai: skipAi,
  skip_reason: skipReason,
  truncated: truncated.truncated,
  original_bytes: truncated.originalBytes,
  review_bytes: truncated.reviewBytes,
  limit_bytes: truncated.limitBytes
};
writeFileSync(`${OUT_DIR}/meta.json`, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

writeFileSync(`${OUT_DIR}/review-context.md`, contextText.endsWith('\n') ? contextText : `${contextText}\n`, 'utf8');

for (const file of ['review-openai.mjs', 'review-claude.mjs']) {
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
  `${truncated.truncated ? ` (truncated to ${truncated.reviewBytes}; partial=${coverage.partialPath || 'none'}; omitted=${coverage.omittedPaths.length})` : ''}` +
  `${skipAi ? `; AI skipped: ${skipReason}` : ''}` +
  `; range source: ${rangeSource}.`
);
