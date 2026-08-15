# AI Review Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the GPT + Claude CI review deterministic, bounded, auditable, cheaper on irrelevant diffs, and represented correctly in the MedPer architecture/site map.

**Architecture:** Introduce one dependency-free review-input helper and one `prepare` job that computes a canonical diff artifact once. Reviewer jobs consume identical input; provider scripts add output safeguards; the final job updates a stable PR comment. Product runtime remains untouched.

**Tech Stack:** GitHub Actions YAML, Node.js 20 ESM, native `fetch`, Node `assert`, existing zero-dependency npm setup.

## Global Constraints

- Keep native `fetch`; add no npm dependency.
- `js/core/store.js` remains the sole owner of persisted browser state.
- AI review is advisory repository governance only and cannot alter methodology or conclusions.
- Keep the 60,000-byte review-payload ceiling, but make truncation explicit.
- Claude review effort remains `high` during calibration.
- Claude Opus 5 uses adaptive thinking + `output_config.effort`; `budget_tokens` is forbidden for this model generation.
- Secrets remain unconfigured until verification is green.

---

### Task 1: Regression contract for AI review infrastructure

**Files:**
- Create: `tests/ai-review-regression.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository workflow and scripts as text; exports from `.github/scripts/review-input.mjs`.
- Produces: a deterministic regression gate invoked by `npm test`.

- [x] **Step 1: Write the failing test** covering documentation-only detection, zero/unavailable push base, 60 KB truncation metadata, shared prepare artifact, stable comment marker/update behavior, Anthropic thinking/stop-reason/refusal handling, OpenAI output cap, and absence of SDK imports.
- [x] **Step 2: Confirm RED in GitHub Actions** — initial helper absence produced `ERR_MODULE_NOT_FOUND`; the later force-push availability contract also produced the expected RED before implementation.
- [x] **Step 3: Add the test to the end of the existing `npm test` command.**
- [x] **Step 4: Commit the regression gate.**

### Task 2: Canonical review input preparation

**Files:**
- Create: `.github/scripts/review-input.mjs`
- Create: `.github/scripts/prepare-review.mjs`
- Modify: `.github/workflows/ai-review.yml`

**Interfaces:**
- Produces `isZeroSha(sha)`, `isDocumentationOnly(paths)`, `truncateDiff(diff, limitBytes)`, and `resolvePushBase({ before, beforeAvailable, parent, emptyTree })`.
- `prepare-review.mjs` writes `ai-review-input/diff.review.txt`, `ai-review-input/changed-paths.txt`, `ai-review-input/meta.json`, and copies provider/context scripts into the same artifact.

- [x] **Step 1: Implement pure helpers minimally to satisfy unit assertions.**
- [x] **Step 2: Implement `prepare-review.mjs` with deterministic base/head resolution and Git diff generation.**
- [x] **Step 3: Replace duplicated reviewer checkouts/diff computation with one `prepare` job and one uploaded `review-input` artifact.**
- [x] **Step 4: Make reviewer jobs download the same artifact and skip provider calls when `meta.json` says `skip_ai: true`.**
- [x] **Step 5: Recover a nonzero but unavailable `before` SHA with a focused fetch; if recovery fails, fall back to the current head parent/empty tree and record the range source.**

### Task 3: Provider safeguards and bounded output

**Files:**
- Modify: `.github/scripts/review-openai.mjs`
- Modify: `.github/scripts/review-claude.mjs`
- Modify: `.github/workflows/ai-review.yml`

**Interfaces:**
- Both scripts read `ai-review-input/diff.review.txt` and `ai-review-input/meta.json`.
- Both continue to write provider-specific markdown findings under `ai-review-out/`.

- [x] **Step 1: OpenAI — keep native `fetch`, set an explicit output-token ceiling, and read the canonical artifact.**
- [x] **Step 2: Anthropic — default to `claude-opus-5`, use `thinking: { type: "adaptive" }`, set explicit `output_config.effort` with default `high`, and inspect `stop_reason`.**
- [x] **Step 3: Reject `budget_tokens` for Opus 5 and emit explicit findings for refusal/truncation/empty content instead of silently treating them as success.**
- [x] **Step 4: Commit provider safeguards.**

### Task 4: Stable consolidated comment

**Files:**
- Modify: `.github/workflows/ai-review.yml`

**Interfaces:**
- Consumes provider findings and `meta.json`.
- Produces one marker-bearing PR comment: `<!-- medper-ai-dual-review -->`.

- [x] **Step 1: Include skip/truncation/range metadata in the consolidated body.**
- [x] **Step 2: On PR events, list existing issue comments, locate the marker, and call `issues.updateComment` when found; otherwise create it.**
- [x] **Step 3: Preserve post-merge associated-PR/commit commentary while clearly labeling it as post-merge.**
- [x] **Step 4: Commit stable comment behavior.**

### Task 5: Canonical site/repository map

**Files:**
- Modify: `docs/SITE_MAP.md`

**Interfaces:**
- Documentation only; no runtime dependency.

- [x] **Step 1: Map public, app/dashboard, inspector, workspace, methodology, knowledge, persistence, legacy, PWA, backend/API, and CI/audit surfaces.**
- [x] **Step 2: State explicitly that AI review is repository governance and cannot mutate case state or medico-legal conclusions.**
- [x] **Step 3: Preserve the canonical architectural rule required by the existing frontend audit and document the verified Opus 5 adaptive-thinking contract.**

### Task 6: Verification and integration

**Files:**
- No production changes unless verification exposes a defect.

- [x] **Step 1: Verify syntax of every new/modified `.mjs` script through the canonical `npm run check` CI path.**
- [x] **Step 2: Verify `tests/ai-review-regression.test.mjs` through CI after the adaptive-thinking and force-push-base corrections.**
- [x] **Step 3: Verify `npm run check`, `npm test`, application composition, and offline-shell gates.**
- [x] **Step 4: Open PR #41 from `chatgpt/ai-review-hardening` to `claude/ai-dual-review-automation`; separately prove docs-only skip end-to-end in verification PR #42 and close it without merge.**
- [ ] **Step 5: Obtain current-head Codex/Claude review, inspect the final AI workflow evidence, then integrate into the Claude branch if no blocker remains.**
