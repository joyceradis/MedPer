# Matriz de migração — fluxo atual para Método MedPer

Esta matriz orienta a conversão gradual da interface sem renomear ou descartar dados existentes.

| Nova etapa cognitiva | Campo atual / coleção | Destino canônico | Regra de compatibilidade |
|---|---|---|---|
| 1. Delimitação | `context.*`, `scope`, `methodology.general.object`, `controversies`, `scopeLimits` | `context.*` e `methodology.general.*` | `scope` permanece alias de `methodology.general.object` durante a fase 2. |
| 2. Autos e evidências | `evidence[]`, `facts[]`, `availableMaterial`, `missingMaterial`, `sourceQuality`, `contradictions` | mesmas estruturas | Não alterar IDs nem formato das coleções. |
| 3. Cronologia | `events[]` | `events[]` | Preservar `id`, `date`, `kind`, `title` e `description`. |
| 4. Hipóteses e diligências | `methodology.decision.claim`, `alternatives`, `documentGaps`, `missingMaterial` | mesmos campos, agrupados em nova tela | Mudança apenas de apresentação nesta fase. |
| 5. Exame e método | `directedHistory`, `priorState`, `objectiveExam`, `complementaryData`, `consistency`, `methodChoice` e protocolo específico | `methodology.general` e `methodology.specific/guided` | AIPE continua disponível apenas para `Dano estético`. |
| 6. Fundamentação | `favorable`, `contrary`, `alternatives`, `limits`, campos narrativos específicos | `methodology.decision` e `methodology.specific` | Não mover conteúdo automaticamente sem cópia explícita. |
| 7. Conclusão | `certainty`, `admissibleConclusion`, `conclusions[]` | `methodology.decision` e `conclusions[]` | Conclusão admissível continua bloqueada pela auditoria metodológica. |
| 8. Quesitos | `questions[]` | `questions[]` | Preservar IDs, texto e resposta. |
| 9. Documento | campos derivados do caso | renderer do documento | Documento continua derivado; não vira fonte primária de dados. |

## Regras de implementação

1. A primeira versão do novo fluxo deve reorganizar telas sem alterar o JSON exportado.
2. Campos novos devem ser opcionais e receber valores-padrão na normalização.
3. Campos antigos só podem ser removidos depois de uma versão de migração e teste de reimportação.
4. Valores estruturados dos protocolos serão migrados em etapa própria para IDs estáveis.
5. A aplicação deve continuar abrindo casos `v4`, `v3`, `v2` e `mlks.prototype.v1`.
