# MedPer — Âncora canônica de produto

Data: 2026-08-08
Status: decisão aprovada para implementação
Baseline de engenharia: `main` após merge da Fase 2 (`41a2cf0`)

> Este documento congela as decisões de produto, arquitetura cognitiva e identidade visual aprovadas antes da implementação. Mudanças posteriores devem ser deliberadas e versionadas; não devem ocorrer por deriva estética ou conveniência de implementação.

## 1. Princípio central

O MedPer é um sistema de apoio ao trabalho médico-pericial. A interface organiza, recupera, documenta e torna auditável o raciocínio; não substitui a conclusão do perito.

Regras permanentes:

- nenhuma referência gera conclusão automática;
- sugestão não equivale a decisão;
- literatura não equivale a norma;
- terminologia diferente em uma nova fonte não altera automaticamente a metodologia existente;
- divergências documentais permanecem explícitas;
- UI, domínio, knowledge layer e motor metodológico permanecem desacoplados;
- dados legados não podem ser sacrificados por refatoração visual;
- dados reais sensíveis permanecem proibidos no protótipo público enquanto autenticação, RLS, armazenamento e políticas não estiverem validados.

## 2. Arquitetura metodológica

A arquitetura não deve modelar `Dano estético`, `Incapacidade`, `Nexo causal` ou `Responsabilidade profissional` como pacotes universais indiferentes ao contexto jurídico.

Estrutura conceitual:

```text
NÚCLEO MEDPER
Metodologia pericial transversal
        │
        ▼
CONTEXTO JURÍDICO-PERICIAL
├── Civil
├── Trabalhista
├── Previdenciário/administrativo
├── Criminal
├── Ético-profissional
└── Extrajudicial/outros
        │
        ▼
OBJETO / PROBLEMA PERICIAL
├── Dano estético
├── Incapacidade
├── Nexo causal / concausa
├── Responsabilidade profissional
└── outros objetos
        │
        ▼
MÉTODOS, INSTRUMENTOS E FONTES APLICÁVEIS AO CONTEXTO
├── AIPE, quando pertinente e validado
├── cicatrizes
├── queimaduras
├── métodos próprios de incapacidade
├── métodos próprios de nexo
└── demais módulos específicos
```

O mesmo rótulo clínico ou pericial pode exigir finalidade, linguagem, quesitos, critérios, alcance e enquadramento diferentes conforme esfera, papel profissional e objeto processual. O sistema deve resolver contexto antes de oferecer método.

## 3. Arquitetura da experiência

Quatro superfícies têm funções distintas:

- **Dashboard** — localizar, priorizar e gerir trabalho.
- **Inspector lateral** — reconhecer rapidamente um caso e decidir a próxima ação sem abandonar o dashboard.
- **Workspace** — executar o trabalho e o raciocínio pericial.
- **Biblioteca/Referências técnicas** — consultar e auditar conhecimento.

Não transformar o inspector em uma segunda página espremida dentro do dashboard.

### 3.1 Dashboard

Direção visual aprovada: composição institucional clara, arejada, com sidebar azul e conteúdo em superfícies brancas; alta legibilidade; poucos elementos por bloco; iconografia editorial própria; sem estética de emoji, ilustração genérica de IA ou excesso de badges.

A visão geral deve priorizar:

- saudação/contexto;
- busca global;
- CTA único `Nova perícia`;
- acessos a `Meus casos`, `Agenda e prazos` e `Referências técnicas`;
- `Continuar trabalhando`;
- `Próximos prazos`;
- pendências relevantes.

Prazos são dimensão transversal do produto e devem aparecer de forma operacional, não decorativa.

### 3.2 Casos

A organização deve respeitar dimensões independentes:

- esfera;
- papel profissional;
- tribunal/órgão;
- unidade/vara;
- regime de honorários (AJG, particular etc.);
- matéria/objeto;
- status.

AJG é atributo/filtro secundário, não categoria primária. Em contexto judicial, agrupamento por Tribunal/Vara deve ser favorecido.

Cards/list items devem ser densos e escaneáveis. Ações recorrentes de lifecycle não devem ficar escondidas atrás de `...` sem necessidade. Exclusão definitiva continua protegida e restrita à lixeira.

### 3.3 Inspector lateral

Ao selecionar um caso no dashboard, abrir painel contextual sem abandonar a lista.

Perguntas que ele deve responder em segundos:

1. Que caso é este?
2. Onde está?
3. O que falta?
4. Qual é o próximo prazo?
5. Que referências estão vinculadas?
6. Quero abrir o workspace?

Estrutura preferencial: `Resumo | Referências | Atividade`.

Resumo: objeto, etapa atual, pendências, próximo prazo e última edição. Referências: índice técnico compacto; detalhes completos somente sob demanda. CTA inequívoco: `Abrir perícia`.

### 3.4 Workspace

Mantém as nove etapas cognitivas:

1. Delimitação
2. Autos e evidências
3. Cronologia
4. Hipóteses e diligências
5. Exame e método
6. Fundamentação
7. Conclusão
8. Quesitos
9. Documento

Referências pertinentes ficam secundárias e recuperáveis. A navegação informa estado; não compete com a tarefa.

## 4. Referências e knowledge layer

Cada fonte deve preservar, quando aplicável:

- natureza/classe;
- autoridade;
- versão/data;
- âmbito de aplicação;
- tema;
- localização exata (documento + página/slide);
- finalidade;
- força documental;
- limitação.

