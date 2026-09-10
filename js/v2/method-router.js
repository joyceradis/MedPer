const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

const CATALOG = Object.freeze([
  { id:'aipe', label:'AIPE', description:'Valoração estruturada do dano estético.' },
  { id:'posas', label:'POSAS 2.0', description:'Qualidade cicatricial pelo paciente e observador.' },
  { id:'functional-capacity', label:'Capacidade funcional', description:'Função, atividade habitual e capacidade residual.' },
  { id:'temporary-damage', label:'Dano temporário', description:'Temporalidade, recuperação e repercussões transitórias.' },
  { id:'causal-link', label:'Nexo causal', description:'Temporalidade, mecanismo, plausibilidade, estado anterior e concausas.' },
  { id:'professional-liability', label:'Responsabilidade profissional', description:'Indicação, dever técnico, conduta, evolução, dano, evitabilidade e nexo.' },
  { id:'personal-damage', label:'Dano corporal', description:'Sequelas, repercussões funcionais, temporárias e permanentes.' }
]);

export function routeMethodology(caseRecord = {}) {
  const haystack = norm([
    caseRecord.context?.legalContext,
    caseRecord.context?.object,
    caseRecord.identity?.title,
    caseRecord.analysis?.medicoLegalQuestion
  ].filter(Boolean).join(' '));
  const chosen = new Set();
  const has = (...terms) => terms.some(term => haystack.includes(norm(term)));

  if (has('estético','estetico','cicatriz','queimadura','deformidade')) chosen.add('aipe');
  // POSAS mede qualidade cicatricial; não deve ser sugerida para qualquer dano
  // estético (p.ex. deformidade não cicatricial) sem componente de cicatriz.
  if (has('cicatriz','cicatricial','queimadura')) chosen.add('posas');
  if (has('incapacidade','laborativa','capacidade residual','funcional','função','funcao')) { chosen.add('functional-capacity'); chosen.add('temporary-damage'); }
  if (has('nexo','causal','concausa','acidente','etiologia')) chosen.add('causal-link');
  if (has('responsabilidade profissional','erro médico','erro medico','iatrogenia','má prática','ma pratica')) { chosen.add('professional-liability'); chosen.add('causal-link'); }
  if (has('dano corporal','sequela','sequelas','déficit','deficit')) chosen.add('personal-damage');
  if (caseRecord.context?.legalContext === 'previdenciario') { chosen.add('functional-capacity'); chosen.add('temporary-damage'); }
  return CATALOG.filter(item => chosen.has(item.id));
}

export function methodologyCatalog() { return [...CATALOG]; }
