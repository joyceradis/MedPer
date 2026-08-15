// Modelos e checklists — camada declarativa de conferência.
//
// Instrumento procedimental interno, distinto de `js/knowledge/library.js`: ali
// vivem fontes bibliográficas com localizador; aqui vive checklist de conferência
// de forma, método, rastreabilidade e proporcionalidade.
//
// Fronteira, deliberada e verificada por teste: nada deste módulo entra no motor.
// Não importa `store.js`, não altera protocolo, não produz pontuação e não gera
// conclusão. Confere como a conclusão está sustentada e comunicada — nunca se a
// conclusão clínica está correta. Esse juízo permanece exclusivamente da perita.

export const CONFERENCE_SEVERITY = Object.freeze({
  block: Object.freeze({
    id: 'block',
    label: 'Bloqueio',
    meaning: 'Impede conclusão definitiva como está. Exige correção ou nova diligência antes de protocolar.'
  }),
  warning: Object.freeze({
    id: 'warning',
    label: 'Ressalva',
    meaning: 'Não invalida o laudo, mas limita seu alcance ou é o primeiro ponto que um contrário vai atacar.'
  }),
  note: Object.freeze({
    id: 'note',
    label: 'Nota',
    meaning: 'Observação de forma ou redação — melhora o documento, não compromete a conclusão.'
  })
});

