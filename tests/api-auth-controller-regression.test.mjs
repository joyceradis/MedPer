import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../js/auth/auth-controller.js',import.meta.url),'utf8');
assert.match(source,/createApiAuthClient/,'auth controller must support the canonical FastAPI auth client');
assert.match(source,/createApiSessionStore/,'auth controller must persist the FastAPI token pair');
assert.match(source,/isApiConfigured/,'auth controller must select API mode only when configured');
assert.match(source,/getAccessToken/,'auth controller must expose an access-token getter to the sync layer');
assert.match(source,/minlength="12"/,'frontend password constraint must match backend registration policy');
console.log('API auth controller regression suite completed successfully.');
