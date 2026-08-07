# Política de segurança

## Estado de segurança do protótipo

A versão publicada do MedPer é um protótipo em desenvolvimento. O modo local utiliza armazenamento no navegador e não oferece as garantias necessárias para tratamento de dados reais de saúde ou dados processuais sigilosos.

**Não utilize a versão pública com dados pessoais identificáveis, prontuários, fotografias clínicas reais, documentos judiciais sigilosos ou qualquer informação protegida.**

## Versões suportadas

| Versão | Suporte de segurança |
|---|---|
| protótipo público atual | correções de desenvolvimento, sem garantia para dados reais |
| ambiente de produção | ainda não disponível |

## Reporte responsável

Não publique vulnerabilidades exploráveis em issues abertas.

Ao identificar um problema, registre de forma privada com:

- componente afetado;
- passos mínimos para reprodução;
- impacto observado;
- condição necessária para exploração;
- sugestão de mitigação, quando houver;
- ausência de dados reais no material enviado.

## Segredos

Nunca devem ser adicionados ao repositório:

- chave `service_role` do Supabase;
- tokens de acesso pessoal;
- senhas;
- segredos OAuth;
- chaves de serviços de IA;
- segredos de webhooks;
- credenciais de cobrança;
- strings de conexão privilegiadas.

A URL pública e a publishable key do Supabase podem ser utilizadas no frontend apenas quando as políticas de Row-Level Security estiverem corretamente aplicadas e testadas.

## Requisitos antes de produção

### Identidade e acesso

- autenticação real;
- confirmação de e-mail;
- recuperação de conta;
- expiração e revogação de sessões;
- autorização server-side;
- segregação por usuário e organização;
- testes de escalada horizontal e vertical.

### Dados

- RLS em todas as tabelas expostas;
- criptografia em trânsito;
- criptografia em repouso;
- armazenamento seguro de documentos;
- política de retenção;
- exclusão controlada;
- exportação dos dados;
- backup e restauração testados.

### Aplicação

- Content Security Policy;
- dependências versionadas;
- proteção contra XSS;
- validação de entradas;
- limites de requisição;
- monitoramento de falhas;
- logs sem conteúdo médico sensível;
- plano de resposta a incidentes.

### Operação

- ambientes separados;
- menor privilégio;
- rotação de credenciais;
- revisão de permissões;
- documentação LGPD;
- contratos e papéis de controlador/operador definidos;
- canal de suporte e incidente.

## Dados de demonstração

Testes públicos e exemplos devem utilizar somente:

- dados fictícios;
- casos integralmente desidentificados;
- números processuais inexistentes;
- imagens sem identificação e com autorização compatível;
- conteúdo criado especificamente para teste.

## Resposta a incidente

Ao confirmar incidente em ambiente futuro de produção:

1. conter o acesso;
2. preservar evidências técnicas;
3. avaliar dados e usuários afetados;
4. revogar credenciais comprometidas;
5. corrigir a causa;
6. restaurar integridade;
7. documentar cronologia e impacto;
8. realizar comunicações exigidas;
9. revisar controles preventivos.

Esta política será ampliada antes do piloto com dados reais.
