# Roadmap oficial do MedPer

Este documento é a fonte de verdade para a evolução do produto. Novas funcionalidades devem estar vinculadas a uma etapa ativa ou permanecer no backlog.

## Status geral

| Etapa | Status | Resultado esperado |
|---|---|---|
| 1. Separar site público de dashboard | **Concluída** | Landing pública independente da aplicação interna |
| 2. Projetar experiência cognitiva e identidade própria | **Em andamento** | Produto guiado pelo raciocínio pericial, com linguagem visual reconhecível |
| 3. Conectar Supabase real | Preparada | Autenticação e organização operando em ambiente real |
| 4. Sincronizar casos | Não iniciada | Banco remoto como fonte principal, com suporte offline |
| 5. Testar isolamento e permissões | Não iniciada | Matriz de autorização validada e automatizada |
| 6. Implementar assinatura e limites | Não iniciada | Planos, cobrança, assentos e limites aplicados no servidor |
| 7. Criar onboarding | Não iniciada | Nova usuária chega ao primeiro valor sem suporte individual |
| 8. Publicar planos | Não iniciada | Página comercial coerente com entitlements reais |
| 9. Fazer piloto fechado | Não iniciada | Validação controlada com profissionais reais |
| 10. Abrir venda pública | Não iniciada | Operação comercial, suporte e segurança prontos |

---

## 1. Separar site público de dashboard — concluída

**Objetivo:** distinguir claramente aquisição/comunicação comercial de operação médico-pericial.

### Entregue

- [x] Landing page pública na raiz do projeto.
- [x] Aplicação em entrada própria (`app.html`).
- [x] Casos, controles internos e mensagens de armazenamento removidos da página pública.
- [x] Autenticação, dashboard e PWA restritos à entrada da aplicação.
- [x] Links de entrada, redirecionamento de autenticação e cache atualizados.
- [x] Fallbacks offline separados entre site e aplicação.

### Critérios atendidos

- Visitante anônimo encontra somente conteúdo institucional na raiz.
- Casos e controles operacionais aparecem apenas em `app.html`.
- O botão “Entrar” leva para a aplicação.
- O PWA abre a aplicação, não a landing page.
- O Service Worker distingue a landing da área interna.

---

## 2. Projetar experiência cognitiva e identidade própria — em andamento

**Objetivo:** fazer a interface reproduzir o processo mental de uma perícia tecnicamente bem conduzida e estabelecer uma identidade visual própria.

### Princípio de produto

O MedPer não deve parecer um gerenciador de arquivos, um formulário genérico ou um gerador automático de laudos. Deve conduzir a médica da missão recebida até a conclusão admissível, preservando fontes, hipóteses, limitações e responsabilidade profissional.

### Fonte metodológica

- [x] Criar `docs/MEDPER_METHOD.md` como especificação inicial do método.
- [ ] Validar a sequência cognitiva com casos periciais reais e simulados.
- [ ] Converter a navegação atual para as etapas do Método MedPer.
- [ ] Revisar textos de interface para perguntas operacionais, não rótulos abstratos.
- [ ] Redesenhar o dashboard como espaço de trabalho, não página promocional.
- [ ] Definir tipografia, paleta, iconografia, espaçamento e componentes internos.
- [ ] Documentar o sistema visual mínimo.
- [ ] Validar desktop e mobile.

### Arquitetura cognitiva prevista

1. Delimitação
2. Autos e evidências
3. Cronologia
4. Hipóteses e diligências
5. Exame e método
6. Fundamentação
7. Conclusão
8. Quesitos
9. Documento

### Critérios de conclusão

- A usuária sabe onde está e qual é o próximo passo.
- Cada tela corresponde a uma decisão ou tarefa pericial reconhecível.
- O documento final deriva do raciocínio estruturado.
- Protocolos específicos aparecem apenas quando pertinentes.
- A identidade é reconhecível sem depender do logotipo.
- A interface não promete automação de juízo médico.

---

## 3. Conectar Supabase real

- Criar ambientes de desenvolvimento e produção.
- Aplicar migrations.
- Configurar URL, publishable key, redirect URLs e SMTP.
- Adotar e-mail/senha ou link mágico sem depender de Google Workspace.
- Validar cadastro, confirmação de e-mail, login, recuperação e logout.
- Confirmar criação automática de perfil e organização pessoal.

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
