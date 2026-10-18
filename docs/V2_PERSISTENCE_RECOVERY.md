# Persistência V2: política conservadora de integridade

Categoria: fix/data. Escopo: correção dos P1 de importação concorrente e fallback da PR #96, vinculada à #97. Sem alteração de schema, metodologia, migração ou sincronização.

## Fonte de leitura e escrita

- Quando IndexedDB está disponível e não há registros no armazenamento alternativo, todas as operações usam IndexedDB. Erros de abertura, transação, leitura, escrita ou remoção são propagados. Não existe fallback silencioso após uma falha.
- Quando a API IndexedDB está ausente, leituras usam a chave histórica `medper:v2:cases`. Toda mutação exige Web Locks com o mesmo nome e exclusividade para coordenar instâncias/abas atualizadas. Sem essa capacidade, a escrita é recusada; leituras e exportação continuam possíveis.
- Se IndexedDB voltar e houver registros locais, o repositório recusa operações com uma mensagem de recuperação. Não escolhe silenciosamente um dos dois conjuntos, não combina registros e não apaga nenhum original.
- JSON local malformado ou formato de mapa inválido gera erro; não é substituído por um mapa vazio.

## Inserções e confirmação

Criação/importação IndexedDB usa `add`, que rejeita IDs existentes na própria transação. Confirmação ocorre somente no evento `complete`; abortos rejeitam a promessa. Na alternativa local, verificação de ID e escrita ficam dentro do mesmo Web Lock. Importação sequencial ou simultânea de ID existente não substitui o registro.

## Limites e recuperação pendente

Esta mudança não resolve edição simultânea de um mesmo caso por revisões diferentes: `save` ainda é atualização explícita, sem controle otimista de versão. Abas executando código anterior não participam do novo lock; fechar versões antigas antes de validar múltiplas abas. Não equivale a homologação para dados reais.

O bloqueio de armazenamentos coexistentes preserva integridade, mas ainda exige fluxo dedicado de recuperação/exportação de ambos os conjuntos. Não apagar chaves nem escolher automaticamente a versão mais recente. Uma recuperação futura deve inventariar ambos, exportar cópias intactas e resolver colisões explicitamente em dados fictícios antes de qualquer migração. A interface de erro inicial e o procedimento operacional de recuperação precisam de validação no navegador.

## Evidências

`npm run audit` inclui os testes de contrato e `tests/v2-persistence-atomic.test.mjs`: importações concorrentes, recarga por nova instância, ID repetido sequencial, recusa sem locks, conteúdo malformado, retorno do IndexedDB e abortos sem fallback. O IndexedDB desses testes é um simulador; não comprova funcionamento real do navegador. Resultados efetivamente executados devem constar na PR com head e link de CI. Não há teste local executado nesta sessão.
