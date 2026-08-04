# Roadmap oficial do MedPer

Este documento é a fonte de verdade para a evolução do produto. Novas funcionalidades devem estar vinculadas a uma etapa ativa ou permanecer no backlog.

## Status geral

| Etapa | Status | Resultado esperado |
|---|---|---|
| 1. Separar site público de dashboard | **Em andamento** | Landing pública independente da aplicação interna |
| 2. Criar identidade visual própria | Não iniciada | Linguagem visual e textual reconhecível como MedPer |
| 3. Conectar Supabase real | Preparada | Autenticação e organização operando em ambiente real |
| 4. Sincronizar casos | Não iniciada | Banco remoto como fonte principal, com suporte offline |
| 5. Testar isolamento e permissões | Não iniciada | Matriz de autorização validada e automatizada |
| 6. Implementar assinatura e limites | Não iniciada | Planos, cobrança, assentos e limites aplicados no servidor |
| 7. Criar onboarding | Não iniciada | Nova usuária chega ao primeiro valor sem suporte individual |
| 8. Publicar planos | Não iniciada | Página comercial coerente com entitlements reais |
| 9. Fazer piloto fechado | Não iniciada | Validação controlada com profissionais reais |
| 10. Abrir venda pública | Não iniciada | Operação comercial, suporte e segurança prontos |

---

## 1. Separar site público de dashboard

**Objetivo:** distinguir claramente aquisição/comunicação comercial de operação médico-pericial.

### Escopo

- [x] Criar uma landing page pública na raiz do projeto.
- [x] Mover a aplicação para uma entrada própria (`app.html`).
- [x] Remover casos, controles internos e mensagens de armazenamento da página pública.
- [x] Manter autenticação, dashboard e PWA restritos à entrada da aplicação.
- [x] Atualizar links de entrada, redirecionamento de autenticação e cache.
- [ ] Revisar experiência de navegação entre site público e aplicação.
- [ ] Validar publicação no GitHub Pages em desktop e mobile.

### Critérios de conclusão

- Visitante anônimo encontra somente conteúdo institucional na raiz.
- Casos e controles operacionais aparecem apenas em `app.html`.
- O botão “Entrar” leva para a aplicação.
- O PWA abre a aplicação, não a landing page.
- O Service Worker não substitui a landing por uma tela interna em falha de rede.

---

## 2. Criar identidade visual própria

**Objetivo:** deixar de parecer um template genérico de SaaS e estabelecer uma marca médico-pericial reconhecível.

### Entregáveis

- Direção de marca, tipografia, paleta e iconografia.
- Sistema de componentes público e interno.
- Linguagem textual centrada na prática pericial.
- Dashboard mais operacional e menos editorial.
- Guia visual mínimo documentado.

### Critério de conclusão

Uma pessoa deve reconhecer o MedPer sem depender do logotipo e compreender, em poucos segundos, que se trata de uma ferramenta médico-pericial.

---

## 3. Conectar Supabase real

- Criar ambientes de desenvolvimento e produção.
- Aplicar migrations.
- Configurar URL, publishable key, redirect URLs e SMTP.
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