# Responsabilidade e acesso individual aos casos

Esta mudança substitui o bloqueio provisório de organizações multiusuário do #133. Ter conta na mesma organização ou cargo `admin` não concede acesso aos casos de outra pessoa. Ainda não há compartilhamento, delegação ou transferência de casos pela API.

- A API atribui `owner_user_id` à sessão autenticada nas três entradas: caso, caso V2 e importação. Valores enviados pelo cliente não controlam a autoria.
- Listagem, estado, CAS, exclusão, evidências, observações, achados, conclusões e anexos exigem organização e responsável coincidentes. Acesso a caso alheio retorna 404.
- As políticas PostgreSQL repetem a proteção em casos, conteúdo, arquivos, snapshots, prazos, lembretes e tabelas de associação. Sem contexto de usuário, o papel `medper_app` não vê casos. Auditoria continua sem permissões de alteração/exclusão e com leitura individual.
- O worker utiliza o mesmo papel restrito e define contexto por usuário. Avisos vão apenas para o responsável ativo; o log de simulação não inclui título do caso ou e-mail.

## Atualização de um banco existente

1. Manter o acesso profissional fechado durante a manutenção e obter um backup cuja restauração tenha sido comprovada.
2. Executar `alembic upgrade head` como proprietário das tabelas, nunca como papel da API. Aplicar em seguida `scripts/restrict_audit.sql` e `scripts/enable_rls.sql` com `psql -v ON_ERROR_STOP=1` como proprietário.
3. A migração `0008_case_owner` atribui casos antigos somente quando o log de criação/importação identifica uma única pessoa existente na mesma organização. Casos sem log, com autores divergentes ou com organização incompatível permanecem intactos e sem responsável. Nenhuma conta recebe esses casos por suposição.
4. Conferir, como proprietário, `SELECT id, organization_id FROM cases WHERE owner_user_id IS NULL`. Cada caso pendente exige revisão operacional da autoria e atribuição auditada antes de ficar acessível. Não oferecer autoapropriação pela API.
5. Executar os testes de isolamento e restaurar uma cópia antes de reabrir acesso. O CI usa dados sintéticos, PostgreSQL real e um papel sem superusuário/BYPASSRLS; não executar a suíte sobre banco de clientes.

Em PostgreSQL, a migração suspende `FORCE ROW LEVEL SECURITY` somente para o proprietário ler casos/auditoria dentro da transação, preservando a ativação de RLS e restaurando as flags antes do commit. O papel da API não recebe privilégios novos.

Não há downgrade automático que elimine a responsabilidade e reabra acesso por organização. Reversões exigem restauração verificada ou correção progressiva. A migração não constitui implantação: hospedagem, backups, cobrança e os demais portões de lançamento continuam independentes.
