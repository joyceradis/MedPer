import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
let controller='';
try{controller=fs.readFileSync(new URL('../js/ui/method-context-controller.js',import.meta.url),'utf8');}catch{}

assert.match(main,/installMethodContextController/,'main must install the contextual methodology controller');
assert.match(app,/context-methodology\.css/,'app shell must load contextual methodology styles');
assert.match(controller,/data-instrument-accept/,'UI must allow explicit acceptance of a suggested instrument');
assert.match(controller,/data-instrument-dismiss/,'UI must allow explicit dismissal of a suggested instrument');
assert.match(controller,/getContextualProtocolProfile/,'UI must render the contextual profile, not only the matter label');
assert.doesNotMatch(controller,/activeInstrumentIds\.push\([^)]*suggest/i,'suggestion must not be silently promoted to explicit physician selection');
assert.match(controller,/evaluatePersonalDamageCase/,'the contextual card must consume the personal-damage domain gate instead of duplicating its rules');
assert.match(controller,/data-personal-damage-gate/,'personal-damage cases must expose a dedicated gate card');
assert.match(controller,/Próximo passo/,'the gate card must tell the physician what comes next without exposing the whole engine');
assert.match(controller,/buildPosasAssessmentFromGuided/,'the UI must derive POSAS totals from persisted guided fields');
assert.match(controller,/Patient.*\/60/,'the UI must expose the Patient total independently');
assert.match(controller,/Observer.*\/60/,'the UI must expose the Observer total independently');
assert.doesNotMatch(controller,/Patient\s*\+\s*Observer|combinedTotal/i,'the UI must never combine Patient and Observer totals');

console.log('Context methodology UI regression suite completed successfully.');
