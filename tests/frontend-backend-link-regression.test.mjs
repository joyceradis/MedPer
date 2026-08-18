import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
assert.match(main,/createCaseStateClient/,'main must create the case-state API client');
assert.match(main,/createCaseStateSyncController/,'main must install the sync controller');
assert.match(main,/API_CONFIG/,'main must use the runtime API endpoint configuration');
assert.match(main,/auth\.getAccessToken/,'sync must obtain the bearer token from the active auth controller');
assert.match(main,/\.hydrate\(/,'remote case state must hydrate the local workspace after authenticated startup');
assert.match(main,/syncAll/,'frontend must explicitly flush local state to the backend');
console.log('Frontend/backend link regression suite completed successfully.');
