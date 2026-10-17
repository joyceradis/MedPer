# MedPer V2 · critérios verificáveis de aceitação

**Escopo:** `app.html` e `js/v2/**`, não o runtime legado. As verificações de CI existentes são controles parciais, não homologação de produto.

## Smoke test com caso totalmente fictício

- [ ] Inicia sem backend, login, rede remota ou APIs privadas.
- [ ] Cria caso, busca, abre, edita, navega por 11 etapas e exclui (após confirmação).
- [ ] Persiste caso no IndexedDB e recupera após fechar e reabrir a aba.
- [ ] Sem IndexedDB, grava/recupera em fallback local e **informa claramente falhas de quota/indisponibilidade**.
- [ ] Não transforma falha de persistência em mensagem de "salvo".
- [ ] Exporta JSON e importa cópia idêntica, sem dados perdidos silenciosamente ou sobrescrita inesperada.
- [ ] Preserva fontes, cronologia, história, exame, matriz de evidências, metodologia, quesitos e conclusões preenchidas durante round-trip.
- [ ] Identifica formato antigo não suportado, sem descartar campos ou migrar irreversivelmente.
- [ ] Apresenta AIPE/POSAS apenas quando pertinentes, sem concluir pelo usuário.
- [ ] Compõe documento A4 com o conteúdo digitado; nenhuma conclusão automática.
- [ ] Tela e teclado funcionam em desktop/mobile, inclusive re-render e indicação de salvamento.
- [ ] PWA/Service Worker não serve versão antiga incorreta após atualização.

## Fronteira de segurança

- [ ] A UI e os documentos declaram que V2 armazena dados no dispositivo **sem criptografia local implementada**.
- [ ] Só existem dados sintéticos nos testes; não coletar, exportar nem registrar informações reais.
- [ ] Qualquer plano de piloto com casos reais depende de segurança, operação, backup/restauração e base jurídica avaliados separadamente.

## Portas de saída

- [ ] `npm run audit` verde no commit de PR.
- [ ] Teste de comportamento real em navegador (não só grep de strings) incluído e rastreável.
- [ ] Revisão humana de UX e método conforme riscos.
- [ ] Documentação de runtime, ROADMAP, README, STATUS e segurança coerentes.
- [ ] Nenhuma mudança metodológica sem validação da responsável médica.

Relação: [#70](https://github.com/joyceradis/MedPer/issues/70), [#69](https://github.com/joyceradis/MedPer/issues/69), [#71](https://github.com/joyceradis/MedPer/issues/71) e [#95](https://github.com/joyceradis/MedPer/issues/95).
