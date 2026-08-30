# Tratamento de dados no piloto fechado

Documento **técnico e factual**: descreve o que o sistema faz com o dado, medido no
código, não o que se pretende que ele faça. Serve a dois usos — orientar a operação
do piloto e servir de insumo para a análise jurídica.

**Não é parecer jurídico.** A seção final lista o que precisa de advogado e não pode
sair daqui.

Estado verificado em: `docs/STATUS.md` corrente. Toda afirmação abaixo tem teste ou
arquivo correspondente citado.

---

## 1. Que dado o piloto processa

O piloto roda com **perícias reais**, com até 50 peritas. Isso significa dado pessoal sensível de terceiro
— o periciado —, que não é usuário do sistema e não o escolheu:

| Categoria | Onde vive | Exemplo |
|---|---|---|
| Saúde do periciado | `cases.state_payload` | história, exame, achados, sequelas, conclusão |
| Identificação processual | `cases.reference`, `state_payload` | número do processo, vara, comarca |
| Documentos dos autos | `stored_files` + disco | prontuário, laudo anterior, CAT, BO |
| ~~Imagem do periciado~~ | — | **fora do piloto por decisão**: fotografia de lesão e cicatriz não entra na plataforma nesta fase, e o servidor recusa por conteúdo (§2) |
| Identificação da perita | `users` | nome profissional, e-mail, organização |
| Vencimentos | `case_deadlines` | tipo e data — projeção consultável, sem conteúdo clínico e sem número de processo |

Duas consequências que distinguem este produto de um SaaS comum:

1. **O laudo reidentifica.** Mesmo sem nome, a combinação de número de processo, vara,
   data e descrição de lesão identifica a pessoa. Não existe "anonimizar o caso" sem
   destruir o caso.
2. **O titular não é o cliente.** A perita contrata; o periciado é quem tem o dado
   exposto. Ele não pode revogar consentimento sem inviabilizar a perícia determinada
   judicialmente — a base legal aqui não é consentimento.

---

## 2. O que está implementado hoje

### Em repouso

- **Conteúdo da perícia cifrado** — `cases.state_payload` é gravado como envelope
  Fernet (`backend/app/payload_crypto.py`). A coluna não contém texto legível.
  Verificado em `backend/tests/test_privacy.py::test_case_content_is_not_readable_in_the_database`.
- **Anexos cifrados** — `backend/app/storage.py`, Fernet, chave em
  `MEDPER_FILE_ENCRYPTION_KEY`. Verificado que o que fica no disco não é o
  arquivo original: `test_uploads.py::test_a_pdf_from_the_case_file_is_accepted_and_stored_encrypted`.
- **O que pode ser anexado é decidido pelos BYTES, não pelo tipo declarado.**
  `UploadFile.content_type` vem do cliente — navegador, `curl`, script — e é
  escolhido por quem envia. Enquanto a validação olhava esse cabeçalho, bastava
  declarar `application/pdf` para uma fotografia de lesão entrar. A verificação
  passa a ler a assinatura do conteúdo, e a lista é POSITIVA: entra PDF ou texto;
  o que não é reconhecido é recusado por não constar, em vez de aceito por não
  ter sido lembrado. Lista de formatos PROIBIDOS envelheceria — HEIC, AVIF e o
  próximo formato entrariam sozinhos. Verificado em
  `test_uploads.py::test_a_photograph_declared_as_pdf_is_still_refused` e
  `::test_an_unknown_binary_format_is_refused_rather_than_accepted_by_omission`.
- **A recusa explica o que fazer**: a mensagem nomeia o formato detectado
  ("JPEG") e diz que documento digitalizado precisa ser convertido em PDF antes
  de anexar — a perita não fica diante de um código de erro.
- **Compatibilidade** — linhas gravadas antes da cifragem continuam legíveis e são
  cifradas na próxima escrita, sem script que precise ler dado sensível para
  reescrevê-lo.

> **Consequência operacional:** perder `MEDPER_FILE_ENCRYPTION_KEY` torna todo o
> conteúdo irrecuperável. A chave precisa de custódia separada do backup do banco —
> guardar as duas no mesmo lugar anula a cifragem.

### Em trânsito

- HTTPS pelo proxy de borda. **Não verificado por teste automatizado** — depende da
  configuração de implantação.

### Acesso

- Senha com Argon2; token de acesso curto; refresh opaco guardado como hash
  (`backend/app/security.py`).
- Isolamento por organização em toda consulta de caso (`owned_case`), com RLS no
  Postgres (`backend/scripts/enable_rls.sql`, com `FORCE`).
- Verificado que uma organização não alcança nem exclui caso de outra:
  `test_privacy.py::test_a_case_cannot_be_deleted_from_another_organization`.
- **E-mail único em todo o sistema** (migração 0006). A unicidade anterior era
  (organização, e-mail): o mesmo endereço abria conta em organizações diferentes e
  o login, que busca só por e-mail, devolvia a primeira linha que casasse — ou a
  segunda perita nunca entrava, ou entrava na organização da primeira e via os
  casos dela. Verificado em `test_account_isolation.py`.

### Eliminação

- `DELETE /cases/{id}` remove o caso, as entidades dependentes **e os arquivos do
  disco** — não apenas a linha que os indexava. Verificado em
  `test_uploads.py::test_deleting_the_case_removes_the_uploaded_file_from_disk`.
- **Nome de arquivo não é gravado neste dispositivo.** "prontuario-maria-silva.pdf"
  reidentifica tanto quanto o conteúdo. A lista de anexos é lida do servidor a
  cada visita e vive só na memória da aba; não passa pelo store, que é persistido
  em `localStorage`. Verificado em `tests/case-files-regression.test.mjs`.
