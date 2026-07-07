const { test } = require('node:test');
const assert = require('node:assert');
const { handleParts, normalizeUsername, buildRosterMap, matchUser } = require('../src/match');

test('simple handle normalizes', () => {
  assert.deepStrictEqual(handleParts('@oryninc'), ['oryninc']);
});

test('multi-handle cell splits on slash', () => {
  assert.deepStrictEqual(handleParts('@roselord / slimely'), ['roselord', 'slimely']);
});

test('trailing dot is preserved (legal in usernames)', () => {
  assert.deepStrictEqual(handleParts('@grimreaper7865.'), ['grimreaper7865.']);
});

test('empty and blank cells yield no parts', () => {
  assert.deepStrictEqual(handleParts(''), []);
  assert.deepStrictEqual(handleParts('   '), []);
  assert.deepStrictEqual(handleParts(undefined), []);
});

test('uppercase handles are lowered', () => {
  assert.deepStrictEqual(handleParts('@ARagedTaco'), ['aragedtaco']);
});

test('buildRosterMap maps parts to sheet rows', () => {
  const { map, duplicates } = buildRosterMap(['@alpha', '', '@roselord / slimely', '@beta.'], 4);
  assert.strictEqual(map.get('alpha'), 4);
  assert.strictEqual(map.get('roselord'), 6);
  assert.strictEqual(map.get('slimely'), 6);
  assert.strictEqual(map.get('beta.'), 7);
  assert.deepStrictEqual(duplicates, []);
});

test('duplicate handles reported, first row wins', () => {
  const { map, duplicates } = buildRosterMap(['@dup', '@dup'], 4);
  assert.strictEqual(map.get('dup'), 4);
  assert.deepStrictEqual(duplicates, ['dup']);
});

test('matchUser resolves normalized usernames', () => {
  const { map } = buildRosterMap(['@Alpha'], 10);
  assert.strictEqual(matchUser(map, 'alpha'), 10);
  assert.strictEqual(matchUser(map, 'ALPHA'), 10);
  assert.strictEqual(matchUser(map, 'unknown'), null);
});

test('normalizeUsername strips @ and lowers', () => {
  assert.strictEqual(normalizeUsername(' @SomeUser '), 'someuser');
});
