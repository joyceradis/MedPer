# Motor de Dano Pessoal — Design

## Objetivo
Criar um motor de domínio para avaliação médico-legal do dano pessoal que fique independente da interface e do backend, reutilizável hoje no PWA local e futuramente no Supabase/PostgreSQL.

## Fronteira do domínio
O módulo trata apenas de dano pessoal/corporal. Não é protocolo universal de perícia médica. Ele não decide culpa, responsabilidade civil, quantum indenizatório, benefício previdenciário, erro profissional ou outras consequências jurídicas.

## Fluxo canônico
1. Objeto pericial definido.
2. Dano biológico demonstrável.
3. Nexo técnico-científico para cada consequência analisada.
4. Cura ou consolidação médico-legal.
5. Danos temporários.
6. Sequelas permanentes, se consolidadas.
7. Eixos independentes: funcional, estético, cicatricial complementar, profissional, dor/sofrimento e participação/dependência.
8. Instrumentos específicos apenas quando elegíveis.
9. Integração sem soma entre constructos heterogêneos.

## Princípios
- Nexo precede valoração.
- Ausência de demonstração de nexo não equivale automaticamente a nexo negativo.
- Concausa não é convertida automaticamente em percentual.
- Balthazard combina déficits funcionais apenas quando o referencial aplicável autorizar; nunca combina AIPE, POSAS, dor ou repercussão profissional.
- AIPE é restrita ao prejuízo estético.
- POSAS descreve qualidade cicatricial e não gera pontuação de dano estético.
- Dano temporário permanece registrável mesmo quando não há sequela permanente.
- Campos quantitativos exigem referencial declarado; sem referencial, o motor aceita conclusão qualitativa.
- Toda conclusão deve carregar fonte, fundamento e limitações de forma rastreável.

## Contrato do motor
Criar `js/methodology/personal-damage.js` com funções puras, sem DOM e sem armazenamento:

- `evaluatePersonalDamageGate(input)` retorna estágio, permissões de avanço, bloqueios e próximo passo.
- `normalizeAxisStatus(value)` normaliza os estados `not_applicable`, `not_demonstrated`, `indeterminate`, `demonstrated`.
- `validateAxisValuation(axis)` impede número/graduação sem método ou referencial declarado.
- `composePersonalDamageSummary(input)` agrega resultados por eixo preservando independência sem produzir escore global.

## Gate causal
Estados canônicos:
- `supported`: nexo tecnicamente sustentado.
- `indeterminate`: plausibilidade existe, mas os elementos não permitem conclusão defensável.
- `excluded`: hipótese causal suficientemente contraditada/afastada.
- `not_assessed`: ainda não avaliado.

O motor não converte automaticamente `indeterminate` em `excluded`.

## Gate de consolidação
- Sem dano demonstrável: interromper valoração.
- Dano demonstrável + nexo não avaliado/indeterminado: permitir registro de fatos, mas bloquear valoração atribuível ao evento.
- Nexo sustentado + não consolidado: abrir somente danos temporários e evolução; bloquear permanentes definitivos.
- Nexo sustentado + consolidado: permitir temporários e eixos permanentes aplicáveis.
- Nexo afastado: não valorar como consequência atribuível ao evento, preservando registro clínico do achado.

## Modelo de saída
O resumo deve manter uma lista de eixos independentes. Não existe campo `totalDamage`, `globalPercentage` ou equivalente.

## Integração futura
A UI deve consumir o motor e revelar apenas os campos pertinentes ao estágio atual. O store persiste IDs estáveis e justificativas; o backend futuro apenas sincroniza e audita esse estado, sem reimplementar regra médico-pericial.