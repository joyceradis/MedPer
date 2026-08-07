# Método MedPer — versão 0.1

## Finalidade

O MedPer não é um gerador automático de laudos. É um sistema de apoio ao raciocínio médico-pericial que organiza o caminho entre a missão recebida e a conclusão tecnicamente admissível.

A interface deve seguir a sequência cognitiva da perícia, e não uma coleção de páginas independentes.

## Princípios

1. **Primeiro o contexto.** Esfera, papel profissional, matéria e modalidade condicionam o método aplicável.
2. **Primeiro o objeto.** Nenhuma análise começa sem delimitar a pergunta técnico-pericial.
3. **Nenhuma afirmação sem fonte.** Fato, achado e inferência devem permanecer distinguíveis.
4. **Método proporcional ao objeto.** O protocolo muda conforme dano estético, incapacidade, nexo causal, responsabilidade profissional ou outra matéria.
5. **Conclusão proporcional à prova.** Limitações, hipóteses alternativas e grau de sustentação integram a conclusão.
6. **O sistema conduz; a médica decide.** O MedPer não substitui exame, julgamento clínico ou responsabilidade profissional.
7. **Documento é resultado.** O laudo ou parecer deriva do estado estruturado do caso; não é o ponto de partida.

## Fluxo cognitivo principal

### 1. Delimitação

Pergunta central: **qual é a missão técnico-pericial?**

Registrar:

- esfera de atuação;
- ramo ou contexto;
- papel da médica;
- matéria pericial;
- modalidade;
- objeto da nomeação, contratação ou consulta;
- limites explícitos e implícitos do trabalho.

Saída mínima: objeto pericial formulado em linguagem técnica, verificável e não jurídica-decisória.

### 2. Autos e evidências

Pergunta central: **com quais elementos posso trabalhar?**

Registrar:

- documentos examinados;
- identificação e localização da fonte;
- fatos extraídos;
- natureza do dado: documentado, referido, observado ou inferido;
- autenticidade, legibilidade, completude e limitações da fonte.

Saída mínima: inventário de fontes e fatos rastreáveis.

### 3. Cronologia

Pergunta central: **em que sequência os eventos ocorreram?**

Organizar:

- eventos clínicos;
- eventos documentais;
- eventos ocupacionais;
- eventos processuais relevantes;
- lacunas e inconsistências temporais.

Saída mínima: linha temporal capaz de sustentar ou enfraquecer hipóteses.

### 4. Hipóteses e necessidades de diligência

Pergunta central: **o que precisa ser testado e o que ainda falta?**

Registrar:

- proposição técnico-pericial;
- hipóteses concorrentes;
- dados favoráveis e contrários;
- necessidade de exame presencial;
- necessidade de documentos adicionais, imagens, avaliações especializadas ou esclarecimentos.

Saída mínima: plano de investigação proporcional ao objeto.

### 5. Exame e protocolo específico

Pergunta central: **qual método responde adequadamente ao objeto?**

Aplicar:

- método geral obrigatório;
- protocolo específico da matéria;
- exame objetivo quando indicado;
- descrição técnica dos achados;
- registros fotográficos e métricos quando pertinentes;
- critérios reconhecidos e limitações do método.

Saída mínima: conjunto de achados organizado por protocolo.

### 6. Fundamentação

Pergunta central: **o que os dados permitem sustentar?**

Confrontar:

- proposição principal;
- elementos favoráveis;
- elementos contrários;
- hipóteses alternativas;
- estado anterior e concausas, quando aplicáveis;
- coerência temporal, anatômica, fisiopatológica e funcional;
- limitações relevantes.

Saída mínima: cadeia argumentativa explícita e auditável.

### 7. Conclusão admissível

Pergunta central: **até onde é possível concluir sem extrapolar?**

Classificar o grau de sustentação como, por exemplo:

- suficiente;
- limitado;
- inconclusivo;
- incompatível.

A conclusão deve:

- responder ao objeto;
- indicar ressalvas;
- respeitar limites técnicos;
- evitar substituir a decisão jurídica;
- manter coerência com os dados registrados.

### 8. Quesitos

Pergunta central: **cada pergunta foi respondida direta e fundamentadamente?**

Cada resposta deve conter:

- resposta objetiva inicial;
- fundamento técnico;
- referência aos dados pertinentes;
- ressalva ou impossibilidade, quando aplicável.

### 9. Documento

Pergunta central: **o documento representa fielmente o raciocínio estruturado?**

O sistema deve gerar uma prévia derivada de:

- objeto;
- metodologia;
- material analisado;
- exame;
- fundamentação;
- limitações;
- conclusão;
- respostas aos quesitos.

A edição final permanece sob responsabilidade da médica.

## Regras de experiência do produto

- A usuária deve sempre saber em qual etapa do raciocínio está.
- O próximo passo deve ser explícito.
- Nenhuma tela deve existir apenas porque um dado precisa ser armazenado.
- Campos devem ser apresentados como perguntas periciais compreensíveis.
- Bloqueios metodológicos devem impedir conclusão definitiva, não impedir o trabalho preparatório.
- Ressalvas devem limitar o alcance da conclusão e permanecer visíveis no documento.
- AIPE deve aparecer apenas quando a matéria e o contexto justificarem sua aplicação.

## Arquitetura de navegação proposta

1. Delimitação
2. Autos e evidências
3. Cronologia
4. Hipóteses e diligências
5. Exame e método
6. Fundamentação
7. Conclusão
8. Quesitos
9. Documento

## Critério para aceitar uma funcionalidade

Uma funcionalidade só entra no produto quando responder claramente:

1. Qual etapa do raciocínio pericial ela apoia?
2. Qual erro, perda de informação ou risco metodológico ela reduz?
3. Qual dado estruturado produz?
4. Como esse dado participa da fundamentação ou do documento final?
5. Qual profissional pode acessar ou alterar esse dado?
