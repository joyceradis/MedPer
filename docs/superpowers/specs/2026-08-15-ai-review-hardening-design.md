# AI Review Hardening Design

## Scope

Harden the dual-model AI review pipeline introduced on `claude/ai-dual-review-automation`, preserve dependency-free native `fetch`, and update the canonical site/repository map so the CI/audit subsystem is represented as governance infrastructure rather than runtime product behavior.

## Approved direction

- Keep native `fetch`; do not add OpenAI or Anthropic SDK dependencies.
- Correct the four blocking defects identified in issue #40 before secrets are activated.
- Keep Claude review effort at `high` during initial calibration.
- Compute the review diff once per workflow execution and feed the exact same bytes to GPT and Claude.
- Reuse one marker-bearing PR comment instead of adding one comment per push.
- Make >60 KB truncation explicit in metadata and in the published review comment.
- Skip paid AI review when every changed path is documentation-only (`*.md` or under `docs/**`).
- Resolve push ranges safely when `github.event.before` is the all-zero SHA.

## Architecture

A `prepare` job owns checkout and review-input preparation. It resolves a deterministic base/head range, writes the full diff, changed-path list, a 60 KB review payload, and machine-readable metadata, then uploads those files as one artifact. The GPT and Claude jobs only download that artifact, run their provider-specific review scripts, and upload findings.

Reusable logic for documentation-only detection, zero-SHA detection, range selection, and truncation lives in a small dependency-free ESM helper so it can be regression-tested outside GitHub Actions.

The final `post-comment` job downloads both findings plus the metadata and publishes a consolidated review. On pull requests it searches for a stable HTML marker and updates the existing bot comment when present; otherwise it creates one. Post-merge push behavior remains commit/associated-PR commentary, but the body must state when review was skipped or truncated.

## Provider safeguards

### Anthropic

- Default model: `claude-opus-5`, still overrideable with `CLAUDE_REVIEW_MODEL`.
- Explicit thinking configuration with `type: "enabled"` and `budget_tokens` sized below `max_tokens`.
- `max_tokens` large enough to leave a guaranteed answer budget after thinking.
- Inspect `stop_reason` and distinguish refusal, output truncation, and empty content from success.

### OpenAI

- Keep native `fetch`.
- Default model remains overrideable through `OPENAI_REVIEW_MODEL`; repository activation must verify the identifier available to the account.
- Add an explicit output-token ceiling to prevent unbounded response cost.
- Preserve graceful failure: provider errors produce an explanatory finding artifact rather than failing the whole CI workflow.

## Testing

Add `tests/ai-review-regression.test.mjs` and include it in `npm test`. The regression test covers:

- all-zero SHA detection and push-range fallback contract;
- documentation-only path detection;
- explicit truncation metadata at 60 KB;
- workflow shape: exactly one preparation job, reviewers consume the shared artifact, and PR comments are update-in-place by marker;
- provider safeguards: Anthropic thinking + `stop_reason`; OpenAI output-token ceiling; no SDK imports.

## Site / repository map

Expand `docs/SITE_MAP.md` to include:

- public site;
- dashboard/application routes;
- inspector and workspace stages;
- methodology, knowledge, persistence, and legacy-compatibility boundaries;
- PWA shell;
- backend/API boundary;
- repository governance and CI, including the dual-model review pipeline.

The AI review pipeline must be explicitly labeled as repository governance. It does not run in the browser, does not alter case state, and has no authority to generate or adopt medico-legal conclusions.
