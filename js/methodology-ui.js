(() => {
  'use strict';
  const M=window.MedPerMethodology;
  if(!M) return;
  const app=document.querySelector('#app');
  const keys=['medper.state.v3','medper.state.v2'];
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const read=()=>{for(const key of keys){try{const p=JSON.parse(localStorage.getItem(key)||'{}');if(Array.isArray(p.cases))return{key,state:p}}catch{}}return null};
  const current=()=>{const bundle=read();if(!bundle)return null;const id=location.hash.match(/^#\/case\/([^/]+)/)?.[1]||bundle.state.currentCaseId;const c=bundle.state.cases.find(x=>x.id===id);if(!c)return null;M.ensure(c);return{...bundle,case:c}};
  const field=(label,path,value,help='')=>`<label class="field"><span>${esc(label)}</span><textarea data-bind="${esc(path)}" placeholder="${esc(help)}">${esc(value||'')}</textarea>${help?`<small class="field-help">${esc(help)}</small>`:''}</label>`;
  const panelHead=(title,help)=>`<div class="panel-head"><div><h2>${esc(title)}</h2><p>${esc(help)}</p></div></div>`;

  function inject(){
    const bundle=current(); if(!bundle)return;
    const c=bundle.case, audit=M.audit(c), protocol=M.getProtocol(c.context?.matter);
    relabel();
    const content=app.querySelector('.case-content'); if(!content)return;
    const title=content.querySelector('.case-title')?.textContent?.trim();
    if(title==='Resumo') injectSummary(content,c,audit);
    if(title==='Avaliação') injectAssessment(content,c,protocol);
    if(title==='Análise') injectAnalysis(content,c,audit);
    if(title==='Laudo') injectReport(content,c,audit,protocol);
  }

  function relabel(){
    app.querySelectorAll('.case-nav button').forEach(btn=>{
      const span=btn.querySelector('span'); if(!span)return;
      if(span.textContent.trim()==='Avaliação')span.textContent='Método e técnica';
      if(span.textContent.trim()==='Análise')span.textContent='Análise e decisão';
      if(span.textContent.trim()==='Laudo')span.textContent='Documento final';
    });
  }

  function injectSummary(content,c,audit){
    if(content.querySelector('[data-methodology-summary]'))return;
    const host=content.querySelector('.content-grid')||content;
    const section=document.createElement('section');section.className='panel panel-full methodology-panel';section.dataset.methodologySummary='';
    section.innerHTML=`${panelHead('Auditoria metodológica','Requisitos que impedem ou limitam a conclusão médico-pericial.')}<div class="audit-summary"><div><strong>${audit.blocks}</strong><span>bloqueios</span></div><div><strong>${audit.warnings}</strong><span>ressalvas</span></div><div><strong>${c.evidence?.length||0}</strong><span>fontes</span></div><div><strong>${c.facts?.length||0}</strong><span>fatos</span></div></div><div class="audit-list">${audit.issues.slice(0,8).map(i=>`<div class="audit-item ${i.severity}">${esc(i.text)}</div>`).join('')||'<p class="notice">Nenhuma pendência metodológica identificada.</p>'}</div>`;
    host.appendChild(section);
  }

  function injectAssessment(content,c,protocol){
    if(content.querySelector('[data-methodology-assessment]'))return;
    const host=content.querySelector('.content-grid')||content;
    const wrapper=document.createElement('div');wrapper.dataset.methodologyAssessment='';wrapper.className='methodology-stack';
    const phases=M.general.phases.filter(x=>['delimitation','material','examination'].includes(x.id));
    wrapper.innerHTML=phases.map(phase=>`<section class="panel panel-full methodology-panel">${panelHead(phase.title,'Método geral obrigatório antes da conclusão.')}<div class="form-grid">${phase.fields.map(([key,label,help])=>field(label,`methodology.general.${key}`,c.methodology.general[key],help)).join('')}</div></section>`).join('')+`<section class="panel panel-full methodology-panel specific-protocol">${panelHead(protocol.title,'Técnica específica selecionada conforme a matéria do caso.')}<div class="form-grid">${protocol.fields.map(([key,label,help])=>field(label,`methodology.specific.${key}`,c.methodology.specific[key],help)).join('')}</div></section>`;
    host.prepend(wrapper);
  }

  function injectAnalysis(content,c,audit){
    if(content.querySelector('[data-methodology-analysis]'))return;
    const host=content.querySelector('.content-grid')||content;
    const d=c.methodology.decision;
    const wrapper=document.createElement('div');wrapper.dataset.methodologyAnalysis='';wrapper.className='methodology-stack';
    const reasoning=M.general.phases.filter(x=>['reasoning','limits'].includes(x.id));
    wrapper.innerHTML=reasoning.map(phase=>`<section class="panel panel-full methodology-panel">${panelHead(phase.title,'Registre o raciocínio, inclusive dados contrários e limitações.')}<div class="form-grid">${phase.fields.map(([key,label,help])=>field(label,`methodology.general.${key}`,c.methodology.general[key],help)).join('')}</div></section>`).join('')+`<section class="panel panel-full methodology-panel decision-matrix">${panelHead('Matriz de decisão pericial','A conclusão deve ser proporcional ao grau de prova registrado.')}<div class="form-grid">${field('Proposição técnico-pericial','methodology.decision.claim',d.claim,'Qual hipótese médica está sendo testada?')}${field('Elementos favoráveis','methodology.decision.favorable',d.favorable,'Dados que sustentam a hipótese.')}${field('Elementos contrários','methodology.decision.contrary',d.contrary,'Dados que enfraquecem a hipótese.')}${field('Hipóteses alternativas','methodology.decision.alternatives',d.alternatives,'Outras explicações razoáveis.')}${field('Limitações relevantes','methodology.decision.limits',d.limits,'Restrições e seu impacto.')}${field('Grau de sustentação','methodology.decision.certainty',d.certainty,'Suficiente, limitado, inconclusivo ou incompatível.')}${field('Conclusão admissível','methodology.decision.admissibleConclusion',d.admissibleConclusion,'Conclusão médica sem extrapolar o objeto.')}</div></section><section class="panel panel-full methodology-panel audit-panel">${panelHead('Controle de suficiência','Bloqueios impedem conclusão definitiva; ressalvas devem constar do laudo.')}<div class="audit-list">${audit.issues.map(i=>`<div class="audit-item ${i.severity}"><strong>${i.severity==='block'?'Bloqueio':'Ressalva'}:</strong> ${esc(i.text)}</div>`).join('')||'<p class="notice">Método apto para conclusão.</p>'}</div></section>`;
    host.prepend(wrapper);
  }

  function injectReport(content,c,audit,protocol){
    if(content.querySelector('[data-methodology-report]'))return;
    const preview=content.querySelector('.report-preview'); if(!preview)return;
    const g=c.methodology.general,d=c.methodology.decision;
    const section=document.createElement('section');section.dataset.methodologyReport='';section.className='methodology-report';
    section.innerHTML=`${audit.blocks?`<div class="notice notice-danger"><strong>Documento preliminar:</strong> há ${audit.blocks} bloqueio(s) metodológico(s). A conclusão definitiva não deve ser emitida.</div>`:''}<h3>METODOLOGIA</h3><p>${esc(g.methodChoice||'Metodologia não registrada.')}</p><p><strong>Protocolo específico:</strong> ${esc(protocol.title)}</p><h3>LIMITAÇÕES METODOLÓGICAS</h3><p>${esc(d.limits||g.methodLimits||'Não registradas.')}</p><h3>GRAU DE SUSTENTAÇÃO</h3><p>${esc(d.certainty||g.certainty||'Não registrado.')}</p><h3>CONCLUSÃO METODOLOGICAMENTE ADMISSÍVEL</h3><p>${esc(d.admissibleConclusion||'Não formulada.')}</p>`;
    preview.prepend(section);
  }

  let scheduled=false;
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;inject()})});
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(inject,0));
  inject();
})();
