# MedPer — auditoria de rebaseline

Data: 2026-08-08
Escopo: estado atual da Fase 2 antes de nova alteração de interface
Objetivo: comparar implementação real com `docs/PRODUCT_ANCHOR.md`, `docs/PRODUCT_MAP.md`, `ROADMAP.md` e arquitetura vigente.

## 1. Conclusão executiva

A implementação atual **não deve ser considerada visual ou operacionalmente aprovada**.

O núcleo metodológico, o store, o lifecycle, a separação entre site público e aplicação e várias regressões estruturais permanecem aproveitáveis. O principal problema é deriva da camada de apresentação: navegação primária simulada por scroll, composição excessivamente monolítica, responsividade que muda a arquitetura visual em largura intermediária, ausência de asset de referência versionado para a marca e documentação parcialmente desatualizada.

O próximo ciclo deve corrigir **arquitetura de informação e governança antes de refinamento estético**.

## 2. Evidências objetivas

### AUD-UX-001 — navegação global não cria visões distintas

Severidade: **Alta**
Status: **Confirmado**

Evidência: `js/ui/dashboard-view.js` usa `data-scroll-target` para `Visão geral`, `Meus casos`, `Agenda e prazos` e `Referências técnicas`. O item `Visão geral` é renderizado com `class="is-active"` de forma fixa.

Impacto:

- clicar em `Meus casos` não muda a visão ativa;
- a usuária continua na mesma composição;
- URL/estado não representa a área selecionada;
- a interface contradiz a distinção Dashboard / Casos / Agenda / Biblioteca estabelecida na âncora.

Critério de aceite: rotas/estados separados conforme `docs/PRODUCT_MAP.md` e teste de active navigation.

### AUD-UX-002 — Visão geral contém a visão completa de casos

Severidade: **Alta**
Status: **Confirmado**

Evidência: `renderDashboardHome()` inclui `dashboard-overview`, atalhos, prazos, pendências, `dashboard-cases` com filtros e grade completa, além de `dashboard-references` no mesmo retorno HTML.

Impacto: a home deixa de ser painel executivo e se torna uma página longa multiuso.

Critério de aceite: `overview` contém somente conteúdo permitido pelo mapa; lista/filtros completos ficam em `/cases`.

### AUD-ARCH-001 — apresentação continua excessivamente monolítica

Severidade: **Alta**
Status: **Confirmado**

Evidência:

- `docs/ARCHITECTURE.md` já reconhece `js/ui/app.js` como monolítico;
- `app.js` concentra roteamento, renderização, navegação, eventos, diálogos de criação, mutações e exportação;
- `dashboard-view.js` produz grandes árvores de HTML por template strings.

Impacto: aumenta risco de regressão cognitiva/visual, dificulta testes por superfície e favorece “injeção de HTML” extensa em vez de componentes com responsabilidade clara.

Critério de aceite: decomposição incremental por superfície, sem reescrever store ou motor metodológico.

### AUD-BRAND-001 — geometria da marca não é verificável contra fonte aprovada

Severidade: **Alta**
Status: **Confirmado / bloqueio documental**

Evidência: `icon.svg` é uma geometria criada no código e descrita como canônica, mas o repositório não contém a imagem/mockup-fonte aprovada nem um asset-fonte da geometria final.

Impacto: testes atuais conseguem provar “há polígonos”, mas não conseguem provar fidelidade à marca aprovada. Uma forma visualmente errada pode passar no CI.

Critério de aceite: versionar referência visual e asset aprovado; teste deve validar uso do asset, não inventar geometria.

### AUD-BRAND-002 — responsividade remove o tratamento estrutural do shell

Severidade: **Alta**
Status: **Confirmado**

Evidência: em `css/dashboard.css`, `@media (max-width:760px)` muda `.app-shell-dashboard` para `display:block`, converte a sidebar em faixa superior, oculta `.dashboard-sidebar:after` e `.dashboard-profile` e transforma a navegação em linha horizontal.

Impacto: em janelas intermediárias, a identidade visual e o modelo de navegação mudam radicalmente. Isso explica a captura em que o fundo estrutural/3D desaparece e o menu vira barra horizontal.

Critério de aceite: breakpoint deliberado e validado; tablet/narrow desktop não pode cair incidentalmente no layout móvel se ainda houver espaço funcional para o shell lateral.

### AUD-BRAND-003 — “cara de template/IA” é consequência estrutural, não só cromática

Severidade: **Média-Alta**
Status: **Confirmado por composição**

Evidência: repetição de cards brancos grandes, bordas arredondadas homogêneas, três atalhos estruturalmente idênticos, serifada aplicada de forma ampla e microcores distintas nos atalhos sem função de domínio.

Impacto: aparência genérica de SaaS/gerador de dashboard e redução da identidade médico-jurídica.

