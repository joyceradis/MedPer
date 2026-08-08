# MedPer Product Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved MedPer product anchor incrementally without changing medical-pericial decision rules.

**Architecture:** Preserve the current store, lifecycle and methodology modules. Introduce a thin presentation layer for dashboard/inspector/deadlines and canonical design tokens; route all new UI through existing normalized case data, adding only backward-compatible optional fields where required. Knowledge references remain outside the decision engine and are rendered with progressive disclosure.

**Tech Stack:** Vanilla JavaScript ES modules, HTML, CSS, Node 20 regression tests, PWA/service worker, GitHub Pages.

## Global Constraints

- No production code without a failing regression test first.
- Do not change AIPE scoring, engine conclusions or activate protocols from suggestions.
- Preserve all legacy case migrations/import/export behavior.
- Redesign must not make public prototype safe for real sensitive data.
- `npm run audit` must be green before merge.
- Dashboard, inspector, workspace and library remain distinct surfaces.
- Context resolution must precede method selection: legal/pericial context → object/domain → applicable methods/instruments.
- Canonical brand direction is defined in `docs/PRODUCT_ANCHOR.md` once merged.

---

### Task 1: Context-aware case presentation model

**Files:**
- Modify: `js/core/store.js`
- Modify: `js/core/case-lifecycle.js`
- Test: `tests/store-regression.test.mjs`
- Test: `tests/case-lifecycle.test.mjs`

**Interfaces:**
- Consumes: existing `normalizeCase(caseData)` and lifecycle helpers.
- Produces: backward-compatible normalized optional fields for tribunal/unit/honorarium/deadlines without changing existing required schema.

- [ ] Step 1: add failing tests proving legacy cases normalize unchanged while new optional operational metadata is retained.
- [ ] Step 2: run targeted tests and confirm expected failure.
- [ ] Step 3: implement minimal normalization/defaults.
- [ ] Step 4: run targeted tests and full `npm run audit`.
- [ ] Step 5: commit.

### Task 2: Dashboard view model and deadline semantics

**Files:**
- Create: `js/ui/dashboard-model.js`
- Modify: `js/ui/app.js`
- Modify: `package.json`
- Test: `tests/dashboard-regression.test.mjs`

**Interfaces:**
- Consumes: normalized cases.
- Produces: `buildDashboardModel(cases, now)` with active counts, recent case, pending actions and sorted deadline rows; no HTML and no methodology mutation.

- [ ] Step 1: write failing tests for deadline ordering and neutral/warning/danger classification.
- [ ] Step 2: verify RED.
- [ ] Step 3: implement minimal pure view-model functions.
- [ ] Step 4: verify GREEN and add the test to `npm test`.
- [ ] Step 5: commit.

### Task 3: Canonical design tokens and application shell

**Files:**
- Modify: `css/styles.css`
- Modify: `app.html`
- Modify: `manifest.webmanifest`
- Modify: `sw.js`
- Test: existing architecture/PWA checks plus a new static regression assertion if needed.

**Interfaces:**
- Consumes: product anchor brand tokens.
- Produces: canonical CSS custom properties, gradient sidebar shell, consistent typography and semantic status colors.

- [ ] Step 1: add failing static assertions for canonical token names and single asset references.
- [ ] Step 2: verify RED.
- [ ] Step 3: implement tokens/shell only, without redesigning workspace internals yet.
- [ ] Step 4: verify audit and PWA asset integrity.
- [ ] Step 5: commit.

### Task 4: Approved dashboard composition

**Files:**
- Modify: `js/ui/app.js`
- Modify: `css/styles.css`
- Test: `tests/dashboard-regression.test.mjs`

**Interfaces:**
- Consumes: `buildDashboardModel`.
- Produces: Visão geral with single CTA, quick access, Continue working, Next deadlines and Pendências.

