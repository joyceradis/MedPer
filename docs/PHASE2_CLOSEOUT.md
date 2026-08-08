# Fase 2 — UX, navegação, identidade e metodologia visual

Este documento registra o fechamento técnico da Fase 2. A implementação só pode ser considerada concluída quando as superfícies abaixo estiverem separadas, a navegação for real, o visual estiver aderente à âncora aprovada e as microfunções existentes permanecerem preservadas.

## Superfícies

- Visão geral — priorização operacional: último caso, próximos prazos, pendências e atalhos.
- Meus casos — listagem, filtros, lifecycle e acesso ao inspector.
- Agenda e prazos — visão própria de compromissos e criticidade temporal.
- Referências técnicas — biblioteca própria, separada do motor decisório.
- Workspace — execução das nove etapas cognitivas da perícia.
- Inspector — resumo rápido do caso, referências e atividade; sem campos editáveis.

## Invariantes

- A função principal do produto é apoiar raciocínio médico-pericial estruturado, rastreável e contextual; o dashboard não substitui o workspace.
- O contexto jurídico-pericial precede objeto, método e instrumentos.
- AIPE permanece disponível no contexto de dano estético quando pertinente, sem automatizar conclusão.
- Lifecycle, importação/exportação, armazenamento local, inspector e PWA não podem ser removidos pela refatoração visual.
- A identidade visual segue `docs/PRODUCT_ANCHOR.md` e o mockup aprovado: sidebar navy profunda, superfícies claras, logomark facetado preenchido, baixa poluição visual e linguagem médico-jurídica.

## Critério de aceite

1. Cada item principal da sidebar abre uma superfície própria; nenhum item apenas rola para uma seção da Visão geral.
2. O item ativo corresponde à superfície visível.
3. Dashboard mantém somente conteúdo de priorização e continuidade.
4. Meus casos mantém filtros e lifecycle.
5. Agenda mantém prazos como entidade própria.
6. Referências técnicas permanecem auditáveis e separadas do motor de decisão.
7. Workspace mantém as nove etapas e as microfunções existentes.
8. Suíte `npm run audit` verde antes da declaração de conclusão.
