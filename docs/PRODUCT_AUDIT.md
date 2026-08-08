# Auditoria de produto — MedPer

> Documento vivo de governança. Toda correção relevante deve apontar para um ID desta auditoria e registrar evidência, decisão, critério de aceite e teste de regressão quando aplicável.

## Escopo desta rodada

Esta auditoria consolida os achados levantados até o commit `d182325` e prioriza **governança + experiência de uso**. Identidade visual/naming ficam deliberadamente fora desta execução até decisão posterior.

## Convenções

- **Crítica** — risco metodológico, perda de dados, segurança ou conclusão indevida.
- **Alta** — quebra importante do modelo mental, arquitetura ou operação.
- **Média** — fricção relevante sem risco direto à integridade.
- **Baixa** — refinamento de apresentação.

Status admitidos: `Pendente`, `Em especificação`, `Em implementação`, `Em validação`, `Concluído`, `Bloqueado`.

## Backlog oficial

| ID | Camada | Achado | Severidade | Status | Critério de aceite |
|---|---|---|---|---|---|
| METH-001 | Metodologia | Respostas estruturadas ainda dependem de rótulos visíveis em parte do motor. | Alta | Pendente | `value` interno estável separado de `label` visível, com compatibilidade legada e testes. |
| METH-002 | Metodologia | Protocolo sugerido não pode equivaler automaticamente a protocolo ativo. | Alta | Pendente | Sugestão só informa; apenas protocolo principal + protocolos explicitamente aceitos entram em auditoria/bloqueios. |
| AIPE-001 | AIPE | Validar Quadros 1–4 e categorias/faixas contra a fonte-mãe adotada. | Crítica | Pendente | Uma única fonte de verdade metodológica, sem simplificação ou conversão implícita. |
| AIPE-002 | AIPE | Eliminar divergências entre tabela de referência e formulário aplicável. | Crítica | Pendente | Interface, domínio e auditoria usam a mesma taxonomia validada. |
| REF-001 | Referências | Provenance precisa permanecer explícita e auditável. | Crítica | Em validação | Toda referência possui fonte, versão/data, classe, autoridade, âmbito, tema, localizador, finalidade e limitação. |
| REF-002 | Referências | Referência não pode virar regra ou conclusão automaticamente. | Crítica | Concluído estruturalmente | Knowledge layer permanece fora do motor decisório e não altera `engine.js`, protocolos, pontuação ou conclusão. |
| REF-003 | Referências | A apresentação atual ocupa espaço cognitivo excessivo na etapa principal. | Alta | Em especificação | Referências aparecem como apoio contextual discreto, com disclosure progressivo e acesso ao detalhe sob demanda. |
| DATA-001 | Persistência | Casos legados e JSON exportado não podem perder dados durante a refatoração. | Crítica | Gate permanente | Migrações preservam `scope`, metodologia, fontes, fatos, eventos, quesitos e conclusões; regressão automatizada verde. |
| DOMAIN-001 | Domínio | Dashboard precisa refletir ontologia real do trabalho pericial. | Alta | Em especificação | Caso distingue esfera, papel profissional, tribunal/órgão, unidade/vara, regime de honorários, matéria e status. |
| UX-001 | Dashboard | Grade genérica de cards não representa o modelo mental do trabalho pericial. | Alta | Em especificação | Dashboard prioriza papel profissional e organização judicial/administrativa, com filtros operacionais claros. |
| UX-002 | Dashboard | Casos judiciais precisam de organização por Tribunal/Unidade/Vara. | Alta | Em especificação | Usuária localiza processos por papel, tribunal e vara sem abrir cada card. |
| UX-003 | Dashboard | AJG/particular é atributo, não categoria primária. | Média | Em especificação | Regime de honorários funciona como badge/filtro secundário. |
| UX-004 | Lifecycle | Menu `...` cria atrito para ações recorrentes. | Média | Em especificação | Concluir/reabrir e mover para lixeira ficam acessíveis diretamente; exclusão definitiva permanece protegida. |
| UX-005 | Dashboard | CTA `Nova perícia` aparece duplicado em algumas composições. | Média | Em especificação | Existe uma ação primária inequívoca por contexto visual. |
| UX-006 | Dashboard | Cards ocupam espaço demais e têm baixa densidade informacional. | Média | Em especificação | Layout permite varrer vários processos rapidamente, com hierarquia clara de título, referência, vara, papel, matéria e status. |
| UX-007 | Auth | Interface expõe detalhes técnicos de Supabase ao usuário final. | Alta | Pendente | Usuária vê apenas estado funcional de autenticação; configuração de infraestrutura fica fora da UX. |
| UX-008 | Workspace | Base técnica não deve competir com a tarefa cognitiva principal. | Alta | Em especificação | Em cada etapa, referências pertinentes ficam secundárias e recuperáveis sem interromper a execução do método. |
| ARCH-001 | Arquitetura | Domínio, UI, knowledge layer e infraestrutura devem continuar desacoplados. | Alta | Gate permanente | Mudanças de apresentação não alteram regras médicas; knowledge layer não passa a depender do motor decisório. |
| ARCH-002 | Arquitetura | Knowledge base deve permanecer modular por núcleo e pacotes temáticos. | Alta | Em validação | Núcleo transversal + módulos por matéria sem acoplamento obrigatório entre temas. |
| SEC-001 | Segurança | Protótipo público não é ambiente para dados reais sensíveis. | Crítica | Gate permanente | Avisos e arquitetura mantêm essa restrição até autenticação, RLS, armazenamento e políticas estarem validados. |
| QA-001 | Qualidade | Toda alteração metodológica, persistência, lifecycle ou PWA exige teste de regressão. | Crítica | Gate permanente | `npm run audit` + cenários novos relevantes passam antes de merge. |
| QA-002 | Produto | Fluxo final exige auditoria cognitiva por uso real/simulado ponta a ponta. | Alta | Pendente | Perita consegue iniciar, conduzir e concluir um caso sem ambiguidade estrutural ou treinamento individual. |
| REPO-001 | Governança | O repositório precisa ser a memória institucional do produto. | Alta | Em andamento | Roadmap, arquitetura, auditoria e specs refletem o estado real e cada entrega relevante referencia esses documentos. |

## Itens deliberadamente adiados nesta rodada

- naming definitivo;
- logo/logomark;
- favicon e app icon definitivos;
- paleta final;
- tipografia final;
- design system de marca;
- pesquisa de domínio/INPI.

Esses itens permanecem no backlog de marca e não bloqueiam a especificação funcional desta fase.

## Regra de encerramento

Um achado só pode ser marcado como `Concluído` quando houver:

1. alteração correspondente identificável;
2. critério de aceite atendido;
3. regressão relevante coberta;
4. documentação atualizada quando a mudança afetar arquitetura, método ou fluxo;
5. validação manual quando o achado for de experiência.