Classes mínimas a distinguir:

1. norma/obrigação aplicável;
2. método técnico validado/adotado;
3. recomendação;
4. literatura científica;
5. material didático;
6. exemplo de prática pericial.

Antes de incorporar conteúdo ao motor metodológico, deve ser possível rastrear `fonte → conteúdo → etapa cognitiva → finalidade → força/limitação`.

## 5. Lifecycle e prazos

Estados-base: `Em andamento`, `Concluída`, `Lixeira`.

- concluir é reversível;
- lixeira registra estado anterior;
- restauração recupera estado anterior quando possível;
- exclusão definitiva exige confirmação;
- prazos devem suportar criticidade sem transformar toda a interface em alerta.

Semântica visual de prazo:

- estado normal: neutro/azul institucional;
- atenção: âmbar discreto;
- crítico/atrasado: vermelho/coral semântico;
- preferir ponto/luz, texto ou pequeno marcador a pintar cards inteiros.

## 6. Seleção e operações em lote

Checkbox é contextual. Não deve permanecer espalhado pela interface quando não há tarefa de seleção.

Fluxo preferido: `Selecionar` → revelar controles → selecionar itens → mostrar barra contextual de ações.

Aplicações: escalas, documentos, quesitos, referências, anexos, checklists e outras coleções com ação em lote.

Princípio: **progressive disclosure** — mostrar imediatamente apenas o necessário para a decisão atual e revelar controles adicionais quando a tarefa exigir.

## 7. MedPer Design System

```text
MEDPER DESIGN SYSTEM

Brand
├── logomark
├── wordmark
├── favicon
└── app icon

Tokens
├── background
├── surface
├── text
├── muted
├── border
├── accent
├── success
├── warning
└── danger

Components
├── buttons
├── badges
├── cards
├── inputs
├── dialogs
├── navigation
└── selection controls
```

### 7.1 Marca

Logomark canônico: poliedro facetado preenchido, em posição vertical/alinhada, com faces multicoloridas e linhas estruturais claras. Não inclinar, deitar ou redesenhar arbitrariamente a geometria.

Wordmark aprovado como direção:

- `Med` — marfim/branco quente;
- `Per` — azul-celeste institucional;
- vermelho/coral não é cor principal do lettering; fica reservado prioritariamente a estados semânticos.

A logo canônica deve alimentar também favicon e app icon, evitando identidades concorrentes entre aba, autenticação e aplicação.

### 7.2 Paleta e sidebar

Direção: linguagem institucional inspirada na lógica cromática azul do ecossistema judiciário do ES, sem copiar a identidade do TJES.

Sidebar: gradiente azul mais luminoso no topo → azul-marinho profundo na base. Fundos principais muito claros. Marfim adiciona sofisticação e reduz aparência de portal governamental.

As cores multicoloridas do logomark aparecem na marca e em microdetalhes controlados; não devem ser espalhadas indiscriminadamente pela UI.

### 7.3 Tipografia e iconografia

Evitar tipografia excessivamente ornamental e aparência genérica de template. Hierarquia editorial: serifada sofisticada pode ser usada em títulos selecionados; texto funcional deve permanecer altamente legível.

Iconografia: desenhos lineares/editoriais personalizados, sóbrios e consistentes. Evitar emojis, clipart, 3D genérico e ilustrações com aparência de geração automática.

## 8. Perfil

A UI prevê avatar/foto de perfil do usuário. Isso é requisito de produto, mas persistência real de imagem depende da arquitetura autenticada/armazenamento e das políticas de privacidade. Não acoplar upload real ao protótipo público sem infraestrutura adequada.

## 9. Governança de mudança

Fluxo obrigatório para declarar uma etapa concluída:

```text
entrega
→ congelar commit
→ auditoria independente
→ comparar com roadmap
→ revisar metodologia
→ revisar arquitetura
→ revisar segurança
→ revisar regressão
→ classificar achados
→ corrigir cirurgicamente
→ executar testes
→ atualizar documentação
→ atualizar roadmap
→ declarar etapa concluída
```

`docs/PRODUCT_AUDIT.md` é o backlog oficial de achados. Cada correção relevante deve registrar evidência, impacto/decisão, critério de aceite, commit e regressão quando aplicável.

## 10. Ordem de implementação após esta âncora

1. atualizar governança/backlog para refletir decisões de marca agora aprovadas;
2. consolidar assets e tokens canônicos;
3. implementar shell/sidebar/dashboard preservando store e dados;
4. implementar visão `Meus casos`, filtros, agrupamentos, lifecycle e prazos;
5. implementar inspector contextual;
6. ajustar workspace e disclosure de referências sem alterar motor metodológico;
7. validar compatibilidade, segurança, PWA e regressões;
8. atualizar documentação/roadmap;
9. auditoria final antes de merge.

## 11. Critério de não-regressão conceitual

Uma implementação visualmente semelhante ao mockup não é suficiente. Ela só é aceitável se preservar simultaneamente:

- hierarquia cognitiva;
- integridade metodológica;
- rastreabilidade documental;
- contexto jurídico-pericial;
- lifecycle;
- persistência legada;
- segurança;
- acessibilidade e responsividade;
- sobriedade visual.

A âncora define intenção e invariantes. O código deve demonstrar que os cumpre.