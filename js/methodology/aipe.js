export const AIPE_CRITERIA = [
  { id:'visual', label:'Nível de comprovação visual', options:['Não se vê ou praticamente não se vê','Vê-se','Vê-se claramente'] },
  { id:'gaze', label:'Tendência do olhar', options:['Não tende a fixar','Tende a se fixar ou fixa','Tende a evitar olhar'] },
  { id:'memory', label:'Lembrança da imagem', options:['Não se lembra','Lembra','Protagoniza a lembrança e identifica'] },
  { id:'emotion', label:'Emoção provocada', options:['Não provoca resposta emocional','Provoca ligeira resposta emocional','Provoca resposta emocional intensa'] },
  { id:'relation', label:'Possível alteração relacional', options:['Não altera','Pode alterar superficialmente','Pode alterar profundamente'] }
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

export const AIPE_CONTEXTS = [
  { id:'communication', label:'Comunicação direta' },
  { id:'sexual', label:'Relação sexual' },
  { id:'transient', label:'Exposição transitória especial' },
  { id:'work', label:'Atividade profissional específica' },
  { id:'other', label:'Outro foco especial' }
];
