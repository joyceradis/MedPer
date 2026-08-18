import assert from 'node:assert/strict';
import fs from 'node:fs';
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
for(const path of [
  './js/core/case-state-sync-controller.js',
  './js/api/case-state-client.js',
  './js/api/auth-client.js',
  './js/config/api-config.js',
  './js/auth/api-session.js'
]) assert.match(sw,new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`offline shell must include ${path}`);
console.log('Sync offline shell regression suite completed successfully.');