Critério de aceite: hierarquia editorial e operacional derivada da função; reduzir cardificação e variação decorativa sem significado.

### AUD-METH-001 — AIPE existe no código, mas sua descoberta depende do Workspace

Severidade: **Média**
Status: **Parcialmente conforme**

Evidência: `js/ui/app.js` importa `AIPE_CATEGORIES`, `AIPE_CONTEXTS`, `AIPE_CRITERIA` e `AIPE_IMPACT_BANDS`, e `renderAipeReference()` é inserido no protocolo `aesthetic` dentro de `renderMethod()`.

Conclusão: AIPE **não foi removida do motor/interface**, porém não pertence ao dashboard global. O problema a auditar é descoberta e acesso correto no fluxo `dano estético → Exame e método`, além da validação crítica da fonte-mãe já registrada como `AIPE-001/002`.

Critério de aceite: teste ponta a ponta com caso de dano estético prova que AIPE aparece somente no contexto adequado e com taxonomia validada.

### AUD-PWA-001 — shell offline ficou inconsistente com a landing atual

Severidade: **Alta**
Status: **Confirmado**

Evidência: `index.html` foi alterado para `css/marketing-canonical.css`, enquanto `sw.js` ainda precacheia `./css/marketing.css` e não contém `marketing-canonical.css`.

Impacto: risco de experiência offline/cache divergente e prova de que o último ciclo foi interrompido antes de fechamento do gate PWA.

Critério de aceite: shell e referências reais idênticos; cache versionado; auditoria PWA verde.

### AUD-DOC-001 — README não descreve mais o estado real

Severidade: **Média-Alta**
Status: **Confirmado**

Evidências:

- slogan ainda diz “orientado ao objeto”, enquanto arquitetura canônica exige contexto jurídico-pericial antes do objeto;
- árvore de arquivos não inclui dashboard, inspector, design system, knowledge layer e novos testes;
- verificação técnica lista apenas parte dos módulos atuais;
- seção de testes descreve cobertura muito menor que a suíte atual.

Critério de aceite: README reconstruído a partir do estado auditado, sem declarar como pronto o que ainda está em rebaseline.

### AUD-DOC-002 — índice de documentação omite documentos canônicos novos

Severidade: **Média**
Status: **Confirmado**

Evidência: `docs/README.md` não lista `PRODUCT_ANCHOR.md`, `PRODUCT_AUDIT.md`, `PRODUCT_MAP.md`, knowledge references nem os planos da Fase 2.

Critério de aceite: hierarquia documental explícita, com âncora e mapa acima de specs de implementação.

### AUD-QA-001 — regressão visual atual valida propriedades insuficientes

Severidade: **Alta**
Status: **Confirmado**

Evidência: os testes de marca/âncora verificam tokens, presença de polígonos e strings CSS, mas não conseguem validar geometria exata da logo, estado ativo da navegação por rota, separação das visões nem fidelidade visual à referência.

Critério de aceite: adicionar contrato de rotas/superfícies e gate manual/visual controlado; testes estáticos não podem ser tratados como prova de equivalência ao mockup.

## 3. Aspectos preservados

Não reescrever sem evidência de defeito:

- `js/core/store.js` como proprietário único da persistência local;
- migração retrocompatível de casos;
- `js/core/case-lifecycle.js` e semântica reversível;
- separação entre site público e `app.html`;
- `js/methodology/aipe.js` declarativo, sem automatismo decisório;
- knowledge layer fora do motor decisório;
- nove etapas cognitivas do Workspace;
- Inspector como conceito contextual separado;
- restrição de dados reais no protótipo público.

## 4. Ordem obrigatória do próximo ciclo

```text
1. congelar este rebaseline
2. corrigir documentação e mapa do produto
3. executar CI integral sobre o baseline
4. classificar falhas reais versus gates obsoletos
5. criar contrato de rotas/superfícies
6. decompor apresentação por visão
7. implementar navegação real
8. validar Workspace/AIPE sem alterar regras metodológicas
9. incorporar asset visual aprovado
10. reconstruir shell/dashboard contra a referência
11. testar desktop / narrow desktop / mobile
12. executar CI integral novamente
13. comparar visualmente com referência
14. atualizar auditoria, arquitetura, README e roadmap
15. somente então declarar a Fase 2 concluída
```

## 5. Regra de merge

Nenhuma correção de estética deve ser fundida se:

- alterar store, lifecycle ou metodologia sem teste específico;
- reintroduzir navegação por scroll como substituto de rota;
- inventar nova geometria de marca;
- esconder falha de CI alterando teste apenas para aceitar a implementação;
- deixar documentação descrevendo estado diferente do código;
- não possuir evidência manual da superfície visual afetada.
