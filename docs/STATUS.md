# MedPer — Status de engenharia

**Checkpoint:** Phase 2 UX Closeout — RC1  
**Data:** 2026-08-08  
**Branch canônica:** `main`  
**Estado:** AUTOMAÇÃO VERDE — VALIDAÇÃO VISUAL PÓS-DEPLOY PENDENTE

Este arquivo é a âncora operacional para retomada do trabalho. Se houver conflito entre uma sessão de conversa e este documento, conferir `docs/PRODUCT_ANCHOR.md`, `docs/PRODUCT_MAP.md`, `docs/PRODUCT_AUDIT.md` e o estado real da `main` antes de alterar código.

## 1. O que está congelado

Não reabrir sem decisão explícita:

- MedPer é plataforma de apoio ao raciocínio médico-pericial, não gerador automático de conclusão.
- Arquitetura cognitiva: núcleo transversal → contexto jurídico-pericial → objeto/domínio → métodos/instrumentos/fontes aplicáveis.
- Dashboard, Meus casos, Agenda e prazos, Referências, Inspector e Workspace são superfícies distintas.
- Workspace preserva as nove etapas cognitivas e continua sendo o local de trabalho pericial.
- AIPE permanece instrumento específico para dano estético quando metodologicamente pertinente; não deve desaparecer nem ser generalizada.
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

### GREEN incorporado

- navegação principal agora é dirigida pelo hash (`#/dashboard/overview`, `/cases`, `/deadlines`, `/references`, `/models`);
- `renderDashboardHome()` resolve a superfície visível em vez de forçar `overview`;
- `surface-controller` controla navegação e deixou de competir com `createApp` pela renderização do HTML;
- `← Todos os casos` no workspace retorna para `Meus casos`;
- Dashboard, Meus casos, Agenda e Referências possuem superfícies distintas;
- lifecycle e filtros permanecem no fluxo canônico;
- logomark compacta possui gate contra geometria excessivamente estreita/losango;
- sidebar recebeu navy mais profundo e malha geométrica discreta;
- símbolo decorativo artificial do card de continuidade foi removido;
- breakpoint foi ajustado para preservar a sidebar lateral em desktop estreito;
- módulos legados não alcançáveis que mantinham `localStorage`/globals próprios foram removidos (`js/api-client.js`, `js/preflight.js`, `js/app.js`, `js/guided-methodology.js`, `js/methodology-ui.js`, `js/methodology.js`);
- código histórico continua recuperável pelo Git e nenhuma dessas unidades fazia parte do entrypoint ou APP_SHELL atual;
- store migration e compatibilidade legada continuam verdes;
- provenance/knowledge layer continuam desacoplados do motor decisório;
- AIPE e salvaguardas metodológicas não foram alteradas no fechamento de UX.

### Evidência automatizada

Auditoria independente final v2, PR de verificação `#30`:

- **Regression Audit — SUCCESS** (`run 92`);
- **Frontend Audit — SUCCESS** (`run 176`).

O primeiro ciclo de auditoria falhou e não foi contornado: revelou módulos legados com ownership indevido de `localStorage` e um teste visual congelado na antiga cor navy. Os módulos mortos foram removidos e o contrato visual foi atualizado para a âncora vigente; somente então a segunda auditoria ficou verde.

## 4. Única pendência para saída formal da Fase 2

### Validação visual pós-deploy contra o mockup aprovado

A automação não substitui inspeção visual. Após o GitHub Pages publicar o estado atual:

1. abrir Visão geral em desktop normal e janela estreita;
2. comparar logo, wordmark, navy, malha geométrica, proporção de sidebar, espaçamento, cards e densidade com o mockup aprovado;
3. navegar Visão geral → Meus casos → Agenda → Referências → Workspace → Todos os casos;
4. confirmar que o Inspector abre sem virar mini-workspace;
5. abrir caso de dano estético e confirmar acesso à AIPE no contexto metodológico pertinente;
6. checar Nova perícia, filtros/lifecycle e Exportar JSON;
7. registrar qualquer divergência visual/funcional como achado antes de promover a versão.

## 5. Critério de saída da Fase 2

A Fase 2 termina quando:

- cada item principal abre uma superfície real e distinta — **GREEN**;
- função médico-pericial e microfunções protegidas permanecem íntegras — **GREEN automatizado**;
- nenhum gate crítico está vermelho — **GREEN**;
- Frontend Audit e Regression Audit estão verdes — **GREEN**;
- deploy publicado foi comparado visualmente ao mockup — **PENDENTE**.

## 6. Próxima versão

**Ainda não atribuir `v0.2.0`.**  
Após a validação visual pós-deploy sem achados bloqueantes, promover para:

**`v0.2.0 — Phase 2 UX & Experience Baseline`**.

Depois disso, a próxima etapa técnica é resolver conscientemente a arquitetura canônica de persistência (FastAPI relacional × Supabase JSONB) antes de conectar sincronização remota de produção.
