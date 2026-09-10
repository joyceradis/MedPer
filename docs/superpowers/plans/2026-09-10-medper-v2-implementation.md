# MedPer V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um MedPer V2 local-first capaz de conduzir um caso médico-pericial do cadastro ao documento final em um único workspace.

**Architecture:** Nova camada V2 isolada em `js/v2` com modelo canônico de caso, repositório local, roteador metodológico, compositor de documento e UI. A aplicação antiga permanece no repositório como referência, mas `app.html` passa a inicializar a V2. Motores metodológicos existentes são reaproveitados por importação, sem duplicar regras clínicas.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, IndexedDB com fallback localStorage, Node 20 para testes.

**Spec:** `docs/superpowers/specs/2026-09-10-medper-v2-design.md`

## Global Constraints

- Local-first: backend e autenticação remota nunca podem bloquear abertura/edição.
- Nenhuma conclusão médico-legal automática sem decisão explícita da médica.
- Informação registrada uma vez deve alimentar as etapas seguintes.
- Instrumentos aparecem conforme o objeto/contexto.
- Dados persistidos possuem `schemaVersion` e exportação JSON.
- Documento final deve ser gerado no navegador e imprimível em A4.

---

### Task 1: Core domain + methodology routing
**Files:** Create `js/v2/case-record.js`, `js/v2/method-router.js`; Test `tests/v2-core-regression.test.mjs`.
- [ ] Testar criação/normalização de caso e roteamento de dano estético, incapacidade e nexo.
- [ ] Implementar modelo canônico e roteador puro.
- [ ] Executar teste e auditoria.

### Task 2: Local repository
**Files:** Create `js/v2/repository.js`; extend `tests/v2-core-regression.test.mjs`.
- [ ] Testar serialização, export/import e fallback de storage.
- [ ] Implementar IndexedDB e fallback localStorage.
- [ ] Executar teste e auditoria.

### Task 3: Document composer
**Files:** Create `js/v2/document.js`; extend `tests/v2-core-regression.test.mjs`.
- [ ] Testar composição sem inventar conteúdo e preservando seções do caso.
- [ ] Implementar relatório HTML imprimível e exportação textual.
- [ ] Executar teste e auditoria.

### Task 4: Complete workspace UI
**Files:** Create `js/v2/app.js`, `css/v2.css`; Modify `app.html`.
- [ ] Criar dashboard de casos e modal de novo caso.
- [ ] Criar workspace com 11 etapas, autos/fontes, cronologia, história, exame, métodos, análise, quesitos, conclusão e documento.
- [ ] Integrar AIPE e POSAS existentes quando dano estético for pertinente.
- [ ] Autosave, indicador de salvamento, busca, status, prazo, backup/import e impressão.
- [ ] Garantir responsividade e acessibilidade básica.

### Task 5: PWA + regression integration
**Files:** Modify `package.json`, `sw.js`; extend tests.
- [ ] Incluir módulos V2 em syntax check/test.
- [ ] Atualizar cache shell para V2.
- [ ] Rodar CI completa no PR e corrigir regressões.

### Task 6: Delivery
- [ ] Abrir PR V2 com resumo e critérios de aceitação.
- [ ] Verificar checks/workflows.
- [ ] Revisar diff final e só então considerar candidata a merge.
