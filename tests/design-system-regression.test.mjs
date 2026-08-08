import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/design-system.css', import.meta.url), 'utf8');

assert.match(css, /--medper-sidebar-top:/);
assert.match(css, /--medper-sidebar-bottom:/);
assert.match(css, /--medper-wordmark-med:/);
assert.match(css, /--medper-wordmark-per:/);
assert.match(css, /--medper-danger:/);
assert.match(css, /--medper-warning:/);
assert.match(css, /linear-gradient\(180deg/);

console.log('Design system regression suite completed successfully.');
