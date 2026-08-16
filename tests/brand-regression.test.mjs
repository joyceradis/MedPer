import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const icon = readFileSync(new URL('../icon.svg', import.meta.url), 'utf8');

test('keeps a valid canonical MedPer logomark asset', () => {
  assert.match(icon, /<svg\b/);
  assert.match(icon, /<title id="title">MedPer<\/title>/);
  assert.match(icon, /viewBox=/);
});

console.log('Brand identity regression suite completed successfully.');