- [ ] Step 1: add failing DOM/string regression checks for one `Nova perícia`, deadline section and no duplicate case-grid home shell.
- [ ] Step 2: verify RED.
- [ ] Step 3: implement minimal approved dashboard composition.
- [ ] Step 4: verify GREEN + full audit.
- [ ] Step 5: commit.

### Task 5: Meus casos operational view and lifecycle actions

**Files:**
- Modify: `js/ui/app.js`
- Modify: `css/styles.css`
- Test: `tests/case-lifecycle.test.mjs`
- Test: `tests/dashboard-regression.test.mjs`

**Interfaces:**
- Consumes: lifecycle module and normalized context fields.
- Produces: dense, scannable case list grouped/filterable by professional/judicial context; direct reversible lifecycle actions.

- [ ] Step 1: failing tests for direct trash/reopen/complete semantics and grouping labels.
- [ ] Step 2: verify RED.
- [ ] Step 3: implement view without changing lifecycle state machine semantics.
- [ ] Step 4: verify GREEN + audit.
- [ ] Step 5: commit.

### Task 6: Case inspector with progressive disclosure

**Files:**
- Create: `js/ui/case-inspector.js`
- Modify: `js/ui/app.js`
- Modify: `css/styles.css`
- Test: `tests/inspector-regression.test.mjs`

**Interfaces:**
- Consumes: normalized case + knowledge query functions.
- Produces: compact `Resumo | Referências | Atividade` inspector; no decision-engine calls beyond read-only audit summaries already exposed.

- [ ] Step 1: failing tests for compact summary and reference index metadata.
- [ ] Step 2: verify RED.
- [ ] Step 3: implement inspector module and event wiring.
- [ ] Step 4: verify GREEN + audit.
- [ ] Step 5: commit.

### Task 7: Workspace reference disclosure refinement

**Files:**
- Modify: `js/ui/app.js`
- Modify: `css/styles.css`
- Test: `tests/knowledge-regression.test.mjs`
- Test: `tests/workflow-regression.test.mjs`

**Interfaces:**
- Consumes: existing `getRelevantKnowledge`, `getRelevantDivergences`.
- Produces: compact reference indicator/index with full provenance on demand.

- [ ] Step 1: failing regression proving references remain read-only and hidden detail does not disappear from DOM/data model.
- [ ] Step 2: verify RED.
- [ ] Step 3: reduce visual footprint only.
- [ ] Step 4: verify methodology/knowledge/workflow tests + audit.
- [ ] Step 5: commit.

### Task 8: Brand assets, favicon and auth consistency

**Files:**
- Create/Modify: canonical logo asset(s) under `assets/`
- Modify: `app.html`
- Modify: public/auth HTML/CSS entrypoints discovered during implementation
- Modify: `manifest.webmanifest`
- Modify: `sw.js`
- Test: static/PWA audit.

**Interfaces:**
- Consumes: canonical approved logomark asset supplied/approved by product owner.
- Produces: one brand source used by favicon/app icon/auth/application.

- [ ] Step 1: audit all current icon/logo references and add failing assertion for legacy identity references.
- [ ] Step 2: verify RED.
- [ ] Step 3: replace references without changing auth behavior.
- [ ] Step 4: verify GREEN + PWA audit.
- [ ] Step 5: commit.

### Task 9: Final independent audit and documentation

**Files:**
- Modify: `docs/PRODUCT_AUDIT.md`
- Modify: `ROADMAP.md`
- Modify: architecture/design docs only where implementation changed reality.

**Interfaces:**
- Consumes: all prior commits and test evidence.
- Produces: auditable closure record; no product code.

- [ ] Step 1: freeze implementation commit SHA.
- [ ] Step 2: compare implementation against anchor, roadmap and backlog.
- [ ] Step 3: run methodology, architecture, security, persistence, PWA and regression audits.
- [ ] Step 4: classify remaining findings and fix only blocking/high-risk regressions before closure.
- [ ] Step 5: update docs with evidence and declare phase complete only if gates pass.