export const CONFERENCE_PROTOCOL = Object.freeze({
  id: 'conference-v1',
  title: 'Protocolo de Conferência Pericial',
  version: '1.0',
  updatedAt: '2026-08-15',
  purpose:
    'Conferência de forma, método, rastreabilidade e proporcionalidade de um laudo antes do protocolo. Percorra as oito dimensões na ordem; cada uma tem um porquê e itens verificáveis.',
  basis: Object.freeze([
    'CPC, art. 473 — objeto (I), método com aceitação demonstrada (III), resposta aos quesitos (IV) e limite técnico (§2º).',
    'Invariantes do próprio MedPer, já documentados em docs/ARCHITECTURE.md e docs/MEDPER_METHOD.md: contexto antes do protocolo, sugestão nunca convertida em decisão, conclusão sempre humana.'
  ]),
  scopeLimit:
    'Este protocolo confere forma, método, rastreabilidade e proporcionalidade. Não avalia — e não tem como avaliar — a correção clínica do diagnóstico, do exame físico ou do juízo médico. Um bloqueio ou ressalva aqui é sobre como a conclusão está sustentada e comunicada, nunca sobre o mérito clínico.',
  dimensions: Object.freeze([
    Object.freeze({
      code: 'D1',
      title: 'Delimitação e requisitos formais',
      why: 'Sem isso, o laudo é vulnerável antes mesmo de chegar ao mérito.',
      items: Object.freeze([
        'Objeto pericial transcrito da decisão de nomeação — não apenas resumido (art. 473, I)',
        'Data, horário, local e duração do exame registrados',
        'Ciência prévia das partes e assistentes técnicos documentada (arts. 466, §2º, e 474)',
        'Impedimento e suspeição declarados (arts. 144, 145 e 467)',
        'Matérias fora do objeto listadas explicitamente como excluídas'
      ]),
      redFlag:
        'O objeto aparece só como rótulo no cabeçalho ("ASSUNTO: …"), sem transcrição da missão fixada pelo juízo.'
    }),
    Object.freeze({
      code: 'D2',
      title: 'Método e sua aceitação',
      why: 'Nomear o instrumento não é o mesmo que demonstrar que ele é aceito.',
      items: Object.freeze([
        'Cada instrumento citado (escala, tabela, protocolo) tem natureza, finalidade e limite declarados',
        'Sistemas de referência concorrentes — duas escalas para o mesmo fenômeno — não são apresentados como um só',
        'Nenhum instrumento aparece sem uma linha explicando por que se aplica a este caso específico'
      ]),
      redFlag:
        'Instrumento citado em uma frase, sem nenhuma palavra sobre aceitação predominante (art. 473, III).'
    }),
    Object.freeze({
      code: 'D3',
      title: 'Rastreabilidade',
      why: 'Uma conclusão sem localizador não é conferível — nem por você, nem por quem revisar depois.',
      items: Object.freeze([
        'Toda asserção de fato remete a um localizador (folhas, documento, página)',
        'Toda conclusão remete à seção do próprio laudo que a fundamenta',
        'Fontes documentais e bibliográficas completas, reunidas ao final'
      ]),
      redFlag:
        'Um percentual ou pontuação aparece pronto no texto, sem derivação visível em nenhum lugar do documento.'
    }),
    Object.freeze({
      code: 'D4',
      title: 'Fato, hipótese e conclusão',
      why: 'É o invariante central do método — e o que mais se perde sob prazo apertado.',
      items: Object.freeze([
        'Relato do periciando marcado como relato — nunca reescrito como fato estabelecido',
        'Hipóteses alternativas efetivamente confrontadas, não apenas mencionadas de passagem',
        'Achados negativos, o que não se sustenta, recebem o mesmo rigor que os positivos'
      ]),
      redFlag: ''
    }),
    Object.freeze({
      code: 'D5',
      title: 'Fronteira jurídica',
      why: 'Art. 473, §2º. É o defeito mais citável por um assistente técnico contrário.',
      items: Object.freeze([
        'Nenhum termo de qualificação jurídica infiltrado na linguagem médica — nexo causal não é responsabilidade civil; resultado adverso não é erro',
        'Fatos com consequência jurídica ficam registrados como fato, sem qualificá-la',
        'Conclusão limitada ao objeto delimitado e aos quesitos apresentados'
      ]),
      redFlag:
        'Expressões como "configura", "rompe o nexo" ou "isenta de responsabilidade" na voz do laudo, não do relato citado.'
    }),
    Object.freeze({
      code: 'D6',
      title: 'Coerência metodológica interna',
      why: 'Contradição entre o método declarado e o método executado é o tipo de falha que uma leitura atenta sempre encontra.',
      items: Object.freeze([
        'O cálculo ou critério descrito em prosa é exatamente o que foi aplicado — sem atalho silencioso',
        'Instrumentos aplicados conectam-se explicitamente à conclusão — nenhum é apurado e depois abandonado',
        'Grandezas parecidas não são confundidas entre si — por exemplo, extensão aguda de uma lesão e área sequelar remanescente anos depois',
        'Nenhuma sequela é valorada duas vezes sob rubricas diferentes'
      ]),
      redFlag: ''
    }),
    Object.freeze({
      code: 'D7',
      title: 'Proporcionalidade epistêmica',
      why: 'A linguagem da conclusão deve refletir a suficiência real da prova — nem mais, nem menos.',
      items: Object.freeze([
        'Toda conclusão relevante declara seu grau de sustentação: suficiente, limitado ou inconclusivo',
        'Ausência de absolutos que a prova não sustenta — "inquestionável", "resta cientificamente excluído"',
        'Bloqueios e ressalvas explícitos sempre que a base for insuficiente para conclusão definitiva'
      ]),
      redFlag: ''
    }),
    Object.freeze({
      code: 'D8',
      title: 'Estado anterior, concausa e lacunas',
      why: 'É onde a imparcialidade do laudo mais se prova — inclusive quando a conclusão desfavorece quem o contratou.',
      items: Object.freeze([
        'Comorbidades e estado anterior isolados explicitamente do dano imputável ao evento',
        'Concausa fundamentada com dado objetivo — ou declarada como hipótese não quantificável, nunca incorporada em silêncio ao cálculo',
        'Elementos documentais ausentes registrados com sua consequência sobre a conclusão e a diligência que a resolveria'
      ]),
      redFlag: ''
    })
  ])
});
