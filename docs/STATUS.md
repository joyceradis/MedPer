# MedPer — Status de engenharia

**Checkpoint:** Phase 2 UX Closeout — RC1  
**Data:** 2026-08-08  
**Branch canônica:** `main`  
**Commit-base deste checkpoint:** `7fdcab1dc0c80dba0af09bbce9d6dd66948a0bea`  
**Estado:** EM FECHAMENTO — NÃO É RELEASE

Este arquivo é a âncora operacional para retomada do trabalho. Se houver conflito entre uma sessão de conversa e este documento, conferir `docs/PRODUCT_ANCHOR.md`, `docs/PRODUCT_MAP.md`, `docs/PRODUCT_AUDIT.md` e o estado real da `main` antes de alterar código.

## 1. O que está congelado

Não reabrir sem decisão explícita:

- MedPer é plataforma de apoio ao raciocínio médico-pericial, não gerador automático de conclusão.
- Arquitetura cognitiva: núcleo transversal → contexto jurídico-pericial → objeto/domínio → métodos/instrumentos/fontes aplicáveis.
- Dashboard, Meus casos, Agenda e prazos, Referências, Inspector e Workspace são superfícies distintas.
- Workspace preserva as nove etapas cognitivas e continua sendo o local de trabalho pericial.
- AIPE permanece instrumento específico para dano estético quando metodologicamente pertinente; não deve desaparecer nem ser generalizada.
- Knowledge layer não altera automaticamente protocolo, pontuação ou conclusão.
- `localStorage` continua sob responsabilidade exclusiva do store.
- Lifecycle, importação/exportação, PWA, autenticação em desenvolvimento e compatibilidade de casos legados são microfunções protegidas.

## 2. Identidade visual congelada

- Logomark: poliedro facetado, preenchido, compacto e vertical; não losango estreito.
- Wordmark: `Med` em marfim/branco quente; `Per` em azul institucional/celeste.
- Sidebar: gradiente azul institucional mais claro no topo → navy profundo na base.
- Vermelho/coral é cor semântica de alerta/criticidade, não cor principal da marca.
- Fundo principal claro, baixa poluição visual, sombras discretas e linguagem institucional médico-jurídica.
- Mockup aprovado é a bússola visual; implementação não deve ser reinterpretada como dashboard SaaS genérico.
- Sidebar deve permanecer lateral em desktop e em janelas estreitas de desktop; navegação horizontal é comportamento de telas realmente pequenas.

## 3. Estado atual confirmado

### Concluído / incorporado

- produto, arquitetura cognitiva e design system documentados;
- mapa oficial de superfícies registrado no repositório;
- backlog auditável e gates metodológicos/segurança/persistência existentes;
- favicon/logomark facetado substituindo a identidade antiga;
- teste de regressão agora rejeita logomark excessivamente estreito/losango;
- dashboard possui componentes operacionais de continuar trabalhando, prazos e pendências;
- referências continuam desacopladas do motor decisório;
- auditoria de entrypoint aceita assets versionados com query string.

### RED deliberado / ainda pendente

- navegação verdadeira entre superfícies ainda precisa ser fechada no renderer canônico;
- `renderDashboardHome()` deve resolver `#/dashboard/cases`, `#/dashboard/deadlines`, `#/dashboard/references` etc. sem voltar para `overview`;
- eliminar disputa entre renderizadores: somente uma camada deve ser responsável pelo HTML visível;
- `surface-controller` deve controlar navegação, não competir com `createApp` pela renderização;
- `← Todos os casos` no workspace deve retornar para `#/dashboard/cases`, não para a Visão geral;
- visual final ainda precisa de validação publicada contra o mockup aprovado;
- workspace precisa receber a mesma linguagem institucional sem comprometer densidade e função médico-pericial.

## 4. Próximo passo — sequência obrigatória

1. **GREEN de navegação**
   - corrigir resolução da superfície por hash no renderizador canônico;
   - remover renderização concorrente do `surface-controller`;
   - testar Visão geral → Meus casos → Agenda → Referências → Workspace → Todos os casos.

2. **Fidelidade visual da Fase 2**
   - aplicar a composição aprovada sem introduzir ilustrações genéricas;
   - manter sidebar navy lateral no desktop;
   - validar logomark/wordmark, fundo geométrico discreto e densidade dos cards;
   - alinhar Workspace e Auth à mesma família visual.

3. **Preservação das microfunções**
   - Nova perícia;
   - filtros e lifecycle;
   - inspector;
   - exportação/importação;
   - AIPE no domínio correto;
   - referências/provenance;
   - autosave/store;
   - PWA/cache;
   - compatibilidade legada.

4. **Auditoria pós-implementação**
   - sintaxe de todo JS/testes;
   - Frontend Audit;
   - Regression Audit;
   - revisão metodológica;
   - revisão de arquitetura;
   - segurança e storage ownership;
   - PWA/cache;
   - comparação visual com o mockup publicado.

5. **Somente após todos os gates verdes**
   - atualizar documentação e roadmap;
   - registrar commit final da Fase 2;
   - promover este checkpoint para uma versão/release real.

## 5. Critério de saída da Fase 2

A Fase 2 não termina quando a página “fica bonita”. Termina quando:

- cada item principal abre uma superfície real e distinta;
- a interface corresponde à âncora aprovada;
- a função médico-pericial continua íntegra;
- AIPE, lifecycle, store, exportação, referências e PWA continuam operacionais;
- nenhum gate crítico está vermelho;
- Frontend Audit e Regression Audit estão verdes;
- o deploy publicado foi comparado visualmente ao mockup de referência.

## 6. Próxima versão

**Não atribuir ainda `v0.2.0`.**  
Candidato após fechamento: `v0.2.0 — Phase 2 UX & Experience Baseline`.
