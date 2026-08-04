window.MLKSAIPE = (() => {
  const q1 = [
    {key:'visual',label:'Nível de comprovação visual',options:['Não se vê ou praticamente não se vê','Vê-se','Vê-se claramente']},
    {key:'gaze',label:'Tendência do olhar',options:['Não tende a fixar','Tende a se fixar ou fixa','Tende a evitar olhar']},
    {key:'memory',label:'Lembrança da imagem',options:['Não se lembra','Lembra','Protagoniza a lembrança e identifica']},
    {key:'emotion',label:'Emoção provocada',options:['Não provoca resposta emocional','Provoca ligeira resposta emocional','Provoca resposta emocional intensa']},
    {key:'relation',label:'Possível alteração relacional',options:['Não altera','Pode alterar superficialmente','Pode alterar profundamente']}
  ];
  const categories = [
    {id:'none',label:'Não relevante',range:[0,0],profile:{visual:0}},
    {id:'light',label:'Leve',range:[1,6],profile:{visual:1,gaze:0}},
    {id:'moderate',label:'Moderado',range:[7,12],profile:{visual:2,gaze:1,memory:0}},
    {id:'medium',label:'Médio',range:[13,18],profile:{visual:2,gaze:2,memory:1,emotion:0}},
    {id:'important',label:'Importante',range:[19,24],profile:{visual:2,gaze:2,memory:2,emotion:1,relation:0}},
    {id:'veryImportant',label:'Bastante importante',range:[25,30],profile:{visual:2,gaze:2,memory:2,emotion:2,relation:1}},
    {id:'extreme',label:'Importantíssimo',range:[31,50],profile:{visual:2,gaze:2,memory:2,emotion:2,relation:2}}
  ];
  const impact = {
    light:[['Muito pouco','1'],['Um pouco','2'],['Moderado','3–4'],['Severo','5'],['Muito intenso','6']],
    moderate:[['Muito pouco','7'],['Um pouco','8'],['Moderado','9–10'],['Severo','11'],['Muito intenso','12']],
    medium:[['Muito pouco','13'],['Um pouco','14'],['Moderado','15–16'],['Severo','17'],['Muito intenso','18']],
    important:[['Muito pouco','19'],['Um pouco','20'],['Moderado','21–22'],['Severo','23'],['Muito intenso','24']],
    veryImportant:[['Muito pouco','25'],['Um pouco','26'],['Moderado','27–28'],['Severo','29'],['Muito intenso','30']],
    extreme:[['Muito pouco','31–32'],['Um pouco','33–35'],['Moderado','36–40'],['Severo','41–48'],['Muito intenso','49–50']]
  };
  const contexts = [
    ['communication','Comunicação direta'],['sexual','Relação sexual'],['transient','Exposição transitória especial'],['work','Atividade profissional específica'],['other','Outro foco especial']
  ];
  function compatibility(aipe,cat){const keys=Object.keys(cat.profile);const m=keys.filter(k=>Number(aipe.q1[k])===cat.profile[k]).length;return {matches:m,total:keys.length,ratio:m/keys.length}}
  return {q1,categories,impact,contexts,compatibility};
})();
