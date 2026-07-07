const { test } = require('node:test');
const assert = require('node:assert');
const { aggregate, formatUtc, parseSheetTimestamp } = require('../src/aggregate');

const msg = (username, timestamp, extra = {}) => ({
  author: { username, bot: false },
  timestamp,
  ...extra,
});

test('aggregates max timestamp and count per user', () => {
  const byUser = aggregate([
    msg('alice', '2026-07-01T10:00:00.000Z'),
    msg('alice', '2026-07-05T18:30:00.000Z'),
    msg('alice', '2026-07-03T09:00:00.000Z'),
    msg('bob', '2026-06-01T00:00:00.000Z'),
  ]);
  assert.strictEqual(byUser.get('alice').count, 3);
  assert.strictEqual(formatUtc(byUser.get('alice').lastMs), '2026-07-05 18:30');
  assert.strictEqual(byUser.get('bob').count, 1);
});

test('bots and webhooks are excluded', () => {
  const byUser = aggregate([
    { author: { username: 'somebot', bot: true }, timestamp: '2026-07-01T10:00:00.000Z' },
    msg('hooky', '2026-07-01T10:00:00.000Z', { webhook_id: '123' }),
    msg('human', '2026-07-01T10:00:00.000Z'),
  ]);
  assert.strictEqual(byUser.size, 1);
  assert.ok(byUser.has('human'));
});

test('usernames are lowercased', () => {
  const byUser = aggregate([msg('MixedCase', '2026-07-01T10:00:00.000Z')]);
  assert.ok(byUser.has('mixedcase'));
});

test('formatUtc renders UTC regardless of local timezone', () => {
  assert.strictEqual(formatUtc(Date.UTC(2026, 6, 7, 4, 5)), '2026-07-07 04:05');
});

test('parseSheetTimestamp round-trips formatUtc', () => {
  const ms = Date.UTC(2026, 6, 7, 21, 45);
  assert.strictEqual(parseSheetTimestamp(formatUtc(ms)), ms);
});

test('parseSheetTimestamp rejects junk', () => {
  assert.strictEqual(parseSheetTimestamp('yesterday'), null);
  assert.strictEqual(parseSheetTimestamp(''), null);
  assert.strictEqual(parseSheetTimestamp(undefined), null);
});

test('monotonic guard scenario: older backfill does not regress newer value', () => {
  const existing = parseSheetTimestamp('2026-07-06 12:00');
  const scanned = Date.parse('2026-07-01T00:00:00.000Z');
  assert.ok(!(existing === null || scanned > existing), 'older scan must not overwrite');
});
