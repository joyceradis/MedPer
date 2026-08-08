# Auditoria de produto — MedPer

> Documento vivo de governança. Toda correção relevante deve apontar para um ID desta auditoria e registrar evidência, decisão, critério de aceite e teste de regressão quando aplicável.

## Escopo atual

Baseline funcional: Fase 2 integrada em `main` (`41a2cf0`). A direção canônica de produto e identidade está registrada em `docs/PRODUCT_ANCHOR.md`. Identidade visual deixou de ser item deliberadamente adiado e passa a integrar a implementação, sem autorização para alterar o motor metodológico por razões de UI.

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
| METH-003 | Metodologia | Objeto pericial não pode selecionar método ignorando o contexto jurídico-pericial. | Crítica | Em especificação | Resolução de método considera esfera/contexto, papel e objeto antes de expor instrumentos/fontes aplicáveis; sem regra universal indevida para dano estético, incapacidade, nexo ou responsabilidade. |
| AIPE-001 | AIPE | Validar Quadros 1–4 e categorias/faixas contra a fonte-mãe adotada. | Crítica | Pendente | Uma única fonte de verdade metodológica, sem simplificação ou conversão implícita. |
| AIPE-002 | AIPE | Eliminar divergências entre tabela de referência e formulário aplicável. | Crítica | Pendente | Interface, domínio e auditoria usam a mesma taxonomia validada. |
| REF-001 | Referências | Provenance precisa permanecer explícita e auditável. | Crítica | Em validação | Toda referência possui fonte, versão/data, classe, autoridade, âmbito, tema, localizador, finalidade e limitação. |
| REF-002 | Referências | Referência não pode virar regra ou conclusão automaticamente. | Crítica | Concluído estruturalmente | Knowledge layer permanece fora do motor decisório e não altera `engine.js`, protocolos, pontuação ou conclusão. |
| REF-003 | Referências | A apresentação atual ocupa espaço cognitivo excessivo na etapa principal. | Alta | Em especificação | Referências aparecem como apoio contextual discreto, com disclosure progressivo e acesso ao detalhe sob demanda. |
| DATA-001 | Persistência | Casos legados e JSON exportado não podem perder dados durante a refatoração. | Crítica | Gate permanente | Migrações preservam `scope`, metodologia, fontes, fatos, eventos, quesitos e conclusões; regressão automatizada verde. |
| DATA-002 | Perfil | Foto/avatar futuro exige persistência autenticada e política de armazenamento apropriada. | Alta | Bloqueado | Upload real só é ativado após infraestrutura autenticada, armazenamento, autorização e política de privacidade adequados; protótipo pode usar representação local/demonstrativa segura. |
| DOMAIN-001 | Domínio | Dashboard precisa refletir ontologia real do trabalho pericial. | Alta | Em especificação | Caso distingue esfera, papel profissional, tribunal/órgão, unidade/vara, regime de honorários, matéria e status. |
| DOMAIN-002 | Domínio | Prazos são dimensão transversal e precisam ser modelados separadamente do status visual do card. | Alta | Em especificação | Prazo possui tipo, data/hora, vínculo com caso e criticidade calculável/apresentável sem depender de cor do card. |
| UX-001 | Dashboard | Grade genérica de cards não representa o modelo mental do trabalho pericial. | Alta | Em especificação | Dashboard prioriza trabalho atual, prazos, pendências e acesso a casos, com filtros operacionais claros. |
| UX-002 | Dashboard | Casos judiciais precisam de organização por Tribunal/Unidade/Vara. | Alta | Em especificação | Usuária localiza processos por papel, tribunal e vara sem abrir cada card. |
| UX-003 | Dashboard | AJG/particular é atributo, não categoria primária. | Média | Em especificação | Regime de honorários funciona como badge/filtro secundário. |
| UX-004 | Lifecycle | Menu `...` cria atrito para ações recorrentes. | Média | Em especificação | Concluir/reabrir e mover para lixeira ficam acessíveis diretamente; exclusão definitiva permanece protegida. |
| UX-005 | Dashboard | CTA `Nova perícia` aparece duplicado em algumas composições. | Média | Em especificação | Existe uma ação primária inequívoca por contexto visual. |
| UX-006 | Dashboard | Cards ocupam espaço demais e têm baixa densidade informacional. | Média | Em especificação | Layout permite varrer vários processos rapidamente, com hierarquia clara de título, referência, vara, papel, matéria e status. |
| UX-007 | Auth | Interface expõe detalhes técnicos de Supabase ao usuário final. | Alta | Pendente | Usuária vê apenas estado funcional de autenticação; configuração de infraestrutura fica fora da UX. |
| UX-008 | Workspace | Base técnica não deve competir com a tarefa cognitiva principal. | Alta | Em especificação | Em cada etapa, referências pertinentes ficam secundárias e recuperáveis sem interromper a execução do método. |
| UX-009 | Inspector | Preview do caso não pode replicar o workspace em painel estreito. | Alta | Em especificação | Inspector responde identidade/localização/pendência/prazo/referências/próxima ação em segundos e usa `Resumo | Referências | Atividade`. |
| UX-010 | Seleção | Checkbox permanente gera ruído quando não existe operação em lote. | Média | Em especificação | Controles de seleção surgem contextualmente; seleção múltipla aciona barra de ações apropriada. |
| UX-011 | Prazos | Criticidade não deve infantilizar ou saturar visualmente o dashboard. | Média | Em especificação | Normal usa neutro/azul, atenção âmbar e crítico/atrasado vermelho/coral em microindicadores/texto; evitar pintar cards inteiros. |
| BRAND-001 | Identidade | Favicon/app icon e superfícies ainda podem exibir identidades concorrentes. | Alta | Em especificação | Um logomark canônico abastece aplicação, favicon e app icon, sem versões antigas conflitantes. |
| BRAND-002 | Identidade | Autenticação e aplicação precisam compartilhar a mesma linguagem visual. | Média | Em especificação | Auth usa tokens canônicos e não mantém paleta verde/legada independente. |
| BRAND-003 | Identidade | Ausência de design system único favorece deriva visual. | Alta | Em especificação | Brand, tokens e componentes ficam centralizados e reutilizados pelas superfícies principais. |
| BRAND-004 | Identidade | Wordmark precisa separar marca de semântica de alerta. | Média | Em especificação | `Med` em marfim/branco quente e `Per` em azul institucional; vermelho/coral reservado prioritariamente a danger/criticidade. |
| BRAND-005 | Identidade | Sidebar precisa consolidar a direção institucional aprovada. | Média | Em especificação | Gradiente azul mais luminoso no topo para azul-marinho profundo na base, com contraste e acessibilidade validados. |
| BRAND-006 | Identidade | Iconografia genérica/emoji/3D reduz sobriedade e coerência. | Média | Em especificação | Ícones editoriais/lineares consistentes, sem emoji ou clipart/3D genérico como linguagem principal. |
| ARCH-001 | Arquitetura | Domínio, UI, knowledge layer e infraestrutura devem continuar desacoplados. | Alta | Gate permanente | Mudanças de apresentação não alteram regras médicas; knowledge layer não passa a depender do motor decisório. |
| ARCH-002 | Arquitetura | Knowledge base deve permanecer modular por núcleo, contexto, objeto e métodos/fontes aplicáveis. | Alta | Em validação | Núcleo transversal resolve contexto jurídico-pericial antes do objeto/método; módulos permanecem desacoplados e auditáveis. |
| SEC-001 | Segurança | Protótipo público não é ambiente para dados reais sensíveis. | Crítica | Gate permanente | Avisos e arquitetura mantêm essa restrição até autenticação, RLS, armazenamento e políticas estarem validados. |
| QA-001 | Qualidade | Toda alteração metodológica, persistência, lifecycle ou PWA exige teste de regressão. | Crítica | Gate permanente | `npm run audit` + cenários novos relevantes passam antes de merge. |
| QA-002 | Produto | Fluxo final exige auditoria cognitiva por uso real/simulado ponta a ponta. | Alta | Pendente | Perita consegue iniciar, conduzir e concluir um caso sem ambiguidade estrutural ou treinamento individual. |
| QA-003 | Visual | Similaridade com mockup não prova conformidade de produto. | Alta | Gate permanente | Validação inclui hierarquia cognitiva, responsividade, acessibilidade, dados, lifecycle, segurança e ausência de regressão metodológica. |
| REPO-001 | Governança | O repositório precisa ser a memória institucional do produto. | Alta | Em andamento | Roadmap, arquitetura, auditoria, âncora e specs refletem o estado real e cada entrega relevante referencia esses documentos. |

## Decisões agora congeladas

A direção aprovada está em `docs/PRODUCT_ANCHOR.md`. Em especial: arquitetura metodológica contextual; quatro superfícies (dashboard, inspector, workspace, biblioteca); prazos transversais; progressive disclosure; seleção contextual; logomark canônico; wordmark marfim + azul; sidebar azul em gradiente; vermelho/coral semântico; design system único.

## Regra de encerramento

Um achado só pode ser marcado como `Concluído` quando houver:

1. alteração correspondente identificável;
2. critério de aceite atendido;
3. regressão relevante coberta;
4. documentação atualizada quando a mudança afetar arquitetura, método ou fluxo;
5. validação manual quando o achado for de experiência.

Fluxo macro obrigatório: entrega → congelar commit → auditoria independente → comparar com roadmap → revisar metodologia → arquitetura → segurança → regressão → classificar achados → corrigir cirurgicamente → testes → documentação → roadmap → conclusão.