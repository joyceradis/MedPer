# MedPer — Status de engenharia

**Checkpoint:** Phase 2 UX Closeout — RC1  
**Data:** 2026-08-08  
**Branch canônica:** `main`  
**Estado:** AUTOMAÇÃO VERDE — VALIDAÇÃO VISUAL PÓS-DEPLOY PENDENTE

Este arquivo é a âncora operacional para retomada do trabalho. Se houver conflito entre uma sessão de conversa e este documento, conferir `docs/PRODUCT_ANCHOR.md`, `docs/PRODUCT_MAP.md`, `docs/PRODUCT_AUDIT.md`, `docs/CONTEXT_MODEL.md`, `docs/MEDPER_METHOD.md` e o estado real da `main` antes de alterar código.

## 1. O que está congelado

Não reabrir sem decisão explícita:

- MedPer é plataforma de apoio ao raciocínio médico-pericial, não gerador automático de conclusão.
- Arquitetura cognitiva: núcleo transversal → contexto da atuação → esfera/finalidade → papel/missão/quesitos → objeto médico-pericial → perfil contextual → protocolos/instrumentos possíveis → evidências/análise → conclusão médica proporcional.
- A mesma matéria pode exigir protocolos, perguntas, limites e linguagem conclusiva distintos conforme contexto, finalidade, papel e quesitos.
- Sugestão metodológica não equivale a escolha médica.
- Dashboard, Meus casos, Agenda e prazos, Referências, Inspector e Workspace são superfícies distintas.
- Workspace preserva as nove etapas cognitivas e continua sendo o local de trabalho pericial.
- AIPE é instrumento auxiliar específico para dano estético quando metodologicamente pertinente; não deve desaparecer nem ser generalizada.
- Knowledge layer não altera automaticamente protocolo, pontuação ou conclusão.
- `localStorage` permanece sob responsabilidade exclusiva de `js/core/store.js` no runtime canônico.
- Lifecycle, importação/exportação, Inspector, PWA, autenticação em desenvolvimento e compatibilidade de casos legados são microfunções protegidas.

## 2. Identidade visual congelada

- Logomark: poliedro facetado, preenchido, compacto e vertical; não losango estreito.
- Wordmark: `Med` em marfim/branco quente; `Per` em azul institucional/celeste.
- Sidebar: gradiente azul institucional no topo → navy profundo na base.
- Vermelho/coral é cor semântica de alerta/criticidade, não cor principal da marca.
- Fundo principal claro, baixa poluição visual, sombras discretas e linguagem institucional médico-jurídica.
- Mockup aprovado é a bússola visual; implementação não deve ser reinterpretada como dashboard SaaS genérico.
- Sidebar permanece lateral em desktop e em janelas estreitas de desktop; navegação horizontal é comportamento de telas realmente pequenas.
- Sem ilustrações 3D genéricas: iconografia funcional permanece linear e discreta até existirem assets próprios aprovados.

## 3. Estado atual confirmado

### GREEN — UX/arquitetura da Fase 2

- navegação principal dirigida pelo hash (`#/dashboard/overview`, `/cases`, `/deadlines`, `/references`, `/models`);
- `renderDashboardHome()` resolve a superfície visível em vez de forçar `overview`;
- `surface-controller` controla navegação e não compete com `createApp` pela renderização;
- `← Todos os casos` retorna para `Meus casos`;
- Dashboard, Meus casos, Agenda e Referências possuem superfícies distintas;
- lifecycle e filtros permanecem no fluxo canônico;
- logomark compacta possui gate contra geometria excessivamente estreita/losango;
- sidebar recebeu navy profundo e malha geométrica discreta;
- símbolo decorativo artificial do card de continuidade foi removido;
- breakpoint preserva sidebar lateral em desktop estreito;
- módulos legados não alcançáveis com `localStorage`/globals próprios foram removidos;
- store migration e compatibilidade legada continuam verdes;
- provenance/knowledge layer continuam desacoplados do motor decisório.

