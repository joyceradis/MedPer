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
- Secrets remain unconfigured until verification is green.

---

### Task 1: Regression contract for AI review infrastructure

**Files:**
- Create: `tests/ai-review-regression.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository workflow and scripts as text; future exports from `.github/scripts/review-input.mjs`.
- Produces: a deterministic regression gate invoked by `npm test`.

- [ ] **Step 1: Write the failing test** covering documentation-only detection, zero SHA, 60 KB truncation metadata, shared prepare artifact, stable comment marker/update behavior, Anthropic thinking/stop-reason handling, OpenAI output cap, and absence of SDK imports.
- [ ] **Step 2: Run `node tests/ai-review-regression.test.mjs` and confirm RED** because `.github/scripts/review-input.mjs` and the hardened workflow do not exist yet.
- [ ] **Step 3: Add the test to the end of the existing `npm test` command.**
- [ ] **Step 4: Commit the RED gate.**

### Task 2: Canonical review input preparation

**Files:**
- Create: `.github/scripts/review-input.mjs`
- Create: `.github/scripts/prepare-review.mjs`
- Modify: `.github/workflows/ai-review.yml`

**Interfaces:**
- Produces `isZeroSha(sha)`, `isDocumentationOnly(paths)`, `truncateDiff(diff, limitBytes)`, and `resolvePushBase({ before, after, parent })`.
- `prepare-review.mjs` writes `ai-review-input/diff.txt`, `ai-review-input/diff.review.txt`, `ai-review-input/changed-paths.txt`, and `ai-review-input/meta.json`.

- [ ] **Step 1: Implement pure helpers minimally to satisfy unit assertions.**
- [ ] **Step 2: Implement `prepare-review.mjs` to use environment-provided event/base/head values and shell out only for `git diff`, `git diff --name-only`, and parent lookup.**
- [ ] **Step 3: Replace duplicated reviewer checkouts/diff computation with one `prepare` job and one uploaded `review-input` artifact.**
- [ ] **Step 4: Make reviewer jobs download the same artifact and skip provider calls when `meta.json` says `skip_ai: true`.**
- [ ] **Step 5: Commit canonical input preparation.**

### Task 3: Provider safeguards and bounded output

**Files:**
- Modify: `.github/scripts/review-openai.mjs`
- Modify: `.github/scripts/review-claude.mjs`
- Modify: `.github/workflows/ai-review.yml`

**Interfaces:**
- Both scripts read `ai-review-input/diff.review.txt` and `ai-review-input/meta.json`.
- Both continue to write provider-specific markdown findings under `ai-review-out/`.

- [ ] **Step 1: OpenAI — keep native `fetch`, set an explicit output-token ceiling, and read the canonical artifact.**
- [ ] **Step 2: Anthropic — default to `claude-opus-5`, configure thinking with `budget_tokens` below `max_tokens`, keep effort `high` via workflow variable/environment, and inspect `stop_reason`.**
- [ ] **Step 3: Emit explicit findings for refusal/truncation/empty content instead of silently treating them as success.**
- [ ] **Step 4: Commit provider safeguards.**

### Task 4: Stable consolidated comment

**Files:**
- Modify: `.github/workflows/ai-review.yml`

**Interfaces:**
- Consumes provider findings and `meta.json`.
- Produces one marker-bearing PR comment: `<!-- medper-ai-dual-review -->`.

- [ ] **Step 1: Include skip/truncation/range metadata in the consolidated body.**
- [ ] **Step 2: On PR events, list existing issue comments, locate the marker, and call `issues.updateComment` when found; otherwise create it.**
- [ ] **Step 3: Preserve post-merge associated-PR/commit commentary while clearly labeling it as post-merge.**
- [ ] **Step 4: Commit stable comment behavior.**

### Task 5: Canonical site/repository map

**Files:**
- Modify: `docs/SITE_MAP.md`

**Interfaces:**
- Documentation only; no runtime dependency.

- [ ] **Step 1: Map public, app/dashboard, inspector, workspace, methodology, knowledge, persistence, legacy, PWA, backend/API, and CI/audit surfaces.**
- [ ] **Step 2: State explicitly that AI review is repository governance and cannot mutate case state or medico-legal conclusions.**
- [ ] **Step 3: Commit map update.**

### Task 6: Verification and integration

**Files:**
- No production changes unless verification exposes a defect.

- [ ] **Step 1: Run `node --check` on every new/modified `.mjs` script.**
- [ ] **Step 2: Run `node tests/ai-review-regression.test.mjs`.**
- [ ] **Step 3: Run `npm run check` and `npm test`.**
- [ ] **Step 4: Open/update a PR from `chatgpt/ai-review-hardening` to `claude/ai-dual-review-automation` so repository Actions provide independent execution evidence.**
- [ ] **Step 5: Review CI evidence and only then propose integration into `main`.**
