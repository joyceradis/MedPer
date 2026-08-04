(() => {
  'use strict';

  const general = {
    id: 'general',
    title: 'Método médico-pericial geral',
    phases: [
      { id:'delimitation', title:'Delimitação', fields:[
        ['object','Objeto pericial','O que deve ser esclarecido tecnicamente, nos limites da nomeação ou contratação.'],
        ['controversies','Pontos controvertidos','Questões médicas efetivamente disputadas.'],
        ['methodChoice','Escolha metodológica','Avaliação pessoal, documental, indireta, ambiental ou combinação, com justificativa.'],
        ['scopeLimits','Limites da atuação','Matérias fora do objeto ou que dependem de outro especialista.']
      ]},
      { id:'material', title:'Material analisado', fields:[
        ['availableMaterial','Elementos disponíveis','Autos, prontuários, imagens, exames, relatórios, literatura e outros elementos.'],
        ['missingMaterial','Elementos ausentes','Documentos ou dados necessários que não foram disponibilizados.'],
        ['sourceQuality','Qualidade das fontes','Contemporaneidade, autoria, integridade, consistência e valor probatório médico.'],
        ['contradictions','Divergências documentais','Incompatibilidades entre registros, relatos, imagens e exames.']
      ]},
      { id:'examination', title:'Execução técnica', fields:[
        ['directedHistory','Anamnese pericial dirigida','História orientada ao objeto, sem finalidade terapêutica.'],
        ['priorState','Estado anterior','Condições preexistentes, vulnerabilidades e funcionalidade prévia.'],
        ['objectiveExam','Exame objetivo','Técnicas semiológicas direcionadas e achados positivos e negativos relevantes.'],
        ['complementaryData','Exames complementares','Resultados relevantes e sua interpretação no contexto pericial.'],
        ['consistency','Consistência interna','Compatibilidade entre relato, documentação, exame e evolução esperada.']
      ]},
      { id:'reasoning', title:'Análise técnico-científica', fields:[
        ['demonstratedCondition','Condição ou dano demonstrado','O que está objetivamente caracterizado.'],
        ['temporality','Temporalidade','Sequência entre evento, sintomas, diagnóstico, tratamento, consolidação e estado atual.'],
        ['plausibility','Plausibilidade médico-científica','Compatibilidade fisiopatológica, anatômica e biomecânica.'],
        ['alternatives','Hipóteses alternativas','Outras explicações razoáveis e elementos favoráveis ou contrários.'],
        ['concurrentFactors','Fatores concorrentes','Estado anterior, concausas, intercorrências e fatores externos.'],
        ['literature','Referencial científico','Literatura ou diretriz pertinente e contemporânea.']
      ]},
      { id:'limits', title:'Limitações e grau de sustentação', fields:[
        ['methodLimits','Limitações metodológicas','Restrições documentais, temporais, técnicas ou de examinabilidade.'],
        ['impactOfLimits','Impacto das limitações','Como cada limitação afeta o alcance da conclusão.'],
        ['certainty','Grau de sustentação','Suficiente, limitado, inconclusivo ou incompatível, sempre fundamentado.'],
        ['beyondScope','Questões não respondíveis','Pontos que extrapolam o objeto ou não admitem conclusão segura.']
      ]}
    ]
  };

  const protocols = {
    'Dano estético': {
      id:'aesthetic_damage', title:'Avaliação do dano estético',
      fields:[
        ['consolidation','Consolidação médico-legal','Data e fundamento para considerar estabilizada a alteração.'],
        ['priorAppearance','Estado estético anterior','Documentação e descrição da aparência prévia relevante.'],
        ['topography','Topografia e lateralidade','Região anatômica, lado e relação com áreas expostas.'],
        ['dimensions','Dimensões e forma','Mensurações, contornos e distribuição.'],
        ['color','Coloração','Hipo/hipercromia, eritema ou heterogeneidade.'],
        ['textureRelief','Textura, relevo e aderência','Depressão, hipertrofia, queloide, retração, aderência ou irregularidade.'],
        ['visibility','Visibilidade','Percepção em distância íntima, social e pública, em repouso e movimento.'],
        ['dynamicBehavior','Comportamento dinâmico','Alteração com mímica, fala, marcha, postura ou movimento.'],
        ['usualExposure','Exposição habitual','Roupas usuais, ambiente profissional e interação social.'],
        ['photoProtocol','Protocolo fotográfico','Iluminação, escala, enquadramento, vistas e identificação técnica.'],
        ['aipeImpression','AIPE — impressão','Visibilidade, fixação do olhar, memória, emoção e relação interpessoal.'],
        ['aipeCategory','AIPE — categoria e nível','Categoria, nível e pontuação registrados sem automatismo decisório.'],
        ['aipeComplementary','AIPE — critérios complementares','Comunicação, relação sexual, exposição especial, atividade profissional e outros focos.'],
        ['aipeRationale','AIPE — fundamentação','Justificativa descritiva da valoração e de suas limitações.']
      ],
      rules:[
        {id:'aesthetic_consolidation', severity:'block', when:c=>!v(c,'methodology.specific.consolidation'), text:'Sem consolidação fundamentada, não é admissível concluir definitivamente por sequela estética permanente.'},
        {id:'aesthetic_morphology', severity:'block', when:c=>!all(c,['methodology.specific.topography','methodology.specific.dimensions','methodology.specific.textureRelief']), text:'A valoração exige descrição morfológica objetiva, incluindo topografia, dimensões e textura/relevo.'},
        {id:'aesthetic_prior', severity:'warning', when:c=>!v(c,'methodology.specific.priorAppearance'), text:'A ausência de estado estético anterior deve constar expressamente como limitação comparativa.'},
        {id:'aesthetic_photo', severity:'warning', when:c=>!v(c,'methodology.specific.photoProtocol'), text:'A documentação fotográfica não está tecnicamente descrita.'},
        {id:'aesthetic_aipe', severity:'warning', when:c=>v(c,'methodology.specific.aipeCategory')&&!v(c,'methodology.specific.aipeRationale'), text:'Categoria ou pontuação AIPE sem fundamentação descritiva não deve ser tratada como conclusão.'}
      ]
    },
    'Incapacidade': {
      id:'capacity', title:'Avaliação de capacidade e incapacidade',
      fields:[
        ['nosology','Diagnóstico nosológico','Diagnóstico demonstrado e elementos que o sustentam.'],
        ['usualActivity','Atividade habitual real','Descrição concreta das tarefas, jornada, ritmo e responsabilidades.'],
        ['jobDemands','Exigências da atividade','Demandas físicas, cognitivas, sensoriais, emocionais e ambientais.'],
        ['functionalDeficits','Déficits funcionais objetivos','Limitações demonstradas no exame e nos documentos.'],
        ['residualCapacity','Capacidade residual','Atividades ainda possíveis com segurança e regularidade.'],
        ['onset','Data provável de início','Fundamento clínico-documental da data de início.'],
        ['duration','Temporalidade e duração','Temporária ou permanente; total ou parcial; períodos delimitados.'],
        ['rehabilitation','Reabilitação','Possibilidades, requisitos e barreiras para reabilitação.'],
        ['prognosis','Prognóstico','Evolução esperada, tratamento pendente e fatores modificadores.']
      ],
      rules:[
        {id:'capacity_job', severity:'block', when:c=>!all(c,['methodology.specific.usualActivity','methodology.specific.jobDemands']), text:'Não se conclui incapacidade laboral sem caracterizar a atividade habitual e suas exigências.'},
        {id:'capacity_function', severity:'block', when:c=>!v(c,'methodology.specific.functionalDeficits'), text:'Diagnóstico isolado não demonstra incapacidade; é necessária repercussão funcional objetiva.'},
        {id:'capacity_residual', severity:'warning', when:c=>!v(c,'methodology.specific.residualCapacity'), text:'A capacidade residual não foi analisada.'},
        {id:'capacity_time', severity:'warning', when:c=>!all(c,['methodology.specific.onset','methodology.specific.duration']), text:'A temporalidade da incapacidade está incompleta.'}
      ]
    },
    'Nexo causal e concausa': {
      id:'causation', title:'Análise de nexo causal e concausal',
      fields:[
        ['event','Evento ou exposição demonstrado','Caracterização objetiva do evento, intensidade, duração e circunstâncias.'],
        ['temporalCompatibility','Compatibilidade temporal','Latência, início e evolução em relação ao evento.'],
        ['anatomicCompatibility','Compatibilidade anatômica','Correspondência entre mecanismo, topografia e lesão.'],
        ['physiopathology','Plausibilidade fisiopatológica','Mecanismo médico-científico reconhecido e aplicável.'],
        ['doseIntensity','Intensidade suficiente','Magnitude ou dose capaz de produzir o resultado alegado.'],
        ['priorFactors','Estado anterior','Condições preexistentes e vulnerabilidades relevantes.'],
        ['alternativeCauses','Causas alternativas','Hipóteses concorrentes avaliadas e comparadas.'],
        ['concauses','Concausas','Fatores que contribuíram materialmente para o resultado.'],
        ['expectedCourse','Evolução esperada','Compatibilidade da evolução real com o mecanismo proposto.'],
        ['causalDegree','Conclusão causal e grau de sustentação','Positivo, negativo, concausal ou inconclusivo, com fundamento.']
      ],
      rules:[
        {id:'causal_event', severity:'block', when:c=>!v(c,'methodology.specific.event'), text:'Não há análise causal sem caracterização do evento ou exposição.'},
        {id:'causal_core', severity:'block', when:c=>!all(c,['methodology.specific.temporalCompatibility','methodology.specific.anatomicCompatibility','methodology.specific.physiopathology']), text:'A conclusão causal exige compatibilidade temporal, anatômica e fisiopatológica.'},
        {id:'causal_alternatives', severity:'warning', when:c=>!v(c,'methodology.specific.alternativeCauses'), text:'Causas alternativas não foram analisadas.'},
        {id:'causal_prior', severity:'warning', when:c=>!v(c,'methodology.specific.priorFactors'), text:'O estado anterior não foi incorporado à análise causal.'}
      ]
    },
    'Responsabilidade profissional': {
      id:'professional_liability', title:'Análise de responsabilidade profissional',
      fields:[
        ['initialCondition','Condição inicial','Gravidade, urgência, prognóstico e riscos próprios do quadro de entrada.'],
        ['informationAtTime','Informações disponíveis à época','Dados conhecidos ou razoavelmente acessíveis no momento da decisão.'],
        ['indication','Indicação e alternativas','Justificativa da conduta e alternativas tecnicamente razoáveis.'],
        ['consent','Informação e consentimento','Conteúdo informado, compreensão possível e registro documental.'],
        ['technicalExecution','Execução técnica','Descrição dos atos realizados e aderência à prática aceita.'],
        ['followUp','Acompanhamento','Monitoramento, resposta a intercorrências e continuidade assistencial.'],
        ['adverseOutcome','Resultado adverso ou complicação','Caracterização do evento e distinção entre risco inerente e desvio técnico.'],
        ['currentDamage','Dano atual','Dano objetivamente demonstrado e suas repercussões.'],
        ['foreseeability','Previsibilidade e evitabilidade','Possibilidade de antecipação e prevenção nas circunstâncias reais.'],
        ['standardOfCare','Conformidade técnico-profissional','Análise contextualizada da prática aceita à época.'],
        ['deviationDamageNexus','Nexo entre eventual desvio e dano','Demonstração de que o resultado decorreu do desvio, e não apenas da doença ou risco inerente.']
      ],
      rules:[
        {id:'liability_context', severity:'block', when:c=>!all(c,['methodology.specific.initialCondition','methodology.specific.informationAtTime','methodology.specific.indication']), text:'A conduta deve ser julgada a partir da condição inicial e das informações disponíveis à época.'},
        {id:'liability_damage', severity:'block', when:c=>!v(c,'methodology.specific.currentDamage'), text:'Responsabilidade não pode ser analisada sem caracterização objetiva do dano atual.'},
        {id:'liability_nexus', severity:'block', when:c=>!v(c,'methodology.specific.deviationDamageNexus'), text:'Resultado adverso não equivale a erro; é necessário analisar nexo entre eventual desvio e o dano.'},
        {id:'liability_alternatives', severity:'warning', when:c=>!all(c,['methodology.specific.adverseOutcome','methodology.specific.foreseeability','methodology.specific.standardOfCare']), text:'Complicação, previsibilidade, evitabilidade e padrão técnico precisam ser distinguidos.'}
      ]
    }
  };

  const fallback = {
    id:'generic', title:'Protocolo específico complementar',
    fields:[
      ['specificQuestion','Pergunta técnica específica','Qual questão médica particular precisa ser resolvida.'],
      ['eligibility','Critérios de elegibilidade','Condições necessárias para aplicar o método escolhido.'],
      ['technicalProcedure','Procedimento técnico','Como a avaliação foi executada e registrada.'],
      ['specificCriteria','Critérios específicos','Parâmetros científicos ou normativos empregados.'],
      ['resultInterpretation','Interpretação','Como os resultados respondem ao objeto.']
    ],
    rules:[]
  };

  function path(obj, key) { return key.split('.').reduce((node, part)=>node && node[part], obj); }
  function v(obj, key) { const x=path(obj,key); return typeof x==='string' ? x.trim() : Boolean(x); }
  function all(obj, keys) { return keys.every(key=>v(obj,key)); }
  function getProtocol(matter) { return protocols[matter] || fallback; }
  function ensure(c) {
    c.methodology ||= {};
    c.methodology.general ||= {};
    c.methodology.specific ||= {};
    c.methodology.decision ||= { claim:'', favorable:'', contrary:'', alternatives:'', limits:'', certainty:'', admissibleConclusion:'' };
    c.methodology.references ||= [];
    c.methodology.audit ||= {};
    return c;
  }
  function audit(c) {
    ensure(c);
    const p=getProtocol(c.context?.matter);
    const issues=[];
    const requiredGeneral=[
      ['methodology.general.object','Objeto pericial não delimitado.','block'],
      ['methodology.general.methodChoice','Escolha metodológica não justificada.','block'],
      ['methodology.general.availableMaterial','Material analisado não descrito.','warning'],
      ['methodology.general.directedHistory','Anamnese pericial dirigida não registrada.','warning'],
      ['methodology.general.objectiveExam','Exame objetivo não registrado.','warning'],
      ['methodology.general.alternatives','Hipóteses alternativas não analisadas.','warning'],
      ['methodology.general.methodLimits','Limitações metodológicas não examinadas.','warning'],
      ['methodology.general.certainty','Grau de sustentação não explicitado.','block']
    ];
    requiredGeneral.forEach(([key,text,severity])=>{if(!v(c,key))issues.push({id:key,severity,text})});
    p.rules.forEach(rule=>{if(rule.when(c))issues.push({id:rule.id,severity:rule.severity,text:rule.text})});
    const d=c.methodology.decision;
    if(!String(d.claim||'').trim()) issues.push({id:'decision_claim',severity:'block',text:'A proposição técnico-pericial a ser testada não foi formulada.'});
    if(!String(d.favorable||'').trim()) issues.push({id:'decision_favorable',severity:'warning',text:'Elementos favoráveis à hipótese não foram explicitados.'});
    if(!String(d.contrary||'').trim()) issues.push({id:'decision_contrary',severity:'warning',text:'Elementos contrários à hipótese não foram explicitados.'});
    if(!String(d.admissibleConclusion||'').trim()) issues.push({id:'decision_conclusion',severity:'block',text:'Não há conclusão metodologicamente formulada.'});
    const blocks=issues.filter(i=>i.severity==='block').length;
    return { protocol:p, issues, blocks, warnings:issues.length-blocks, status:blocks?'incomplete':issues.length?'limited':'ready' };
  }

  window.MedPerMethodology={ general, protocols, fallback, getProtocol, ensure, audit, path };
})();