- A **trilha de auditoria sobrevive à exclusão** e registra contagens, nunca conteúdo.
  Verificado em `test_privacy.py::test_deleting_a_case_removes_its_content_and_keeps_the_audit_record`.

### Saída de dado por e-mail (lembretes de prazo)

O disparador de lembretes envia e-mail pela conta SMTP configurada — provedor de
terceiro, mensagem que permanece na caixa de entrada indefinidamente. O conteúdo
foi restringido por decisão, não por esquecimento:

| Vai no e-mail | Não vai |
|---|---|
| tipo do prazo ("Entrega do laudo") | número do processo |
| data e hora de vencimento | nome ou qualquer dado do periciado |
| título do caso, escolhido pela perita | qualquer conteúdo clínico |
| link para a perícia (exige login) | anexos |

O número do processo fica de fora porque é chave pública que liga o caso às
partes: bastaria ele para reidentificar. **Recomendação operacional:** não usar
nome de periciado no título do caso, já que o título vai no e-mail.

Implementado em `backend/app/mailer.py::send_deadline_reminder`.

### Rastreabilidade

- `audit_log` registra ator, ação, entidade e momento (`backend/app/audit.py`).
- Retenção definida em `backend/docs/RETENTION.md`.

---

## 3. O que NÃO está implementado

Declarado aqui para que ninguém opere o piloto supondo que exista:

| Lacuna | Efeito prático |
|---|---|
| Sem exportação do caso pelo titular | pedido de acesso (art. 18, II) é atendido manualmente |
| Sem expurgo automático de casos | a retenção de perícia é decisão manual da organização |
| Sem `legal_hold` implementado | está na política, não no código |
| Sem 2FA | conta protegida só por senha |
| Sem notificação automática de incidente | detecção e comunicação são processo humano |
| Sem cálculo automático de prazo processual | a perita informa a data; o sistema lembra, não deduz do CPC |
| Sem cifragem em trânsito verificada por teste | depende da implantação, não do código |
| Sem registro de acesso de leitura | a auditoria cobre escrita e exclusão, não consulta |
| Sem varredura antivírus nos anexos | um PDF malicioso vindo dos autos é armazenado como qualquer outro; a recusa por conteúdo verifica formato, não intenção |
| Sem limite de anexos por perícia | só o limite de tamanho por arquivo (`MEDPER_MAX_UPLOAD_BYTES`) |

---

## 4. Regras de operação do piloto

Vinculantes enquanto o piloto durar:

1. **Uma organização por perita — garantido pelo cadastro, não por disciplina.**
   Não há fluxo de convite: cada registro abre a própria organização e recusa slug
   repetido. O e-mail identifica a conta em todo o sistema, então a mesma pessoa
   não abre duas contas e o login nunca cai na organização de outra. Verificado em
   `backend/tests/test_account_isolation.py`.
2. **A chave de cifragem não entra no repositório**, em nenhuma forma, nem em
   `.env.example`. Custódia separada do backup.
3. **Nada de dado real em captura de tela, relato de erro ou mensagem de suporte.**
   Quando for preciso ilustrar um problema, o caso é reconstruído sintético.
   O nome do arquivo anexado conta como dado real: `prontuario-maria-silva.pdf`
   identifica a pessoa antes de alguém abrir o arquivo.
4. **Exclusão a pedido é executada pela rota**, não por edição direta no banco — só
   a rota apaga os arquivos do disco e registra a trilha.
5. **Restauração de backup testada antes do primeiro caso real**, não depois.
6. **Registro de quem teve acesso administrativo à base** durante o piloto.

---

## 5. O que exige advogado — não pode sair deste documento

O sistema não responde nada disto, e engenharia não deve inventar:

1. **Base legal do tratamento.** Perícia determinada judicialmente não se apoia em
   consentimento do periciado. Qual é a base — cumprimento de obrigação legal,
   exercício regular de direito em processo, tutela da saúde — é definição jurídica
   com efeito sobre tudo o mais.
2. **Papéis.** A perita é controladora do dado do periciado; o MedPer é operador. Isso
   precisa estar num contrato de operador, não presumido.
3. **Se cabe RIPD.** Dado sensível de saúde, em escala, sobre titulares que não
   escolheram o tratamento — a hipótese é forte, a decisão não é minha.
4. **Prazo de retenção da perícia.** Cruza dever de guarda do CFM, prazo processual e
   prescrição. Hoje o sistema não expurga caso automaticamente, deliberadamente.
5. **Termo de uso e política de privacidade** do piloto, incluindo o que se informa
   ao periciado e por qual via.
6. **Comunicação de incidente** — prazo, destinatário, forma.
7. **Sigilo profissional.** O dever médico de sigilo é anterior e independente da
   LGPD; a plataforma o instrumentaliza, não o substitui.

---

## 6. Antes do primeiro caso real

- [ ] Chave de cifragem gerada, em custódia separada do backup
- [ ] Restauração de backup testada ponta a ponta
- [ ] RLS aplicado e verificado no banco de produção
- [ ] HTTPS confirmado, sem porta em claro exposta
- [ ] Uma organização por perita, criadas e conferidas
- [ ] Itens da seção 5 respondidos por advogado
- [ ] Peritas do piloto cientes por escrito das lacunas da seção 3
- [ ] SMTP configurado e `send_deadline_reminders.py --dry-run` conferido antes do primeiro disparo real
- [ ] Cron do disparador de lembretes ativo (de hora em hora)
