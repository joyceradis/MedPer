# Motor de Dano Pessoal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar um motor puro e testável que governe elegibilidade, progressão e integração dos eixos de dano pessoal sem acoplar regra médico-pericial à interface.

**Architecture:** Um módulo ES puro em `js/methodology/personal-damage.js` recebe estado estruturado e retorna decisões de domínio. A UI e o store continuam proprietários de apresentação e persistência; o motor não toca DOM, localStorage ou Supabase. O resumo preserva eixos independentes e nunca calcula dano global.

**Tech Stack:** JavaScript ES modules, Node >=20, `node:assert/strict` para regressão.

**Spec:** `docs/superpowers/specs/2026-08-17-dano-pessoal-engine-design.md`

## Global Constraints
- Nexo precede valoração.
- Nexo indeterminado não equivale a nexo afastado.
- Sem consolidação, não há valoração permanente definitiva.
- Balthazard permanece restrito ao eixo funcional quando autorizado pelo referencial.
- AIPE, POSAS, dor e repercussões permanecem eixos independentes.
- Nenhum escore global de dano pode existir.

---

### Task 1: Contrato e regressão do motor

**Files:**
- Create: `tests/personal-damage-regression.test.mjs`
- Modify: `package.json`
- Create: `js/methodology/personal-damage.js`

**Interfaces:**
- Produces: `evaluatePersonalDamageGate(input)`, `normalizeAxisStatus(value)`, `validateAxisValuation(axis)`, `composePersonalDamageSummary(input)`.

- [ ] Escrever testes de gate para objeto, dano, nexo e consolidação.
- [ ] Verificar RED: suíte falha enquanto o módulo não existe.
- [ ] Implementar o mínimo para os testes passarem.
- [ ] Verificar GREEN via CI.
- [ ] Refatorar mantendo funções puras.

### Task 2: Regras de valoração por eixo

**Files:**
- Modify: `tests/personal-damage-regression.test.mjs`
- Modify: `js/methodology/personal-damage.js`

**Interfaces:**
- Consumes: estados canônicos do gate.
- Produces: validação de eixo com `valid`, `issues` e valor preservado.

- [ ] Testar que graduação/quantificação sem referencial é rejeitada.
- [ ] Testar que conclusão qualitativa sem número é aceita.
- [ ] Testar que AIPE/POSAS/funcional não são somados.
- [ ] Implementar e verificar GREEN via CI.

### Task 3: Integração com auditoria existente

**Files:**
- Modify: `js/methodology/engine.js`
- Modify: `tests/methodology-regression.test.mjs` ou nova suíte específica se mantiver melhor isolamento.

**Interfaces:**
- Consumes: `evaluatePersonalDamageGate`.
- Produces: avisos/bloqueios coerentes no `auditCase` quando o caso estiver no propósito de dano pessoal.

- [ ] Escrever regressão antes da alteração do `engine.js`.
- [ ] Integrar sem duplicar lógica do novo motor.
- [ ] Verificar que protocolos existentes continuam funcionando.

### Task 4: Persistência estável para backend futuro

**Files:**
- Modify: `js/core/store.js` apenas se o estado atual não aceitar os novos IDs sem perda.
- Modify: `tests/store-regression.test.mjs`.
- Document: `docs/FIELD_MIGRATION_MATRIX.md` se houver migração.

- [ ] Confirmar primeiro se o store já preserva objetos desconhecidos/novos.
- [ ] Só alterar se a regressão demonstrar necessidade real.
- [ ] Nunca acoplar schema Supabase ao motor de domínio nesta etapa.

### Task 5: Superfície guiada mínima

**Files:**
- Modify: componentes existentes em `js/ui/` apenas após o motor estar verde.
- Test: suíte de superfície correspondente.

- [ ] Exibir o próximo passo retornado pelo motor.
- [ ] Ocultar valoração permanente quando não consolidado.
- [ ] Mostrar ajuda contextual em campos quantitativos sem transformar ausência de número em erro.
- [ ] Manter acesso a fundamentação/rastreabilidade.

### Task 6: Verificação e entrega

- [ ] Executar `npm run audit` na CI.
- [ ] Revisar diff contra a spec.
- [ ] Confirmar ausência de `totalDamage`, soma entre constructos ou inferência jurídica.
- [ ] Abrir PR com riscos, limites e próximos passos para Supabase.