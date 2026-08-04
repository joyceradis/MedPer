(() => {
  'use strict';

  const STORAGE_KEY = 'mlks.prototype.v1';
  const app = document.querySelector('#app');
  const toast = document.querySelector('#toast');
  const wizard = document.querySelector('#caseWizard');
  const wizardBody = document.querySelector('#wizardBody');
  const wizardTitle = document.querySelector('#wizardTitle');
  const wizardHelp = document.querySelector('#wizardHelp');
  const wizardBack = document.querySelector('#wizardBack');
  const wizardNext = document.querySelector('#wizardNext');
  const wizardDots = document.querySelector('#wizardDots');
  const accountDialog = document.querySelector('#accountDialog');

  const steps = [
    { key:'sphere', title:'Em qual esfera ocorre este trabalho?', help:'A esfera define o enquadramento e o fluxo principal.', options:['Judicial','Administrativa','Previdenciária','Trabalhista e ocupacional','Securitária','Ético-profissional','Extrajudicial / particular'] },
    { key:'branch', title:'Qual é o ramo ou contexto específico?', help:'Escolha a opção que melhor situa a demanda.', dynamic:true },
    { key:'role', title:'Qual é o seu papel neste caso?', help:'O MedPer adapta linguagem, tarefas e documento final.', options:['Perita do juízo','Assistente técnica da parte autora','Assistente técnica da parte ré','Parecerista independente','Perita administrativa','Médica revisora'] },
    { key:'matter', title:'Qual é a matéria médico-pericial principal?', help:'Isso seleciona o protocolo de análise aplicável.', options:['Dano estético','Dano corporal','Incapacidade','Nexo causal e concausa','Responsabilidade profissional','Acidente de trabalho','Doença ocupacional','Invalidez securitária','Benefício previdenciário','Capacidade civil ou funcional','Outro'] },
    { key:'mode', title:'Como a perícia será realizada?', help:'A modalidade define quais etapas de coleta serão exibidas.', options:['Presencial e documental','Documental','Presencial','Indireta','Revisão de laudo anterior'] },
    { key:'identity', title:'Identifique o caso', help:'Use apenas o necessário. Dados sensíveis continuam salvos neste dispositivo.', form:true }
  ];

  const branches = {
    'Judicial':['Cível','Trabalhista','Previdenciário','Criminal','Família','Fazenda Pública','Justiça Federal','Outro'],
    'Administrativa':['Junta médica','Servidor público','Processo disciplinar','Concurso ou ingresso','Avaliação funcional','Outro'],
    'Previdenciária':['INSS / RGPS','Regime próprio','Benefício assistencial','Revisão de benefício','Outro'],
    'Trabalhista e ocupacional':['Reclamação trabalhista','Acidente de trabalho','Doença ocupacional','Capacidade laborativa','Outro'],
    'Securitária':['Seguro de pessoas','Acidente pessoal','Invalidez','Cobertura contratual','Outro'],
    'Ético-profissional':['Processo ético-profissional','Análise de conduta','Responsabilidade médica','Outro'],
    'Extrajudicial / particular':['Parecer pré-processual','Assistência técnica','Avaliação de dano corporal','Consultoria','Outro']
  };

  const nav = [
    ['summary','Resumo'],['documents','Autos e documentos'],['assessment','Avaliação'],['analysis','Análise pericial'],['questions','Quesitos'],['report','Laudo']
  ];

  let state = loadState();
  let wizardStep = 0;
  let draft = {};
  let currentTab = 'summary';
  let toastTimer;

  function now(){ return new Date().toISOString(); }
  function id(prefix){ return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(16).slice(2)}`; }
  function esc(value=''){ return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])); }
  function loadState(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { version:2, updatedAt:parsed.updatedAt || now(), currentCaseId:parsed.currentCaseId || null, cases:Array.isArray(parsed.cases) ? parsed.cases : [] };
    } catch { return { version:2, updatedAt:now(), currentCaseId:null, cases:[] }; }
  }
  function save(message){
    state.updatedAt = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if(message) notify(message);
  }
  function notify(message){
    clearTimeout(toastTimer); toast.textContent=message; toast.classList.add('is-visible');
    toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),2600);
  }
  function getCase(){ return state.cases.find(item=>item.id===state.currentCaseId) || null; }
  function normalize(c){
    c.context ||= {};
    c.person ||= {initials:'',birthDate:'',role:'Periciando(a)'};
    c.events ||= []; c.evidence ||= []; c.observations ||= []; c.findings ||= []; c.conclusions ||= []; c.questions ||= [];
    c.reasoning ||= {nexus:'',temporality:'',consolidation:'',repercussions:'',notes:''};
    c.exam ||= {history:'',objective:'',photography:'',measurements:''};
    return c;
  }
  function completion(c){
    const checks=[c.scope,c.evidence.length,c.exam.history||c.exam.objective,c.reasoning.notes||c.findings.length,c.questions.length,c.conclusions.length];
    return Math.round(checks.filter(Boolean).length/checks.length*100);
  }
  function nextStep(c){
    if(!c.scope) return ['Delimitar o objeto da perícia','Registre exatamente o que foi determinado pela autoridade ou contratado pela parte.','summary'];
    if(!c.evidence.length) return ['Organizar os autos e documentos','Inclua as fontes disponíveis e registre as lacunas documentais relevantes.','documents'];
    if(!c.exam.history && !c.exam.objective) return ['Preparar ou registrar a avaliação','Estruture a anamnese pericial, o exame e o protocolo fotográfico aplicável.','assessment'];
    if(!c.reasoning.notes && !c.findings.length) return ['Construir a análise pericial','Relacione estado anterior, cronologia, achados, nexo, limitações e repercussões.','analysis'];
    if(!c.questions.length) return ['Inserir e responder os quesitos','Vincule cada resposta aos elementos que a sustentam.','questions'];
    if(!c.conclusions.length) return ['Consolidar as conclusões','Registre apenas conclusões tecnicamente sustentadas e suas limitações.','analysis'];
    return ['Revisar o laudo','Confira coerência, fontes, ressalvas e respostas antes de exportar.','report'];
  }

  function header(){
    return `<header class="topbar">
      <button class="brand button-quiet" data-home aria-label="Ir para casos">
        <span class="brand-mark">M</span><span><strong>MedPer</strong><span>Perícia médica estruturada</span></span>
      </button>
      <div class="top-actions">
        <span class="storage-state">Salvo neste dispositivo</span>
        <button class="button button-secondary" data-account>Entrar</button>
        <button class="button button-primary" data-new-case>Nova perícia</button>
      </div>
    </header>`;
  }

  function renderHome(){
    state.currentCaseId=null; save(); location.hash='';
    app.innerHTML=`<div class="shell">${header()}<main id="app" class="page">
      <section class="hero">
        <div><span class="eyebrow">Medicina pericial</span><h1>Do objeto da perícia ao laudo, sem perder o fundamento.</h1>
        <p>Organize o caso pela lógica real do médico perito: esfera, função, objeto, fontes, avaliação, análise, quesitos e conclusão.</p>
        <div class="button-row"><button class="button button-primary" data-new-case>Iniciar nova perícia</button><button class="button button-secondary" data-demo>Carregar caso demonstrativo</button></div></div>
        <aside class="hero-card"><strong>O sistema trabalha por trás. Você trabalha como perita.</strong><p>Fatos ligados às fontes, lacunas visíveis e conclusões sustentadas.</p>
        <ul><li>Fluxo adaptado à esfera e ao objeto</li><li>Salvamento automático local</li><li>Laudo montado a partir do caso</li></ul></aside>
      </section>
      <section><div class="section-header"><div><h2>Seus casos</h2><p>${state.cases.length ? 'Continue de onde parou.' : 'Nenhuma perícia criada neste dispositivo.'}</p></div></div>
      ${state.cases.length ? `<div class="case-grid">${state.cases.map(caseCard).join('')}</div>` : `<div class="empty"><h2>Seu primeiro caso começa pelo contexto.</h2><p>O assistente perguntará esfera, função, matéria e modalidade antes de abrir o fluxo de trabalho.</p><button class="button button-primary" data-new-case>Nova perícia</button></div>`}
      </section></main></div>`;
  }

  function caseCard(raw){
    const c=normalize(raw), next=nextStep(c);
    return `<button class="case-card" data-open-case="${c.id}">
      <div class="case-meta"><span class="pill">${esc(c.context.sphere || 'Não classificado')}</span><span class="pill pill-warn">${esc(c.status || 'Rascunho')}</span></div>
      <div><h3>${esc(c.title || 'Caso sem título')}</h3><p>${esc(c.reference || 'Sem número de processo ou referência')}</p></div>
      <p><strong>Objeto:</strong> ${esc(c.objectType || c.context.matter || 'A definir')}</p>
      <p><strong>Próxima etapa:</strong> ${esc(next[0])}</p>
    </button>`;
  }

  function renderCase(tab=currentTab){
    const c=getCase(); if(!c){renderHome();return;} normalize(c); currentTab=tab;
    const pct=completion(c), next=nextStep(c);
    app.innerHTML=`<div class="shell">${header()}<main class="page case-layout">
      <aside class="case-sidebar">
        <button class="back-link button-quiet" data-home>← Todos os casos</button>
        <div class="case-identity"><span class="eyebrow">${esc(c.context.sphere || 'Perícia')}</span><h2>${esc(c.title)}</h2><p>${esc(c.reference || 'Sem referência')}</p></div>
        <nav class="case-nav" aria-label="Etapas do caso">${nav.map((item,i)=>`<button data-tab="${item[0]}" class="${tab===item[0]?'is-active':''}"><span class="nav-number">${i+1}</span>${item[1]}</button>`).join('')}</nav>
      </aside>
      <section class="case-main">
        <header class="case-header"><div class="case-title"><span class="eyebrow">${esc(c.context.role || 'Atuação médico-pericial')}</span><h1>${esc(nav.find(x=>x[0]===tab)?.[1] || 'Caso')}</h1><p>${esc(c.context.branch || '')} · ${esc(c.context.mode || '')}</p></div>
        <button class="button button-secondary button-small" data-export>Exportar JSON</button></header>
        <div class="progress"><span style="width:${pct}%"></span></div><div class="progress-label">${pct}% do fluxo essencial preenchido</div>
        <div id="caseContent">${renderTab(c,tab,next)}</div>
      </section>
    </main></div>`;
  }

  function renderTab(c,tab,next){
    if(tab==='summary') return summary(c,next);
    if(tab==='documents') return documents(c);
    if(tab==='assessment') return assessment(c);
    if(tab==='analysis') return analysis(c);
    if(tab==='questions') return questions(c);
    return report(c);
  }

  function summary(c,next){
    return `<section class="panel next-step"><span class="eyebrow">Próxima etapa</span><h2>${esc(next[0])}</h2><p>${esc(next[1])}</p><div class="button-row" style="margin-top:14px"><button class="button button-primary" data-tab="${next[2]}">Continuar</button></div></section>
    <div class="summary-grid" style="margin-top:15px"><section class="panel"><div class="panel-header"><div><h2>Enquadramento</h2><p>Contexto que define o método e o documento final.</p></div></div>
      <div class="grid-2">${stat('Esfera',c.context.sphere)}${stat('Ramo',c.context.branch)}${stat('Papel da médica',c.context.role)}${stat('Matéria',c.context.matter)}${stat('Modalidade',c.context.mode)}${stat('Situação',c.status)}</div>
    </section><section class="panel panel-soft"><div class="panel-header"><div><h2>Material do caso</h2></div></div>
      <div class="item-list">${stat('Documentos',c.evidence.length)}${stat('Achados',c.findings.length)}${stat('Quesitos',c.questions.length)}${stat('Conclusões',c.conclusions.length)}</div>
    </section></div>
    <section class="panel"><div class="panel-header"><div><h2>Objeto pericial</h2><p>Transcreva ou delimite a pergunta que deve ser respondida.</p></div></div>
      <label class="field"><span>Objeto delimitado</span><textarea data-bind="scope" placeholder="Ex.: apurar a existência do dano estético e sua extensão.">${esc(c.scope||'')}</textarea></label>
      <div class="grid-2" style="margin-top:14px"><label class="field"><span>Iniciais do periciando</span><input data-bind="person.initials" value="${esc(c.person.initials||'')}"></label><label class="field"><span>Data de nascimento</span><input type="date" data-bind="person.birthDate" value="${esc(c.person.birthDate||'')}"></label></div>
    </section>`;
  }
  function stat(label,value){ return `<div class="stat"><span>${esc(label)}</span><strong>${esc(value || 'A definir')}</strong></div>`; }

  function documents(c){
    return `<section class="panel"><div class="panel-header"><div><h2>Autos e documentos</h2><p>Registre a fonte, o conteúdo relevante e a limitação que ela resolve ou deixa aberta.</p></div><button class="button button-primary button-small" data-add="evidence">Adicionar documento</button></div>
      ${c.evidence.length?`<div class="item-list">${c.evidence.map(e=>`<article class="item"><header><div><span class="source-tag">${esc(e.type||'Documento')}</span><h3>${esc(e.title||'Sem título')}</h3></div><button class="button button-danger button-small" data-remove="evidence" data-id="${e.id}">Excluir</button></header><p>${esc(e.description||'')}</p><p>${esc(e.date||'Data não informada')} · ${esc(e.reliability||'Confiabilidade não classificada')}</p></article>`).join('')}</div>`:`<div class="empty"><h2>Nenhuma fonte registrada</h2><p>Comece pela decisão de nomeação, documentos médicos, imagens e registros contemporâneos ao evento.</p></div>`}
    </section><section class="panel panel-soft"><div class="panel-header"><div><h2>Lacunas documentais</h2><p>Registre o que falta e qual é o impacto técnico da ausência.</p></div></div><label class="field"><span>Pendências e limitações</span><textarea data-bind="documentGaps" placeholder="Ex.: ausência de fotografias anteriores limita a comparação objetiva do estado prévio.">${esc(c.documentGaps||'')}</textarea></label></section>`;
  }

  function assessment(c){
    return `<section class="panel"><div class="panel-header"><div><h2>Avaliação médico-pericial</h2><p>O protocolo pode ser preenchido antes, durante ou depois do exame.</p></div></div>
      <label class="field"><span>Anamnese e histórico dirigido</span><textarea data-bind="exam.history" placeholder="Queixa, evolução, tratamentos, estado anterior e repercussões referidas.">${esc(c.exam.history||'')}</textarea></label>
      <label class="field"><span>Exame objetivo</span><textarea data-bind="exam.objective" placeholder="Descrição morfológica, funcional e mensurações objetivas.">${esc(c.exam.objective||'')}</textarea></label>
      <div class="grid-2"><label class="field"><span>Protocolo fotográfico</span><textarea data-bind="exam.photography" placeholder="Vistas, distância, escala, iluminação e lateralidade.">${esc(c.exam.photography||'')}</textarea></label>
      <label class="field"><span>Mensurações</span><textarea data-bind="exam.measurements" placeholder="Dimensões, goniometria, força ou outro método aplicável.">${esc(c.exam.measurements||'')}</textarea></label></div>
    </section>`;
  }

  function analysis(c){
    return `<section class="panel"><div class="panel-header"><div><h2>Análise pericial</h2><p>Separe o que é demonstrado, interpretado e limitado.</p></div></div>
      <div class="grid-2"><label class="field"><span>Nexo causal ou compatibilidade</span><textarea data-bind="reasoning.nexus">${esc(c.reasoning.nexus||'')}</textarea></label>
      <label class="field"><span>Temporalidade</span><textarea data-bind="reasoning.temporality">${esc(c.reasoning.temporality||'')}</textarea></label>
      <label class="field"><span>Consolidação e prognóstico</span><textarea data-bind="reasoning.consolidation">${esc(c.reasoning.consolidation||'')}</textarea></label>
      <label class="field"><span>Repercussões</span><textarea data-bind="reasoning.repercussions">${esc(c.reasoning.repercussions||'')}</textarea></label></div>
      <label class="field"><span>Discussão técnico-pericial</span><textarea data-bind="reasoning.notes" placeholder="Integre documentos, cronologia, exame, hipóteses alternativas e limitações.">${esc(c.reasoning.notes||'')}</textarea></label>
    </section>
    <section class="panel"><div class="panel-header"><div><h2>Conclusões sustentadas</h2><p>Cada conclusão deve indicar suas fontes e ressalvas.</p></div><button class="button button-primary button-small" data-add="conclusion">Adicionar conclusão</button></div>
    ${c.conclusions.length?`<div class="item-list">${c.conclusions.map(x=>`<article class="item"><header><h3>${esc(x.title||'Conclusão')}</h3><button class="button button-danger button-small" data-remove="conclusion" data-id="${x.id}">Excluir</button></header><p>${esc(x.text||'')}</p><p class="source-tag">${x.evidenceIds?.length||0} fonte(s) vinculada(s) · ${esc(x.status||'Preliminar')}</p></article>`).join('')}</div>`:`<p class="notice warning">Ainda não há conclusão registrada. Não conclua antes de conferir se o conjunto documental e o exame sustentam a afirmação.</p>`}</section>`;
  }

  function questions(c){
    return `<section class="panel"><div class="panel-header"><div><h2>Quesitos</h2><p>Responda de forma direta e mantenha a fundamentação rastreável.</p></div><button class="button button-primary button-small" data-add="question">Adicionar quesito</button></div>
    ${c.questions.length?`<div class="item-list">${c.questions.map((q,i)=>`<article class="item"><header><h3>${i+1}. ${esc(q.text||'Quesito')}</h3><button class="button button-danger button-small" data-remove="question" data-id="${q.id}">Excluir</button></header><label class="field"><span>Resposta</span><textarea data-question-answer="${q.id}">${esc(q.answer||'')}</textarea></label><label class="field"><span>Fundamentação e ressalvas</span><textarea data-question-basis="${q.id}">${esc(q.basis||'')}</textarea></label></article>`).join('')}</div>`:`<div class="empty"><h2>Nenhum quesito inserido</h2><p>Inclua os quesitos do juízo e das partes na ordem processual.</p></div>`}</section>`;
  }

  function report(c){
    const reportText=`<h2>LAUDO MÉDICO-PERICIAL</h2>
      <h3>1. Identificação e objeto</h3><p><strong>Referência:</strong> ${esc(c.reference||'Não informada')}</p><p>${esc(c.scope||'Objeto ainda não delimitado.')}</p>
      <h3>2. Contexto da atuação</h3><p>${esc([c.context.sphere,c.context.branch,c.context.role,c.context.mode].filter(Boolean).join(' · '))}</p>
      <h3>3. Documentos analisados</h3>${c.evidence.length?`<ul>${c.evidence.map(e=>`<li>${esc(e.title)} — ${esc(e.description||'')}</li>`).join('')}</ul>`:'<p>Nenhum documento registrado.</p>'}
      <h3>4. Avaliação</h3><p>${esc(c.exam.history||'')}</p><p>${esc(c.exam.objective||'')}</p>
      <h3>5. Discussão</h3><p>${esc(c.reasoning.notes||'Discussão ainda não preenchida.')}</p>
      <h3>6. Conclusões</h3>${c.conclusions.length?`<ol>${c.conclusions.map(x=>`<li>${esc(x.text)}</li>`).join('')}</ol>`:'<p>Nenhuma conclusão validada.</p>'}
      <h3>7. Respostas aos quesitos</h3>${c.questions.length?`<ol>${c.questions.map(q=>`<li><strong>${esc(q.text)}</strong><br>${esc(q.answer||'Sem resposta.')}</li>`).join('')}</ol>`:'<p>Nenhum quesito registrado.</p>'}`;
    return `<section class="panel"><div class="panel-header"><div><h2>Revisão do laudo</h2><p>O texto abaixo é montado a partir dos campos do caso e exige revisão médica final.</p></div><div class="button-row"><button class="button button-secondary button-small" data-print>Imprimir</button><button class="button button-primary button-small" data-export>Exportar JSON</button></div></div>
    <p class="notice warning">Verifique coerência, identificação, sigilo, fundamentação, respostas e limites antes de assinar.</p><article class="report-preview">${reportText}</article></section>`;
  }

  function openWizard(){
    wizardStep=0; draft={}; renderWizard(); wizard.showModal();
  }
  function renderWizard(){
    const step=steps[wizardStep]; wizardTitle.textContent=step.title; wizardHelp.textContent=step.help;
    wizardBack.style.visibility=wizardStep===0?'hidden':'visible'; wizardNext.textContent=wizardStep===steps.length-1?'Criar perícia':'Continuar';
    wizardDots.innerHTML=steps.map((_,i)=>`<span class="${i===wizardStep?'is-active':''}"></span>`).join('');
    if(step.form){
      wizardBody.innerHTML=`<div class="form-stack"><label class="field"><span>Título interno</span><input name="title" required value="${esc(draft.title||'')}" placeholder="Ex.: Avaliação de dano estético"></label><label class="field"><span>Processo ou referência</span><input name="reference" value="${esc(draft.reference||'')}" placeholder="Opcional"></label><label class="field"><span>Objeto determinado</span><textarea name="scope" placeholder="Transcreva a determinação ou descreva o objeto.">${esc(draft.scope||'')}</textarea></label></div>`;
      return;
    }
    const options=step.dynamic ? branches[draft.sphere] || ['Outro'] : step.options;
    wizardBody.innerHTML=`<div class="choice-grid">${options.map(opt=>`<label class="choice"><input type="radio" name="${step.key}" value="${esc(opt)}" ${draft[step.key]===opt?'checked':''}><span>${esc(opt)}</span></label>`).join('')}</div>`;
  }
  function captureWizard(){
    const step=steps[wizardStep];
    if(step.form){
      const form=new FormData(document.querySelector('#caseWizardForm'));
      draft.title=String(form.get('title')||'').trim(); draft.reference=String(form.get('reference')||'').trim(); draft.scope=String(form.get('scope')||'').trim();
      return Boolean(draft.title);
    }
    const checked=wizardBody.querySelector('input:checked'); if(!checked)return false; draft[step.key]=checked.value; return true;
  }
  function createCase(){
    const timestamp=now();
    const c=normalize({id:id('case'),title:draft.title,reference:draft.reference,objectType:draft.matter,status:'Em preparação',createdAt:timestamp,updatedAt:timestamp,scope:draft.scope,
      context:{sphere:draft.sphere,branch:draft.branch,role:draft.role,matter:draft.matter,mode:draft.mode},
      person:{initials:'',birthDate:'',role:'Periciando(a)'},events:[],evidence:[],observations:[],findings:[],questions:[],conclusions:[],
      reasoning:{nexus:'',temporality:'',consolidation:'',repercussions:'',notes:''},exam:{history:'',objective:'',photography:'',measurements:''}});
    state.cases.unshift(c); state.currentCaseId=c.id; save('Perícia criada.'); wizard.close(); currentTab='summary'; renderCase();
  }

  function addEntity(type,c){
    if(type==='evidence'){
      const title=prompt('Título do documento ou fonte:'); if(!title)return;
      const description=prompt('Conteúdo relevante ou finalidade:')||'';
      c.evidence.push({id:id('evidence'),type:'Documento',title,description,date:'',reliability:'Primária',createdAt:now()});
    } else if(type==='conclusion'){
      const text=prompt('Conclusão técnico-pericial:'); if(!text)return;
      const title=prompt('Título curto da conclusão:')||'Conclusão';
      c.conclusions.push({id:id('conclusion'),title,text,evidenceIds:c.evidence.map(e=>e.id),findingIds:[],status:'Preliminar',createdAt:now()});
    } else {
      const text=prompt('Texto do quesito:'); if(!text)return;
      c.questions.push({id:id('question'),text,answer:'',basis:''});
    }
    c.updatedAt=now(); save('Registro adicionado.'); renderCase(currentTab);
  }

  function setPath(object,path,value){
    const parts=path.split('.'); let node=object;
    parts.slice(0,-1).forEach(p=>{ node[p] ||= {}; node=node[p]; }); node[parts.at(-1)]=value;
  }

  function exportJson(){
    const c=getCase(); if(!c)return;
    const payload={schema:'https://joyceradis.github.io/MedPer/data/mlks.schema.json',exportedAt:now(),application:'MedPer PWA',case:c};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`medper-${(c.reference||c.id).replace(/[^a-z0-9-]+/gi,'-')}.json`; link.click(); URL.revokeObjectURL(link.href);
  }

  function seedDemo(){
    draft={sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano estético',mode:'Presencial e documental',title:'Caso demonstrativo · dano estético',reference:'DEMO-001',scope:'Apurar a existência do dano estético e sua extensão.'};
    createCase(); const c=getCase();
    c.evidence.push({id:id('evidence'),type:'Documento médico',title:'Prontuário do atendimento inicial',description:'Registro contemporâneo com descrição de queimadura facial.',date:'2019-03-14',reliability:'Primária'});
    c.exam.objective='Cicatriz hipocrômica, discretamente deprimida, visível em distância social, a ser mensurada em protocolo padronizado.';
    c.reasoning.notes='A alteração atual deve ser comparada ao estado anterior, à documentação contemporânea e aos tratamentos realizados. A ausência de fotografia prévia constitui limitação.';
    c.questions.push({id:id('question'),text:'Existe dano estético atual?',answer:'Há alteração morfológica visível; a conclusão definitiva depende da avaliação integral.',basis:'Exame presencial e documentação médica.'});
    save(); renderCase('summary');
  }

  document.addEventListener('click', async event=>{
    const t=event.target.closest('button,[data-open-case]');
    if(!t)return;
    if(t.matches('[data-new-case]')) openWizard();
    else if(t.matches('[data-home]')) renderHome();
    else if(t.matches('[data-account]')) accountDialog.showModal();
    else if(t.matches('[data-demo]')) seedDemo();
    else if(t.dataset.openCase){ state.currentCaseId=t.dataset.openCase; save(); renderCase('summary'); }
    else if(t.dataset.tab) renderCase(t.dataset.tab);
    else if(t.dataset.add) addEntity(t.dataset.add,getCase());
    else if(t.dataset.remove){ const c=getCase(); c[t.dataset.remove==='question'?'questions':t.dataset.remove==='conclusion'?'conclusions':'evidence']=c[t.dataset.remove==='question'?'questions':t.dataset.remove==='conclusion'?'conclusions':'evidence'].filter(x=>x.id!==t.dataset.id); save('Registro removido.'); renderCase(currentTab); }
    else if(t.matches('[data-export]')) exportJson();
    else if(t.matches('[data-print]')) window.print();
    else if(t.matches('[data-close-dialog]')) wizard.close();
    else if(t.id==='emailLoginButton'){
      if(!window.MedPerAPI){notify('A integração de conta ainda não está disponível.');return;}
      try{await window.MedPerAPI.login(document.querySelector('#apiEmail').value,document.querySelector('#apiPassword').value);notify('Conta conectada.');accountDialog.close();}catch{notify('Não foi possível entrar. O modo local continua ativo.');}
    }
  });

  document.addEventListener('change',event=>{
    const c=getCase(); if(!c)return;
    if(event.target.dataset.bind){setPath(c,event.target.dataset.bind,event.target.value);c.updatedAt=now();save('Alteração salva.');}
  });
  document.addEventListener('input',event=>{
    const c=getCase(); if(!c)return;
    if(event.target.dataset.questionAnswer){const q=c.questions.find(x=>x.id===event.target.dataset.questionAnswer);if(q){q.answer=event.target.value;save();}}
    if(event.target.dataset.questionBasis){const q=c.questions.find(x=>x.id===event.target.dataset.questionBasis);if(q){q.basis=event.target.value;save();}}
  });

  wizardBack.addEventListener('click',()=>{ if(wizardStep>0){captureWizard();wizardStep--;renderWizard();} });
  wizardNext.addEventListener('click',()=>{ if(!captureWizard()){notify('Selecione ou preencha esta etapa.');return;} if(wizardStep<steps.length-1){wizardStep++;renderWizard();}else createCase(); });
  wizard.addEventListener('click',event=>{ if(event.target===wizard)wizard.close(); });

  if(location.hash.startsWith('#/case/')){
    const [, , caseId, tab='summary']=location.hash.split('/'); state.currentCaseId=caseId; renderCase(tab);
  } else renderHome();
})();