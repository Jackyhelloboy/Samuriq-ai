import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell } from '../lib/csv.mjs';
test('CSV export neutralizes formula prefixes after whitespace', () => {
  for (const value of ['=1+1', '  =1+1', '\n=1+1', '\t+1', '\r@SUM(1)', '-1+1']) {
    assert.equal(csvCell(value), '"\'' + value + '"');
  }
});
test('CSV export retains ordinary text and escapes quotes', () => {
  assert.equal(csvCell('A, B "team"'), '"A, B ""team"""');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(120), '"120"');
});
