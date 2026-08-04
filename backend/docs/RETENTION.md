# Política de retenção do MedPer

## Princípios

1. Minimização: conservar apenas o necessário ao objeto pericial, obrigações legais e defesa técnica.
2. Segregação: cada organização define seus prazos, respeitando ordem judicial e deveres profissionais.
3. Exclusão controlada: exclusão lógica antecede expurgo físico; audit logs não são alterados.
4. Legal hold: qualquer caso sob ordem de preservação fica fora das rotinas de expurgo.

## Padrão inicial de homologação

- tokens de redefinição consumidos ou expirados: 7 dias;
- sessões revogadas ou expiradas: 30 dias;
- logs operacionais sem conteúdo médico: 90 dias;
- arquivos órfãos de uploads não vinculados: 24 horas;
- backups diários: 14 dias;
- backups semanais: 8 semanas;
- backups mensais: 12 meses;
- casos e documentos periciais: sem expurgo automático até definição formal da organização.

## Requisitos operacionais

- registrar toda alteração de política;
- manter `legal_hold` por caso antes de automatizar exclusão;
- testar restauração trimestralmente;
- não registrar prontuários, laudos, tokens ou senhas em logs;
- destruir chaves de criptografia somente após confirmação de expurgo e fim do prazo de restauração.

Esta política é um padrão técnico inicial, não substitui análise jurídica, ética e contratual aplicável à organização.
