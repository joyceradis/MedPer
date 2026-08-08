import assert from 'node:assert/strict';
import { normalizeCase } from '../js/core/store.js';
import { auditCase } from '../js/methodology/engine.js';
import {
  getMethodologyContext,
  getContextualProtocolProfile,
  getSuggestedInstrumentIds,
  getApplicableInstrumentIds
} from '../js/methodology/context-resolver.js';

function test(name, callback){
  try{callback();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}
}

function aestheticCase(context,methodology={}){
  return normalizeCase({
    context:{...context,matter:'Dano estético',mode:'Documental'},
    scope:'Avaliar alteração estética.',
    methodology:{
      general:{object:'Avaliar alteração estética.',methodChoice:'Documental',availableMaterial:'Autos'},
      guided:{consolidationStatus:'Sim, com fundamento registrado',objectiveChange:'Sim',priorAppearanceStatus:'Documentação objetiva'},
      specific:{topography:'Face',dimensions:'2 x 1 cm'},
      decision:{alternatives:'Sem hipótese concorrente relevante registrada.',certainty:'Suficiente'},
      ...methodology
    }
  });
}

test('normalizes stable internal context ids without removing legacy labels',()=>{
  const c=normalizeCase({context:{sphere:'Judicial',branch:'Cível',role:'Perita do juízo',matter:'Dano estético'}});
  assert.equal(c.context.sphere,'Judicial');
  assert.equal(c.context.branch,'Cível');
  assert.equal(c.context.settingId,'judicial');
  assert.equal(c.context.legalSphereId,'civil');
  assert.equal(c.context.roleId,'court_expert');
  assert.equal(c.context.matterId,'aesthetic_damage');
});

test('resolves civil aesthetic damage as a personal-damage contextual profile',()=>{
  const c=normalizeCase({context:{setting:'Judicial',legalSphere:'Cível',role:'Perita do juízo',matter:'Dano estético'}});
  const context=getMethodologyContext(c);
  const profile=getContextualProtocolProfile(c);
  assert.equal(context.purposeId,'personal_damage_assessment');
  assert.equal(profile.id,'aesthetic_damage_civil');
  assert.equal(profile.baseProtocolId,'aesthetic');
  assert.deepEqual(getSuggestedInstrumentIds(c),['aipe']);
  assert.deepEqual(getApplicableInstrumentIds(c),['aipe']);
});

test('does not generalize AIPE to criminal aesthetic assessment',()=>{
  const c=normalizeCase({context:{setting:'Judicial',legalSphere:'Criminal',role:'Perita do juízo',matter:'Dano estético'}});
  const context=getMethodologyContext(c);
  const profile=getContextualProtocolProfile(c);
  assert.equal(context.purposeId,'medicolegal_assessment');
  assert.equal(profile.id,'aesthetic_damage_criminal');
  assert.equal(profile.baseProtocolId,'aesthetic');
  assert.deepEqual(getSuggestedInstrumentIds(c),[]);
  assert.deepEqual(getApplicableInstrumentIds(c),[]);
});

test('explicit physician instrument choices override contextual suggestions safely',()=>{
  const c=normalizeCase({
    context:{setting:'Judicial',legalSphere:'Cível',role:'Perita do juízo',matter:'Dano estético'},
    methodology:{activeInstrumentIds:[],dismissedInstrumentIds:['aipe']}
  });
  assert.deepEqual(getSuggestedInstrumentIds(c),[]);
  assert.deepEqual(getApplicableInstrumentIds(c),[]);
});

test('physician can explicitly add an instrument even when it was not suggested',()=>{
  const c=normalizeCase({
    context:{setting:'Judicial',legalSphere:'Criminal',role:'Perita do juízo',matter:'Dano estético'},
    methodology:{activeInstrumentIds:['aipe'],dismissedInstrumentIds:[]}
  });
  assert.deepEqual(getApplicableInstrumentIds(c),['aipe']);
});

test('keeps purpose explicit when physician has already selected one',()=>{
  const c=normalizeCase({context:{setting:'Judicial',legalSphere:'Cível',matter:'Dano estético',purposeId:'medicolegal_assessment'}});
  assert.equal(getMethodologyContext(c).purposeId,'medicolegal_assessment');
});

test('audits AIPE rationale only when AIPE is active for the contextual profile',()=>{
  const civil=aestheticCase({setting:'Judicial',legalSphere:'Cível',role:'Perita do juízo'},{specific:{topography:'Face',dimensions:'2 x 1 cm',aipeScore:'20'}});
  const criminal=aestheticCase({setting:'Judicial',legalSphere:'Criminal',role:'Perita do juízo'},{specific:{topography:'Face',dimensions:'2 x 1 cm',aipeScore:'20'}});
  const civilIssues=auditCase(civil).issues.map(issue=>issue.text);
  const criminalIssues=auditCase(criminal).issues.map(issue=>issue.text);
  assert.equal(civilIssues.some(text=>text.includes('AIPE registrada sem fundamentação')),true);
  assert.equal(criminalIssues.some(text=>text.includes('instrumento não está ativo')),true);
  assert.equal(criminalIssues.some(text=>text.includes('AIPE registrada sem fundamentação')),false);
});

console.log('Contextual methodology regression suite completed successfully.');
