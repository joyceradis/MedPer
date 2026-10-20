import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('optional Render preview cannot provision paid databases or persistent disks', () => {
  const blueprint = read('render.yaml');
  assert.match(blueprint, /^\s+plan: free\s*$/m);
  assert.match(blueprint, /^\s+autoDeploy: false\s*$/m);
  assert.doesNotMatch(blueprint, /^\s+disk:\s*$/m);
  assert.doesNotMatch(blueprint, /^databases:\s*$/m);
  assert.doesNotMatch(blueprint, /^\s+fromDatabase:\s*$/m);
  assert.doesNotMatch(blueprint, /plan: (?:starter|standard|pro|basic-\w+|plus|team)/);
  assert.match(blueprint, /MEDPER_PROFESSIONAL_ENABLED\s*\n\s+value: ["']?false/);
  assert.match(blueprint, /MEDPER_GOOGLE_SELF_SIGNUP_ENABLED\s*\n\s+value: ["']?false/);
});

test('Google browser and professional API opt-in are disabled until authorized', () => {
  const config = read('js/professional/config.js');
  assert.match(config, /MEDPER_PROFESSIONAL_API_ORIGIN\s*=\s*''/);
  assert.match(config, /MEDPER_GOOGLE_CLIENT_ID\s*=\s*''/);
  const server = read('backend/app/config.py');
  assert.match(server, /google_client_id:\s*str\s*=\s*""/);
  assert.match(server, /google_self_signup_enabled:\s*bool\s*=\s*False/);
  assert.match(server, /professional_enabled:\s*bool\s*=\s*False/);
});

test('Google sign-in always uses signed ID token and controlled MedPer sessions', () => {
  const server = read('backend/app/google_identity.py');
  assert.match(server, /get_signing_key_from_jwt/);
  assert.match(server, /algorithms=\["RS256"\]/);
  assert.match(server, /audience=client_id/);
  assert.match(server, /email_verified/);
  const auth = read('backend/app/routers/google_auth.py');
  assert.match(auth, /User\.google_subject/);
  assert.match(auth, /issue_pair\(/);
  assert.match(auth, /current_user/);
  const ui = read('js/professional/access.js');
  assert.match(ui, /\/auth\/google\/token/);
  assert.match(ui, /ready\.professionalAccess !== 'ready'/);
  assert.doesNotMatch(ui, /localStorage\s*\.|indexedDB\s*\./);
});
