# Roadmap oficial do MedPer

**Referência operacional revisada em 17/10/2026:** `app.html` executa a V2 local (11 etapas; IndexedDB/fallback localStorage). O quadro abaixo distingue a V2 atual, os módulos legados e a infraestrutura experimental. Ver [`docs/V2_RUNTIME.md`](docs/V2_RUNTIME.md) e [#95](https://github.com/joyceradis/MedPer/issues/95).

**Gate anterior a qualquer piloto real:** integridade de dados, backup/recovery, autenticação/autorização, controle de acesso, privacidade e validação jurídica/operacional. Não conectar dados pessoais por pressa.

## Frente zero — integridade da V2 publicada

- [ ] Validar salvamento/reabertura e falha de quota/IndexedDB em navegador, sem exibir "salvo" em erro.
- [ ] Validar round-trip de arquivos V2 com dados sintéticos e rejeição segura de formatos não suportados.
- [ ] Definir migração não destrutiva das chaves `medper.state.v4/v3/v2` e `mlks.prototype.v1`.
- [ ] Criar teste comportamental do workspace V2, além de verificação textual de módulos.
- [ ] Reconciliar documentação V2 e código antigo.
- [ ] Validar acessibilidade e usabilidade desktop/mobile.
- [ ] Manter decisão médica sobre instrumentos e conclusões.
- [ ] Resolver um backend canônico e o contrato versionado **antes** de qualquer sincronização.

**Issues:** [#95](https://github.com/joyceradis/MedPer/issues/95), [#69](https://github.com/joyceradis/MedPer/issues/69), [#70](https://github.com/joyceradis/MedPer/issues/70), [#71](https://github.com/joyceradis/MedPer/issues/71), [#74](https://github.com/joyceradis/MedPer/issues/74).

Este documento é a fonte de verdade para a evolução do produto. Novas funcionalidades devem estar vinculadas a uma etapa ativa ou permanecer no backlog.

## Status geral

Os marcos de UX e metodologia marcados como concluídos abaixo pertencem a entregas históricas do frontend anterior; sua equivalência com os 11 passos da V2 exige teste próprio.

| Etapa | Status | Resultado esperado |
|---|---|---|
| 1. Separar site público de dashboard | **Concluída** | Landing pública independente da aplicação interna |
| 2. Projetar experiência cognitiva e identidade própria | **Em andamento** | Interface alinhada ao raciocínio médico-pericial e identidade reconhecível |
| 3. Definir backend e contrato canônicos | **Bloqueada por decisão arquitetural** | Backend único e schema versionado, sem duplicação FastAPI/Supabase |
| 4. Sincronizar casos | Não iniciada; depende da etapa 3 | Persistência remota validada, sem perda offline |
| 5. Testar isolamento e permissões | Não concluída para a V2 | Matriz de autorização em backend canônico e testes entre usuários |
| 6. Implementar assinatura e limites | Não iniciada | Planos, cobrança, assentos e limites aplicados no servidor |
| 7. Criar onboarding | Não iniciada | Nova usuária chega ao primeiro valor sem suporte individual |
| 8. Publicar planos | Não iniciada | Página comercial coerente com entitlements reais |
| 9. Fazer piloto fechado | Não iniciada | Validação controlada com profissionais reais |
| 10. Abrir venda pública | Não iniciada | Operação comercial, suporte e segurança prontos |

**Frente transversal — governança de repositório e CI.** Não é etapa do produto e não bloqueia as demais: revisão automatizada em dois modelos sobre Pull Requests e pushes na `main`, **com duas exclusões deliberadas** — mudanças exclusivamente documentais (`docs/**` e `*.md` fora de `.github/**`) não geram chamada paga, e PRs de fork não executam os jobs pagos porque o GitHub lhes nega secrets. O diff é tratado como entrada não confiável, o token opera em permissão mínima e as regras de revisão são lidas sempre da base confiável (#41, #46, #47). Depende de decisão da Founder para ativar os secrets — sem eles o pipeline roda, informa qual chave falta e encerra, sem custo (#40).

---

## 1. Separar site público de dashboard

**Objetivo:** distinguir claramente aquisição/comunicação comercial de operação médico-pericial.

### Escopo concluído

- [x] Criar uma landing page pública na raiz do projeto.
- [x] Mover a aplicação para uma entrada própria (`app.html`).
- [x] Remover casos, controles internos e mensagens de armazenamento da página pública.
- [x] Manter o workspace na entrada própria; **autenticação real ainda não protege a V2 pública**.
- [x] Atualizar links de entrada, redirecionamento de autenticação e cache.
- [x] Revisar experiência de navegação entre site público e aplicação.
- [x] Validar publicação no GitHub Pages em desktop.

### Critérios de conclusão

- Visitante anônimo encontra somente conteúdo institucional na raiz.
- Casos e controles operacionais aparecem apenas em `app.html`.
- O botão “Entrar” leva para a aplicação.
- O PWA abre a aplicação, não a landing page.
- O Service Worker não substitui a landing por uma tela interna em falha de rede.

---

## 2. Projetar experiência cognitiva e identidade própria

**Objetivo:** materializar o Método MedPer na aplicação e estabelecer uma identidade médico-pericial própria.

### Método-alvo histórico do frontend anterior (9 etapas); a V2 pública possui 11 etapas

1. Delimitação.
2. Autos e evidências.
3. Cronologia.
4. Hipóteses e diligências.
5. Exame e método.
6. Fundamentação.
7. Conclusão.
8. Quesitos.
9. Documento.

### Gates de regressão já concluídos

- [x] Baseline de auditoria documentada.
- [x] Sincronização retrocompatível entre `scope` e objeto metodológico.
- [x] Testes de migração e preservação de casos legados.
- [x] Persistência de textos longos sem reconstrução a cada caractere.
- [x] Matriz de migração entre campos atuais e novo fluxo.

### Entregáveis ainda pendentes

- [x] IDs estáveis separados dos rótulos visíveis nos protocolos, com compatibilidade dos rótulos legados.
- [x] Navegação cognitiva alinhada às nove etapas do Método MedPer.
- [x] Navegação operacional por estado do caso: em andamento, concluídas e lixeira.
- [x] Resolução adaptativa de múltiplos protocolos com controle médico sobre sugestões.
- [x] AIPE de referência aberta no dano estético, sem automatismo decisório.
- [x] Base técnica contextual classificada por natureza, autoridade, versão, âmbito e tema, com fonte/localização e divergências explícitas fora do motor decisório.
- [x] Entrada AIPE derivada da tabela de referência — categoria "Médio" e banda "Severo" passam a ser registráveis, e registros feitos sob a escala anterior aparecem marcados em vez de sumirem da tela (#50).
- [x] Superfície "Modelos e checklists" deixa de ser placeholder: publica o Protocolo de Conferência Pericial (#51) e o converte em ferramenta com itens marcáveis, progresso e conferência persistida por caso (#53).
- [x] Etapa do caso aberta pela tarefa que ali se cumpre: a base técnica passa a vir depois do trabalho e a auditoria ganha escopo de etapa — o total de bloqueios e ressalvas do caso continua declarado e a lista integral fica a um clique.
- [x] Aplicação utilizável em largura de telefone na tela de caso: a navegação de etapas rola dentro de si em vez de empurrar a página para 862px num viewport de 420px.
- [x] O primeiro clique depois de editar um campo passa a valer: o redesenho espera o ponteiro ser solto em vez de destruir o alvo entre o mousedown e o mouseup.
- Estrutura de Laudo Pericial Judicial ao lado da etapa Documento — conteúdo pronto em `claude/report-structure-model`, aguardando reimplementação no idioma de ferramenta.
- Redesenho visual definitivo e identidade de marca.
- Guia visual mínimo.
- Testes manuais em desktop e mobile.

### Critério de conclusão

Uma médica deve reconhecer a sequência do trabalho pericial, saber em qual etapa está e compreender o próximo passo sem treinamento individual. Os casos existentes devem permanecer íntegros.

---

## 3. Definir contrato e backend canônicos (ainda não homologados)

- Comparar contratos V2, store legado, FastAPI e Supabase; evitar introduzir uma quarta representação incompatível.
- Decidir e documentar um único backend operacional, preservando o código histórico até migração segura.
- Versionar contrato de caso; testar frontend → API → banco → API → frontend com exemplos sintéticos.
- Projetar autenticação, isolamento por caso/organização, migrações, retenção e chave de cifragem.
- Antes de produção, validar configuração e implantação em ambiente de homologação isolado.

**Gate:** [#68](https://github.com/joyceradis/MedPer/issues/68), [#69](https://github.com/joyceradis/MedPer/issues/69) e [#95](https://github.com/joyceradis/MedPer/issues/95).

## 4. Sincronizar casos

- Carregar casos do banco ao iniciar sessão.
- Criar, atualizar, arquivar e excluir no banco.
- Implementar versionamento otimista e tratamento de conflitos.
- Preservar rascunhos offline sem perda silenciosa.
- Criar migração assistida do armazenamento local.

## 5. Testar isolamento e permissões

- Testar acesso horizontal e vertical com múltiplos usuários.
- Validar casos privados, organizacionais e compartilhados.
- Automatizar cenários de RLS e regressão.
- Documentar a matriz de papéis e permissões.

## 6. Implementar assinatura e limites

- Integrar provedor de cobrança.
- Processar webhooks no servidor.
- Aplicar limites de casos e assentos fora do frontend.
- Implementar upgrade, downgrade, cancelamento e inadimplência.

## 7. Criar onboarding

- Completar perfil profissional.
- Escolher espaço pessoal ou equipe.
- Criar primeira perícia.
- Concluir primeira etapa metodológica.
- Explicar salvamento, privacidade e plano.

## 8. Publicar planos

- Individual.
- Equipe.
- Institucional.
- Benefícios e limites alinhados ao backend.
- Preço e política de cancelamento publicados.

## 9. Fazer piloto fechado

- 5 a 15 profissionais.
- 30 a 60 dias.
- Métricas de ativação, conclusão, suporte e retenção.
- Correção de falhas críticas antes de venda pública.

## 10. Abrir venda pública

- Checkout autônomo.
- Monitoramento e alertas.
- Termos, privacidade e suporte.
- Backup e restauração testados.
- Processo de incidentes e métricas comerciais.

---

## Regra de priorização

Toda solicitação deve responder:

1. Em qual etapa entra?
2. Qual dependência resolve?
3. Qual critério de conclusão atende?

Sem resposta objetiva, a solicitação vai para backlog.
