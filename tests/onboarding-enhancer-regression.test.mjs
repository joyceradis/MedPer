import assert from 'node:assert/strict';
import { personalWorkspaceIdentity, validatePasswordConfirmation } from '../js/auth/onboarding-enhancer.js';

const workspace=personalWorkspaceIdentity('medico@example.com');
assert.equal(workspace.name,'Espaço pessoal');
assert.match(workspace.slug,/^pessoal-[a-z0-9-]+$/);
assert.ok(workspace.slug.length<=80);

assert.equal(validatePasswordConfirmation('SenhaSegura123!','SenhaSegura123!'),true);
assert.equal(validatePasswordConfirmation('SenhaSegura123!','OutraSenha123!'),false);

console.log('Onboarding enhancer regression suite completed successfully.');