### GREEN — metodologia contextual

Implementação documentada em `docs/AUDIT_CONTEXTUAL_METHODOLOGY_2026-08-08.md`.

- store acrescenta IDs internos estáveis (`settingId`, `legalSphereId`, `roleId`, `matterId`, `purposeId`) sem apagar labels legados;
- nova camada `js/methodology/context-resolver.js` resolve finalidade e perfil contextual antes de instrumentos;
- perfis iniciais: dano estético cível, alteração estética/sequela criminal, incapacidade trabalhista e incapacidade previdenciária;
- combinações ainda não validadas permanecem em perfil genérico, sem inferência inventada;
- instrumentos são governados separadamente de protocolos (`activeInstrumentIds` / `dismissedInstrumentIds`);
- AIPE é sugerida no perfil cível de dano estético, mas não no perfil criminal por padrão;
- `engine.js` considera instrumentos ativos no audit metodológico;
- novo `method-context-controller` expõe finalidade, perfil, cautelas e decisão explícita de aceitar/rejeitar instrumento na etapa `Exame e método`;
- sugestão não é convertida silenciosamente em decisão médica.

### Evidência automatizada

Fechamento UX anterior:

- Regression Audit run 92 — SUCCESS;
- Frontend Audit run 176 — SUCCESS.

Metodologia contextual:

- RED de domínio: PR #31;
- GREEN de domínio: PR #32;
- auditoria final do motor: Regression Audit run 104 + Frontend Audit run 192 — SUCCESS;
- RED de UI: PR #34 falhou no gate esperado antes do controlador existir;
- GREEN de UI: Regression Audit run 112 + Frontend Audit run 201 — SUCCESS.

## 4. Pendências antes da saída formal da Fase 2

### A. Validação visual pós-deploy contra o mockup aprovado

A automação não substitui inspeção visual. Após o GitHub Pages publicar o estado atual:

1. abrir Visão geral em desktop normal e janela estreita;
2. comparar logo, wordmark, navy, malha geométrica, proporção de sidebar, espaçamento, cards e densidade com o mockup aprovado;
3. navegar Visão geral → Meus casos → Agenda → Referências → Workspace → Todos os casos;
4. confirmar que o Inspector abre sem virar mini-workspace;
5. abrir caso de dano estético cível e confirmar perfil contextual + AIPE sugerida como instrumento possível;
6. abrir/usar cenário criminal e confirmar que AIPE não é sugerida automaticamente;
7. checar Nova perícia, filtros/lifecycle e Exportar JSON.

### B. Migração de linguagem do wizard

Alguns labels históricos do wizard ainda utilizam `sphere/branch` na interface. O store já normaliza para `setting/legalSphere` e IDs estáveis, mas a redação visual deve ser migrada posteriormente sem quebra de dados. Essa pendência não autoriza reabrir o modelo canônico.

## 5. Critério de saída da Fase 2

A Fase 2 termina quando:

- cada item principal abre superfície real e distinta — **GREEN**;
- função médico-pericial e microfunções protegidas permanecem íntegras — **GREEN automatizado**;
- resolução contextual e controle médico sobre instrumentos — **GREEN automatizado**;
- nenhum gate crítico está vermelho — **GREEN**;
- Frontend Audit e Regression Audit estão verdes — **GREEN**;
- deploy publicado foi comparado visualmente ao mockup — **PENDENTE**.

## 6. Próxima versão

**Ainda não atribuir `v0.2.0`.**  
Após a validação visual pós-deploy sem achados bloqueantes, promover para:

**`v0.2.0 — Phase 2 UX & Experience Baseline`**.

Depois disso, a próxima etapa técnica é resolver conscientemente a arquitetura canônica de persistência (FastAPI relacional × Supabase JSONB) antes de conectar sincronização remota de produção.
