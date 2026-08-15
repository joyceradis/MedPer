// Estrutura de laudo pericial — camada declarativa de composição.
//
// Companheiro do Protocolo de Conferência (`checklists.js`): ali se confere um
// laudo pronto; aqui se descreve a ordem em que ele se compõe e o que cada seção
// precisa conter para ser conferível.
//
// Fronteira, deliberada e verificada por teste: este módulo descreve **forma**.
// Não prescreve instrumento, escala, faixa, critério diagnóstico ou conclusão, e
// não contém caso. Onde a composição depende de escolha técnica — qual escala
// aplicar, qual achado é relevante — a estrutura declara a exigência
// («declare natureza, aceitação, finalidade e limite») e não a resposta. A
// resposta é sempre da médica perita.

export const REPORT_SECTION_KIND = Object.freeze({
  formal: 'Requisito formal',
  method: 'Método',
  evidence: 'Prova',
  reasoning: 'Raciocínio',
  closure: 'Fecho'
});

export const REPORT_STRUCTURE = Object.freeze({
  id: 'judicial-report-v1',
  title: 'Estrutura de Laudo Pericial Judicial',
  version: '1.0',
  updatedAt: '2026-08-15',
  purpose:
    'Ordem de composição de um laudo conferível. Cada seção declara para que existe e o que precisa conter. A estrutura não decide conteúdo técnico: onde há escolha médica, ela registra a exigência de fundamentar, nunca a resposta.',
  basis: Object.freeze([
    'CPC, art. 473 — o laudo indica o objeto (I), a análise técnica (II), o método com aceitação demonstrada (III) e responde aos quesitos (IV); o §2º veda parecer sobre a qualificação jurídica dos fatos.',
    'CPC, arts. 466, §2º, e 474 — ciência prévia das partes e assistentes técnicos sobre data, local e horário do exame.',
    'Sequência do método MedPer já documentada em docs/MEDPER_METHOD.md: contexto, objeto, material, execução, consistência, hipóteses alternativas, limitações, grau de sustentação e conclusão.'
  ]),
  scopeLimit:
    'Modelo de forma e ordem. Não substitui juízo médico, não sugere achado, não indica instrumento e não produz conclusão. Uma seção preenchida conforme esta estrutura pode, ainda assim, estar tecnicamente errada — a correção do conteúdo é da perita, e o Protocolo de Conferência confere apenas se ele está sustentado e comunicado de forma auditável.',
  sections: Object.freeze([
    Object.freeze({
      code: 'I',
      title: 'Objeto da perícia e delimitação',
      kind: 'formal',
      purpose: 'Fixa o encargo. Sem isso, qualquer conclusão fica sem moldura e o laudo é atacável antes do mérito.',
      requires: Object.freeze([
        'Missão pericial transcrita da decisão de nomeação, não resumida',
        'Pontos controvertidos de natureza médica, enumerados',
        'Matérias excluídas do objeto, declaradas explicitamente'
      ])
    }),
    Object.freeze({
      code: 'II',
      title: 'Condições de realização',
      kind: 'formal',
      purpose: 'Torna o ato pericial verificável: quando, onde, por quanto tempo e com ciência de quem.',
      requires: Object.freeze([
        'Data, horário, local e duração do exame',
        'Ciência prévia das partes e assistentes técnicos, com o documento que a comprova',
        'Presenças efetivas no ato',
        'Declaração de ausência de impedimento e suspeição'
      ])
    }),
    Object.freeze({
      code: 'III',
      title: 'Identificação e dados gerais',
      kind: 'formal',
      purpose: 'Identifica o periciado e o processo sem expor mais do que o necessário ao encargo.',
      requires: Object.freeze([
        'Identificação do periciado e do processo',
        'Documento de identificação conferido no ato',
        'Dados pessoais limitados ao que o objeto exige'
      ])
    }),
    Object.freeze({
      code: 'IV',
      title: 'Método aplicado e sua aceitação',
      kind: 'method',
      purpose: 'Art. 473, III. Nomear o instrumento não basta: é preciso demonstrar aceitação e declarar limite.',
      requires: Object.freeze([
        'Para cada instrumento: natureza, aceitação predominante na área, finalidade neste laudo e limite declarado',
        'Justificativa de por que cada instrumento se aplica a este caso, e não em abstrato',
        'Sistemas de referência concorrentes mantidos distintos, nunca fundidos em um só'
      ])
    }),
    Object.freeze({
      code: 'V',
      title: 'Histórico referido pelo periciado',
      kind: 'evidence',
      purpose: 'Registra o relato como relato. É a seção onde o laudo mais facilmente converte narrativa em fato sem perceber.',
      requires: Object.freeze([
        'Relato atribuído à sua fonte, em discurso indireto ou citação',
        'Nenhum elemento do relato reescrito como fato estabelecido',
        'Divergências entre relato e documentação registradas, não harmonizadas'
      ])
    }),
    Object.freeze({
      code: 'VI',
      title: 'Análise cronológico-documental',
      kind: 'evidence',
      purpose: 'Constrói a linha do tempo a partir dos autos, com localizador para cada asserção.',
      requires: Object.freeze([
        'Cada elemento com seu localizador — folhas, documento, página',
        'Elementos ausentes registrados, com a diligência que os obteria',
        'Qualidade das fontes avaliada: autoria, contemporaneidade, integridade, consistência'
      ])
    }),
    Object.freeze({
      code: 'VII',
      title: 'Estado anterior e concausalidade',
      kind: 'reasoning',
      purpose: 'Separa o que é imputável ao evento do que preexistia. É onde a imparcialidade mais se prova.',
      requires: Object.freeze([
        'O que está documentado sobre o estado anterior, com localizador',
        'O que não está documentado, declarado como lacuna',
        'Concausa fundamentada em dado objetivo — ou declarada como hipótese não quantificável, nunca incorporada em silêncio ao cálculo'
      ])
    }),
    Object.freeze({
      code: 'VIII',
      title: 'Exame físico pericial',
      kind: 'evidence',
      purpose: 'Achado direto da perita, distinto do documental e do relatado.',
      requires: Object.freeze([
        'Achados positivos e negativos relevantes',
        'Aferições instrumentais com o método de medida declarado',
        'Documentação fotográfica com escala, iluminação e enquadramento descritos',
        'Grandezas medidas distinguidas de grandezas estimadas, cada uma com sua origem'
      ])
    }),
    Object.freeze({
      code: 'IX',
      title: 'Discussão médico-legal',
      kind: 'reasoning',
      purpose: 'Onde o raciocínio aparece. Uma conclusão sem esta seção é asserção, não perícia.',
      requires: Object.freeze([
        'Nexo analisado elemento a elemento, não em bloco',
        'Hipóteses alternativas efetivamente confrontadas, com a razão de afastá-las ou mantê-las',
        'Nenhuma qualificação jurídica na voz da perita (art. 473, §2º)'
      ])
    }),
    Object.freeze({
      code: 'X',
      title: 'Valoração do dano permanente',
      kind: 'reasoning',
      purpose: 'Converte achado em medida, com a derivação visível.',
      requires: Object.freeze([
        'Cada valoração remete ao instrumento declarado na seção de método',
        'O cálculo descrito em prosa é exatamente o aplicado — sem atalho silencioso',
        'Nenhuma sequela valorada duas vezes sob rubricas diferentes',
        'Valoração pendente de dispositivo ou dado declarada como pendente, não estimada'
      ])
    }),
    Object.freeze({
      code: 'XI',
      title: 'Tratamento corretivo pendente',
      kind: 'reasoning',
      purpose: 'Distingue o quadro consolidado do que ainda admite modificação.',
      requires: Object.freeze([
        'Indicação registrada com sua fonte técnica',
        'Efeito esperado sobre o dano permanente, quando estimável',
        'Declaração explícita quando o efeito não for estimável'
      ])
    }),
    Object.freeze({
      code: 'XII',
      title: 'Resposta aos quesitos',
      kind: 'closure',
      purpose: 'Art. 473, IV. Responder é obrigação; responder fora do objeto é vício.',
      requires: Object.freeze([
        'Todos os quesitos respondidos, por parte formuladora',
        'Quesito fora do objeto ou de natureza jurídica: recusa fundamentada, não resposta evasiva',
        'Cada resposta remete à seção do laudo que a sustenta'
      ])
    }),
    Object.freeze({
      code: 'XIII',
      title: 'Limitações da perícia',
      kind: 'closure',
      purpose: 'O que o laudo não pôde estabelecer, e por quê.',
      requires: Object.freeze([
        'Limitação material, temporal ou documental declarada com sua consequência',
        'Diligência que resolveria cada limitação'
      ])
    }),
    Object.freeze({
      code: 'XIV',
      title: 'Grau de sustentação de cada conclusão',
      kind: 'closure',
      purpose: 'Proporcionalidade epistêmica: a linguagem da conclusão espelha a prova disponível.',
      requires: Object.freeze([
        'Cada conclusão relevante classificada quanto à suficiência da base',
        'Ausência de absolutos que a prova não sustenta',
        'Conclusão inconclusiva declarada como tal, não omitida'
      ])
    }),
    Object.freeze({
      code: 'XV',
      title: 'Conclusão pericial',
      kind: 'closure',
      purpose: 'Síntese limitada ao objeto delimitado na seção I.',
      requires: Object.freeze([
        'Nenhum elemento novo que não apareça fundamentado antes',
        'Conclusão contida nos limites do objeto e dos quesitos',
        'Linguagem médica, sem qualificação jurídica'
      ])
    }),
    Object.freeze({
      code: 'XVI',
      title: 'Rastreabilidade das conclusões',
      kind: 'closure',
      purpose: 'Fecha o circuito: cada conclusão aponta para onde foi construída.',
      requires: Object.freeze([
        'Mapa conclusão → seção que a fundamenta',
        'Fontes documentais completas',
        'Fontes bibliográficas com localizador de página ou quadro',
        'Anexos identificados'
      ])
    })
  ])
});
