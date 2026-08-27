// Quadro 1 do AIPE/Brasil — cinco eixos, TRÊS opções cada.
//
// A redação e a `question` reproduzem a matriz interna de avaliação do dano
// pessoal (versão 1.5), que por sua vez cita Fernandes et al. 2016. `field` é a
// chave gravada no caso, e existe aqui para que o formulário guiado DERIVE
// destas opções em vez de redigitá-las — havia duas transcrições divergentes do
// mesmo quadro no repositório, e a tela mostrava uma ao lado da outra.
//
// A opção mais grave do eixo do olhar é EVITAR, não fixar: o instrumento trata a
// esquiva como resposta mais intensa que a fixação. Uma escala de intensidade
// crescente de fixação não é o mesmo instrumento.
export const AIPE_CRITERIA = [
  { id:'visual', field:'aipeVisibility', label:'Comprovação e percepção',
    question:'Até que ponto se vê ou se percebe a alteração da imagem da pessoa?',
    options:['Não se vê ou praticamente não se vê','Se vê','Se vê claramente'] },
  { id:'gaze', field:'aipeGaze', label:'Tendência do olhar',
    question:'Nosso olhar ou outros sentidos tendem a se fixar especificamente nessa alteração?',
    options:['Não tende a fixar','Tende a se fixar / fixa','Tende a evitar o olhar'] },
  { id:'memory', field:'aipeMemory', label:'Lembrança',
    question:'Ao recordar a pessoa examinada, a alteração de sua imagem participa de sua descrição?',
    options:['Não se lembra','Se lembra','Protagoniza a lembrança e serve para identificar'] },
  { id:'emotion', field:'aipeEmotion', label:'Emoção',
    question:'A alteração provoca resposta emocional?',
    options:['Não provoca','Provoca resposta ligeira','Provoca resposta intensa'] },
  { id:'relation', field:'aipeRelations', label:'Relação interpessoal',
    question:'Se fôssemos familiares ou pessoas próximas, a imagem poderia afetar nossa relação com ela?',
    options:['Não','Sim, mas não muito','Sim, muito'] }
];

export const AIPE_CATEGORIES = [
  { id:'none', label:'Não relevante', range:[0,0] },
  { id:'light', label:'Leve', range:[1,6] },
  { id:'moderate', label:'Moderado', range:[7,12] },
  { id:'medium', label:'Médio', range:[13,18] },
  { id:'important', label:'Importante', range:[19,24] },
  { id:'veryImportant', label:'Bastante importante', range:[25,30] },
  { id:'extreme', label:'Importantíssimo', range:[31,50] }
];

export const AIPE_IMPACT_BANDS = {
  light:[['Muito pouco','1'],['Um pouco','2'],['Moderado','3–4'],['Severo','5'],['Muito intenso','6']],
  moderate:[['Muito pouco','7'],['Um pouco','8'],['Moderado','9–10'],['Severo','11'],['Muito intenso','12']],
  medium:[['Muito pouco','13'],['Um pouco','14'],['Moderado','15–16'],['Severo','17'],['Muito intenso','18']],
  important:[['Muito pouco','19'],['Um pouco','20'],['Moderado','21–22'],['Severo','23'],['Muito intenso','24']],
  veryImportant:[['Muito pouco','25'],['Um pouco','26'],['Moderado','27–28'],['Severo','29'],['Muito intenso','30']],
  extreme:[['Muito pouco','31–32'],['Um pouco','33–35'],['Moderado','36–40'],['Severo','41–48'],['Muito intenso','49–50']]
};

// Quadro 4 — critérios complementares. `field` serve ao mesmo propósito de
// derivação do Quadro 1; `other` existia na tabela de referência e não tinha
// campo correspondente no formulário.
export const AIPE_CONTEXTS = [
  { id:'communication', field:'communication', label:'Comunicação direta' },
  { id:'sexual', field:'sexualRelation', label:'Relação sexual' },
  { id:'transient', field:'specialExposure', label:'Exposição transitória especial' },
  { id:'work', field:'professionalExposure', label:'Atividade profissional específica' },
  { id:'other', field:'otherSpecialFocus', label:'Outros focos especiais' }
];

// Escala do Quadro 4. "Não aplicável" é o equivalente, num grupo de opções, à
// célula deixada em branco na matriz: distingue "não se percebe" de "não foi
// avaliado". Não é um degrau de intensidade e não altera a escala de três.
export const AIPE_CONTEXT_OPTIONS = ['Não / praticamente não','Percebe-se','Percebe-se claramente','Não aplicável'];

// O Quadro 4 pode justificar revisão da intensidade, mas não a automatiza: quem
// revisa é a perita, e o registro do efeito é dela.
export const AIPE_PRIOR_EFFECT = {
  field:'aipePriorAssessmentEffect',
  label:'Efeito sobre a avaliação anterior',
  options:['Mantém','Justifica revisão para maior intensidade','Justifica revisão para menor intensidade']
};
