# Backup completo e ensaio de recuperação

O backup do backend inclui banco PostgreSQL e todos os anexos referenciados. Um dump sozinho não recupera os arquivos. O pacote é cifrado e autenticado no formato [age](https://github.com/FiloSottile/age); a chave privada de recuperação não precisa ficar no servidor que cria backups.

## Preparação operacional

- Instalar `age` e os clientes PostgreSQL compatíveis com a versão do servidor. Usar o Python do ambiente do backend.
- Criar uma identidade com `age-keygen` em ambiente de custódia. Guardar a identidade privada fora do servidor de backup; instalar nele somente o arquivo de destinatários públicos (`age-keygen -y identidade.txt`). Não colocar identidades ou segredos no Git.
- Guardar também a chave `MEDPER_FILE_ENCRYPTION_KEY`, separadamente e com acesso controlado. O pacote contém só seu fingerprint. Perder essa chave impede ler casos e anexos, mesmo com um backup válido.
- A conexão de backup precisa ler todas as linhas. Usar credencial operacional própria, capaz de fazer dump integral apesar de RLS. Nunca dar BYPASSRLS, superusuário ou senha operacional ao processo da API. `pg_dump` deve falhar se só puder enxergar parte dos dados.
- Parar a API e os workers durante a cópia: o banco e os arquivos precisam representar o mesmo instante. O modo de manutenção é uma declaração do operador, não um bloqueio distribuído implementado pelo script. Usar disco cifrado para os temporários privados.

## Criação e verificação

Configurar no ambiente seguro, sem colar valores em logs: `DATABASE_URL`, `MEDPER_STORAGE_PATH`, `MEDPER_FILE_ENCRYPTION_KEY`, `BACKUP_DIR`, `BACKUP_AGE_RECIPIENTS_FILE`, `MEDPER_BACKUP_MAINTENANCE=true` e, se necessário, `PYTHON_BIN`.

```sh
sh backend/scripts/backup.sh
```

O arquivo publicado termina em `.tar.age`. O processo verifica que cada anexo indexado existe, inclui hashes/tamanhos internos e só publica o pacote após a cifragem terminar. Falhas e encerramentos normais removem temporários; SIGKILL/falha do sistema exigem limpeza operacional do diretório privado no disco cifrado. Nenhum backup antigo é apagado automaticamente.

Para verificar uma cópia, em ambiente de recuperação com a identidade privada e a chave da aplicação:

```sh
python backend/scripts/backup_bundle.py verify /copia/medper-....tar.age
```

A autenticação de todo o arquivo termina antes de interpretar o tar. A verificação rejeita membros inesperados, duplicados, links, caminhos fora do pacote, tamanhos e hashes divergentes. Exige também um dump reconhecível pelo `pg_restore`.

## Restauração

Criar um **banco novo e vazio** e escolher um diretório de anexos novo/vazio. Configurar `DATABASE_URL` para esse banco, `MEDPER_STORAGE_PATH` para o destino e `BACKUP_AGE_IDENTITY_FILE` para a identidade privada. Manter os serviços parados e fornecer a mesma chave de aplicação do pacote.

```sh
sh backend/scripts/restore.sh /copia/medper-....tar.age
```

O script recusa substituir banco ou anexos existentes. O banco é restaurado com uma transação e parada ao primeiro erro. Os arquivos verificados são movidos para o destino apenas depois do sucesso do banco. Como banco e filesystem não compartilham uma transação, uma falha de disco após o commit exige corrigir o destino e repetir a recuperação em outro banco novo; não reabrir o serviço antes da validação.

Reaplicar os grants restritos (`restrict_audit.sql`) e conferir as políticas RLS (`enable_rls.sql`) como proprietário. Validar login, autoria, leitura de um caso cifrado e download de um anexo antes de apontar a API para o destino recuperado. A credencial de restauração não vira credencial da API.

Os antigos `.dump.enc` continham apenas o banco e utilizavam o fluxo OpenSSL anterior. Preservá-los e seu material de recuperação; não são pacotes completos nem são aceitos automaticamente pelo novo restaurador. A eventual conversão deve ocorrer em ambiente isolado, com o procedimento legado da versão que os produziu e verificação dos anexos originais.

## Evidência e limites

O job `backup-restore-drill` cria bancos descartáveis, migra o esquema, grava caso/anexo cifrados, aplica RLS, cria o pacote e restaura banco + anexo. Verifica conteúdo decifrável, responsável e RLS preservados; corrupção, chave incompatível, anexo ausente e destinos já usados devem falhar.

O teste não configura cópia externa, agendamento, retenção, alertas nem custódia real. Antes do lançamento, definir RPO/RTO, destino externo e retenção, monitorar a idade do último backup e ensaiar a restauração da cópia externa com as chaves custodiadas. O pacote só é backup operacional depois de estar fora do servidor e ter recuperação comprovada.
