# MedPer · critérios de aceite por jornadas profissionais sintéticas

**Data de referência:** 20/10/2026. **Coordenação existente:** #43 e #95. **Natureza:** QA funcional e de experiência, não validação médico-pericial automática.

## Objetivo

Nenhuma pessoa deve precisar fazer testes repetitivos para descobrir se um botão funciona, se a navegação piorou ou se seus dados sumiram. Robôs de navegador devem testar o fluxo **real em app.html (V2)**, não apenas grep de código nem apenas a versão antiga.

Não simular identidade, assinatura, prontuários reais ou decisões clínicas em nome de uma profissional. As personas a seguir são **modelos de tarefa**, construídos a partir de necessidades funcionais, com dados 100% fictícios.

## Persona A — perita judicial, caso cível de dano estético

**Intenção:** iniciar uma perícia e responder ao objeto definido pelo processo, não preencher uma escala solta.

1. Abrir V2, identificar visualmente acesso à área de casos e iniciar um caso.
2. Selecionar papel profissional e esfera cível, escrever objeto e questão técnico-pericial.
3. Registrar fontes e datas com origem verificável; cronologia separada de hipóteses.
4. Registrar história, exame positivo/negativo e limites dos achados.
5. Na escolha de instrumentos, manter POSAS (qualidade cicatricial) separado de AIPE/Brasil (dano estético); não inferir causalidade da escala.
6. Fundamentar conclusão baseada em fontes, limitações e quesitos específicos, sem gerar juízo médico por automação.
7. Voltar ao painel, fechar e reabrir a página, recuperar precisamente campos e referências anteriores.
8. Exportação somente após aviso sobre dados; uso apenas com dados fictícios no protótipo.

**Critério mínimo automatizável:** os passos 1–3, 6 (ausência de conclusão automática), 7, navegação íntegra e screenshots desktop/mobile. A equivalência entre escala e literatura requer revisão profissional independente; não transformar simulação em aprovação metodológica.

## Persona B — avaliação funcional com estado anterior

**Intenção:** documentar cada sequela, fonte e referencial jurídico antes do cálculo.

- Trajeto civil não escolhe DPVAT automaticamente pela etiologia do evento.
- Balthazard combina *apenas* percentuais funcionais que a perita forneceu sob referencial aplicável; não produz percentuais clínicos.
- Se há estado anterior, a inversa é identificada como análise distinta e não substitui o exame.
- Não somar automaticamente déficit funcional, dano estético, quantum doloris e repercussão profissional.
- Se faltam fonte, justificativa ou confirmação de consolidação, o sistema exibe **lacuna**, não resultado ficticiamente aprovado.

**Responsabilidade:** cálculo e UX podem ser automatizados. Elegibilidade de barema, nexos, danos e conclusões ficam com médica/perito responsável.

## Persona C — profissional retomando trabalho (prioridade crítica de engenharia)

- Reabrir caso e encontrar conteúdo realmente salvo, nunca um card vazio por mudança de storage.
- Acesso claro e coerente: diferenciar demonstração sem login de ambiente autenticado/seguro ainda indisponível.
- Erro de IndexedDB, conflito, falha de gravação, quota e versões legadas não podem ser mascarados como "Salvo".
- Exportação/importação não pode apagar registros antigos nem duplicar silenciosamente IDs.
- Nenhum caso sensível real em CI, prints, logs ou demonstração.

**Bloqueios relacionados:** #69, #71, #95; não reabrir implementações paralelas.

## Persona D — usuária em iPhone, tempo limitado

- Acesso e CTA "Novo caso" encontram-se imediatamente no tamanho 390x844.
- Menu lateral abre e permite navegar, sem barras horizontais inesperadas.
- A hierarquia de títulos, seções e ações continua visível, sem overlays ocultando os campos.
- Foco e teclado permitem avançar; texto não é truncado; botões respondem ao primeiro toque.
- Coerência visual com design institucional canônico (não redesenhar arbitrariamente cores, logomark ou fluxo).

## Papéis de agentes e gates

- **Agente Executor:** implementar mudanças mínimas com testes; não assumir aprovação metodológica; não alterar dados reais.
- **Agente Perita Sintética:** executar todas as jornadas em Chromium com fixtures fictícias; capturar print desktop/iPhone, console e falhas.
- **Agente Auditor Independente:** revisar o diff, conferir se o teste cobre comportamento verificável e se regressões continuam cobertas.
- **Responsável médica real:** chamada **somente** para decisão substantiva de método/perícia, escolha clínica ou revisão final de utilidade, jamais para descobrir botões quebrados.

### Condição de aceite automática

Não dizer "pronto para a usuária testar" ou "aplicativo pronto" se teste E2E de caso novo, navegação, persistência, recarregamento ou mobile estiver vermelho. Exibir evidências e corrigir antes. CI verde não confirma que layout é bonito: screenshots + teste de geometria detectam regressões óbvias, e comparação visual com baseline aprovado permanece uma etapa adicional. Não criar um segundo frontend de testes.

### Fronteiras

Esta suíte não licencia MedPer para casos reais, não testa segurança multiusuário de um backend desconectado da V2, não homologa o uso médico e não altera visibilidade, permissões, acesso, deployment ou dados existentes.
