import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/design-system.css', import.meta.url), 'utf8');

// Protect semantic roles, not a historical palette or layout.
assert.match(css, /--medper-danger:/);
assert.match(css, /--medper-warning:/);

console.log('Design system semantic regression suite completed successfully.');
