(() => {
  'use strict';
  const M=window.MedPerMethodology;
  if(!M)return;
  const app=document.querySelector('#app');
  const STATE_KEYS=['medper.state.v3','medper.state.v2'];
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read=()=>{for(const key of STATE_KEYS){try{const state=JSON.parse(localStorage.getItem(key)||'{}');if(Array.isArray(state.cases))return{key,state}}catch{}}return null};
  const current=()=>{const b=read();if(!b)return null;const id=location.hash.match(/^#\/case\/([^/]+)/)?.[1]||b.state.currentCaseId;const c=b.state.cases.find(x=>x.id===id);if(!c)return null;M.ensure(c);c.methodology.guided||={};return{...b,case:c}};
  const save=b=>{b.state.updatedAt=new Date().toISOString();localStorage.setItem(b.key,JSON.stringify(b.state));};

  const guided={
    'Dano estético':[
      {id:'eligibility',title:'1. Elegibilidade e consolidação',questions:[
        ['consolidation','A alteração está consolidada?',['Sim, com fundamento registrado','Não','Não foi possível determinar']],
        ['objectiveChange','Existe alteração morfológica objetivamente examinável?',['Sim','Não','Avaliação exclusivamente documental','Elementos insuficientes']],
        ['priorAppearanceStatus','Como foi conhecido o estado estético anterior?',['Documentação objetiva','Apenas relato','Não há informação','Não se aplica']]
      ]},
      {id:'description',title:'2. Descrição objetiva',questions:[
        ['lesionType','Tipo principal de alteração',['Cicatriz','Discromia','Assimetria','Deformidade','Perda de segmento','Alteração de contorno','Outra']],
        ['topographyChoice','Região anatômica',['Face','Pescoço','Membro superior','Membro inferior','Tronco','Outra']],
        ['laterality','Lateralidade',['Direita','Esquerda','Mediana','Bilateral','Não aplicável']],
        ['morphology','Morfologia predominante',['Plana','Elevada','Deprimida','Retrátil','Aderida','Hipertrófica','Queloidiana','Irregular']],
        ['colorChoice','Coloração predominante',['Normocrômica','Hipocrômica','Hipercrômica','Eritematosa','Heterogênea','Outra']]
      ],measurements:true},
      {id:'perception',title:'3. Percepção estática e dinâmica',questions:[
        ['distance','Em que distância a alteração se torna perceptível?',['Apenas em exame aproximado','Distância íntima','Distância social','Distância pública','Não perceptível nas condições examinadas']],
        ['gaze','O olhar é atraído para a alteração?',['Não','Discretamente','Claramente','De forma predominante']],
        ['movement','A mímica ou o movimento modificam a percepção?',['Não','Tornam mais evidente','Tornam menos evidente','Produzem deformação dinâmica','Não foi possível avaliar']],
        ['exposure','A região permanece habitualmente exposta?',['Sim','Parcialmente','Apenas em situações específicas','Não']]
      ]},
      {id:'photos',title:'4. Protocolo fotográfico',questions:[
        ['photos','A documentação fotográfica está tecnicamente adequada?',['Sim','Parcialmente','Não realizada','Não aplicável']],
        ['scale','Foi utilizada escala métrica?',['Sim','Não','Não aplicável']],
        ['lighting','A iluminação e o enquadramento foram padronizados?',['Sim','Parcialmente','Não']]
      ]},
      {id:'aipe1',title:'5. AIPE — impressão do impacto',questions:[
        ['aipeVisibility','Visibilidade',['Não se vê ou praticamente não se vê','Vê-se','Vê-se claramente','É predominante']],
        ['aipeGaze','Fixação do olhar',['Não atrai','Atrai brevemente','O olhar se fixa','Domina a interação visual']],
        ['aipeMemory','Memória',['Não permanece','Pode ser lembrada','Permanece claramente','Protagoniza a lembrança']],
        ['aipeEmotion','Resposta emocional',['Não identificada','Ligeira','Moderada','Intensa']],
        ['aipeRelations','Relação interpessoal',['Sem alteração perceptível','Alteração discreta','Alteração relevante','Alteração profunda']]
      ]},
      {id:'aipe2',title:'6. AIPE — categoria e nível',questions:[
        ['aipeCategoryChoice','Categoria selecionada',['Não valorável','Ligeiro','Moderado','Importante','Muito importante','Importantíssimo']],
        ['aipeLevel','Nível dentro da categoria',['Baixo','Médio','Alto','Não definido']]
      ],score:true},
      {id:'aipe4',title:'7. AIPE — critérios complementares',questions:[
        ['communication','Comunicação',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável']],
        ['sexualRelation','Relação sexual',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável']],
        ['specialExposure','Exposição transitória especial',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável']],
        ['professionalExposure','Atividade profissional específica',['Não se percebe ou praticamente não','Percebe-se','Percebe-se claramente','Não aplicável']]
      ]},
      {id:'synthesis',title:'8. Fundamentação e síntese',narrative:[
        ['aipeRationale','Fundamentação da valoração','Explique por que os achados justificam a categoria e o nível escolhidos.'],
        ['specificLimits','Limitações específicas','Registre ausência de estado anterior, limitações fotográficas ou de examinabilidade.']
      ]}
    ],
    'Incapacidade':[
      {id:'condition',title:'1. Condição e função',questions:[
        ['diagnosisStatus','O diagnóstico está demonstrado?',['Sim','Parcialmente','Não','Inconclusivo']],
        ['functionalDeficitStatus','Há déficit funcional objetivo?',['Sim','Não','Parcialmente demonstrado','Não foi possível examinar']]
      ],narrative:[['nosology','Diagnóstico e elementos de sustentação','Registre diagnóstico, exames e achados pertinentes.']]},
      {id:'activity',title:'2. Atividade habitual',questions:[
        ['activityKnown','A atividade habitual foi caracterizada?',['Sim, detalhadamente','Parcialmente','Não']],
        ['demandType','Exigência predominante',['Física','Cognitiva','Sensorial','Emocional','Mista']]
      ],narrative:[['usualActivity','Tarefas reais','Descreva jornada, tarefas, ritmo e responsabilidades.'],['jobDemands','Exigências da atividade','Registre as demandas relevantes.']]},
      {id:'capacity',title:'3. Capacidade residual e temporalidade',questions:[
        ['capacityDegree','Grau de incapacidade',['Ausente','Parcial','Total','Inconclusivo']],
        ['durationChoice','Duração provável',['Temporária','Permanente','Indeterminada']],
        ['rehabChoice','Reabilitação',['Possível','Possível com restrições','Improvável','Não analisada']]
      ],narrative:[['functionalDeficits','Limitações objetivas','Relacione achados às tarefas comprometidas.'],['residualCapacity','Capacidade residual','Registre o que permanece possível com segurança.'],['onset','Data provável de início','Fundamente clinicamente e documentalmente.'],['prognosis','Prognóstico','Registre evolução e tratamento pendente.']]}
    ],
    'Nexo causal e concausa':[
      {id:'event',title:'1. Evento ou exposição',questions:[
        ['eventProof','O evento ou exposição está demonstrado?',['Sim','Parcialmente','Apenas referido','Não']],
        ['intensity','A intensidade/dose é suficiente?',['Sim','Possivelmente','Não','Indeterminada']]
      ],narrative:[['event','Caracterização do evento','Descreva intensidade, duração, circunstâncias e fonte.']]},
      {id:'compatibility',title:'2. Compatibilidades',questions:[
        ['temporalResult','Compatibilidade temporal',['Compatível','Parcialmente compatível','Incompatível','Indeterminada']],
        ['anatomicResult','Compatibilidade anatômica',['Compatível','Parcialmente compatível','Incompatível','Não aplicável']],
        ['mechanismResult','Plausibilidade fisiopatológica',['Plausível','Possível, mas fraca','Improvável','Indeterminada']]
      ],narrative:[['temporalCompatibility','Fundamentação temporal','Registre latência, início e evolução.'],['anatomicCompatibility','Fundamentação anatômica','Relacione mecanismo, topografia e lesão.'],['physiopathology','Fundamentação fisiopatológica','Registre o mecanismo médico-científico aplicável.']]},
      {id:'alternatives',title:'3. Estado anterior e alternativas',questions:[
        ['priorContribution','O estado anterior contribuiu?',['Não identificado','Possivelmente','Sim, como concausa','Sim, como causa principal']],
        ['alternativesStatus','Causas alternativas foram avaliadas?',['Sim','Parcialmente','Não']]
      ],narrative:[['priorFactors','Estado anterior','Registre condições preexistentes relevantes.'],['alternativeCauses','Causas alternativas','Compare hipóteses concorrentes.'],['concauses','Concausas','Registre fatores com contribuição material.']]},
      {id:'causalConclusion',title:'4. Síntese causal',questions:[
        ['causalChoice','Conclusão causal',['Nexo positivo','Nexo negativo','Concausalidade','Inconclusivo']]
      ],narrative:[['causalDegree','Fundamentação e grau de sustentação','Explique por que a conclusão é proporcional aos dados disponíveis.']]}
    ],
    'Responsabilidade profissional':[
      {id:'context',title:'1. Contexto assistencial',questions:[
        ['initialSeverity','Gravidade inicial',['Leve','Moderada','Grave','Crítica','Indeterminada']],
        ['urgency','Contexto',['Eletivo','Urgente','Emergencial','Indeterminado']]
      ],narrative:[['initialCondition','Condição inicial','Registre gravidade, riscos e prognóstico de entrada.'],['informationAtTime','Informações disponíveis à época','Considere apenas os dados conhecidos ou razoavelmente acessíveis naquele momento.']]},
      {id:'decision',title:'2. Indicação, alternativas e consentimento',questions:[
        ['indicationStatus','A indicação estava tecnicamente sustentada?',['Sim','Parcialmente','Não','Inconclusivo']],
        ['alternativesDiscussed','Alternativas foram consideradas?',['Sim','Parcialmente','Não','Não aplicável']],
        ['consentStatus','Informação e consentimento',['Adequados','Parciais','Insuficientes','Não documentados','Não aplicável']]
      ],narrative:[['indication','Indicação e alternativas','Descreva a justificativa contextualizada.'],['consent','Informação e consentimento','Registre conteúdo e documentação disponíveis.']]},
      {id:'execution',title:'3. Execução e acompanhamento',questions:[
        ['executionStatus','Execução técnica',['Compatível com a prática aceita','Há desvio possível','Há desvio demonstrado','Inconclusiva']],
        ['followStatus','Acompanhamento',['Adequado','Parcial','Inadequado','Não avaliável']]
      ],narrative:[['technicalExecution','Execução técnica','Descreva atos realizados e comparação com a prática aceita.'],['followUp','Acompanhamento','Registre monitoramento e resposta às intercorrências.']]},
      {id:'outcome',title:'4. Resultado, dano e nexo',questions:[
        ['outcomeType','Natureza do resultado',['Evolução esperada','Risco inerente','Complicação','Possível desvio técnico','Indeterminada']],
        ['damageStatus','Há dano atual objetivamente demonstrado?',['Sim','Não','Parcialmente','Inconclusivo']],
        ['nexusStatus','Nexo entre eventual desvio e dano',['Demonstrado','Possível','Não demonstrado','Inconclusivo']]
      ],narrative:[['adverseOutcome','Resultado adverso ou complicação','Diferencie risco inerente, complicação e desvio.'],['currentDamage','Dano atual','Descreva o dano e as repercussões.'],['deviationDamageNexus','Nexo entre desvio e dano','Fundamente sem confundir resultado adverso com erro.']]}
    ]
  };

  const choice=(path,value,options)=>`<div class="guided-choices">${options.map(o=>`<label class="guided-choice"><input type="radio" name="${esc(path)}" value="${esc(o)}" ${value===o?'checked':''}><span>${esc(o)}</span></label>`).join('')}</div>`;
  const narrative=(path,label,value,help)=>`<label class="field guided-narrative"><span>${esc(label)}</span><textarea data-guided-path="${esc(path)}" placeholder="${esc(help)}">${esc(value||'')}</textarea><small class="field-help">${esc(help)}</small></label>`;
  function render(){const b=current();if(!b)return;const c=b.case;if(!guided[c.context?.matter])return;const content=app.querySelector('.case-content');if(!content||content.querySelector('[data-guided-methodology]'))return;const title=content.querySelector('.case-title')?.textContent?.trim();if(title!=='Método e técnica'&&title!=='Avaliação')return;content.querySelector('[data-methodology-assessment]')?.remove();const host=content.querySelector('.content-grid')||content;const root=document.createElement('section');root.dataset.guidedMethodology='';root.className='guided-methodology';const steps=guided[c.context.matter];root.innerHTML=`<header class="guided-header"><div><span class="eyebrow">Protocolo guiado</span><h2>${esc(M.getProtocol(c.context.matter).title)}</h2><p>Responda em sequência. O texto livre fica restrito à descrição e à fundamentação.</p></div><div class="guided-progress"><strong>${completed(c,steps)}/${steps.length}</strong><span>etapas preenchidas</span></div></header>${steps.map((s,i)=>stepHtml(c,s,i)).join('')}`;host.prepend(root);bind(root,b);}
  function completed(c,steps){return steps.filter(s=>{const q=(s.questions||[]).every(([k])=>c.methodology.guided[k]);const n=(s.narrative||[]).every(([k])=>c.methodology.specific[k]);return q&&n}).length}
  function stepHtml(c,s,i){return`<details class="guided-step" ${i===0?'open':''}><summary><span>${esc(s.title)}</span><small>${stepStatus(c,s)}</small></summary><div class="guided-step-body">${(s.questions||[]).map(([k,label,opts])=>`<fieldset class="guided-question"><legend>${esc(label)}</legend>${choice(`methodology.guided.${k}`,c.methodology.guided[k],opts)}</fieldset>`).join('')}${s.measurements?`<div class="guided-measures">${narrative('methodology.specific.dimensions','Dimensões',c.methodology.specific.dimensions,'Comprimento, largura, área aproximada e método de mensuração.')}${narrative('methodology.specific.topography','Descrição topográfica',c.methodology.specific.topography,'Região, sub-região e referências anatômicas.')}${narrative('methodology.specific.textureRelief','Descrição morfológica',c.methodology.specific.textureRelief,'Textura, relevo, aderência, retração e irregularidade.')}</div>`:''}${s.score?`<label class="field guided-score"><span>Pontuação registrada</span><input type="number" min="0" max="50" data-guided-path="methodology.specific.aipeCategory" value="${esc(c.methodology.specific.aipeCategory||'')}" placeholder="Sem automatismo decisório"></label>`:''}${(s.narrative||[]).map(([k,label,help])=>narrative(`methodology.specific.${k}`,label,c.methodology.specific[k],help)).join('')}</div></details>`}
  function stepStatus(c,s){const q=(s.questions||[]).every(([k])=>c.methodology.guided[k]);const n=(s.narrative||[]).every(([k])=>c.methodology.specific[k]);return q&&n?'Concluído':q||n?'Em andamento':'Não iniciado'}
  function setPath(obj,path,value){const parts=path.split('.');let node=obj;for(let i=0;i<parts.length-1;i++){node[parts[i]]||={};node=node[parts[i]]}node[parts.at(-1)]=value}
  function bind(root,b){root.addEventListener('change',e=>{const input=e.target;if(input.matches('input[type=radio]')){setPath(b.case,input.name,input.value);syncCanonical(b.case,input.name,input.value);save(b);rerender(root)}});root.addEventListener('input',e=>{const input=e.target;if(input.dataset.guidedPath){setPath(b.case,input.dataset.guidedPath,input.value);save(b)}})}
  function syncCanonical(c,path,value){const k=path.split('.').at(-1);const s=c.methodology.specific;if(k==='consolidation')s.consolidation=value;if(k==='priorAppearanceStatus')s.priorAppearance=value;if(k==='photos')s.photoProtocol=value;if(k==='aipeCategoryChoice')s.aipeCategory=`${value}${s.aipeCategory?` — ${s.aipeCategory}`:''}`;if(k==='causalChoice')s.causalDegree=value;if(k==='capacityDegree')s.duration=`${value}${s.duration?` — ${s.duration}`:''}`;if(k==='damageStatus')s.currentDamage=value;if(k==='nexusStatus')s.deviationDamageNexus=value}
  function rerender(root){const parent=root.parentNode;root.remove();render();parent?.querySelector('[data-guided-methodology]')?.scrollIntoView({block:'nearest'})}
  let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})});observer.observe(app,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(render,0));render();
})();