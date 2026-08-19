import assert from 'node:assert/strict';
import { personalWorkspaceIdentity, validatePasswordConfirmation, normalizeFullName, googleCallbackCode } from '../js/auth/onboarding-enhancer.js';

const workspace=personalWorkspaceIdentity('medico@example.com');
assert.equal(workspace.name,'Espaço pessoal');
assert.match(workspace.slug,/^pessoal-[a-z0-9-]+$/);
assert.ok(workspace.slug.length<=80);

assert.equal(validatePasswordConfirmation('SenhaSegura123!','SenhaSegura123!'),true);
assert.equal(validatePasswordConfirmation('SenhaSegura123!','OutraSenha123!'),false);

assert.equal(normalizeFullName('  Joyce   Radis de Souza  '),'Joyce Radis de Souza');
assert.equal(normalizeFullName('Joyce'),'Joyce');
assert.equal(normalizeFullName('   '),'');

assert.equal(googleCallbackCode({search:'?google_code=abc123',hash:''}),'abc123');
assert.equal(googleCallbackCode({search:'',hash:'#google_code=xyz789'}),'xyz789');
assert.equal(googleCallbackCode({search:'?foo=bar',hash:'#other=value'}),'');

console.log('Onboarding enhancer regression suite completed successfully.');
