import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeOption, effectiveTime, formatUtc, parseSheetTimestamp, roundHours, fmtHours,
} from '../worker/src/clock.js';

const NOW = Date.UTC(2026, 6, 14, 12, 0); // 2026-07-14 12:00 UTC

test('parseTimeOption: hammertime tags, all styles', () => {
  assert.equal(parseTimeOption('<t:1752480000:t>'), 1752480000000);
  assert.equal(parseTimeOption('<t:1752480000:R>'), 1752480000000);
  assert.equal(parseTimeOption('<t:1752480000:F>'), 1752480000000);
  assert.equal(parseTimeOption('<t:1752480000>'), 1752480000000);
  assert.equal(parseTimeOption('  <t:1752480000:d>  '), 1752480000000);
});

test('parseTimeOption: bare unix seconds and milliseconds', () => {
  assert.equal(parseTimeOption('1752480000'), 1752480000000);
  assert.equal(parseTimeOption('1752480000000'), 1752480000000); // 13 digits = ms
});

test('parseTimeOption: garbage is null', () => {
  assert.equal(parseTimeOption('yesterday'), null);
  assert.equal(parseTimeOption('<t:abc:t>'), null);
  assert.equal(parseTimeOption('12:30'), null);
  assert.equal(parseTimeOption(''), null);
});

test('effectiveTime: empty means now', () => {
  assert.deepEqual(effectiveTime(undefined, NOW), { ms: NOW });
  assert.deepEqual(effectiveTime('', NOW), { ms: NOW });
});

test('effectiveTime: rejects the future beyond slack, accepts small skew', () => {
  const future = `<t:${Math.floor(NOW / 1000) + 3600}:t>`;
  assert.match(effectiveTime(future, NOW).error, /future/);
  const skew = `<t:${Math.floor(NOW / 1000) + 60}:t>`;
  assert.equal(effectiveTime(skew, NOW).ms, NOW + 60000);
});

test('effectiveTime: rejects more than 7 days back', () => {
  const old = `<t:${Math.floor(NOW / 1000) - 8 * 24 * 3600}:t>`;
  assert.match(effectiveTime(old, NOW).error, /7 days/);
});

test('effectiveTime: unparseable gives guidance', () => {
  assert.match(effectiveTime('half past nine', NOW).error, /hammertime/);
});

test('sheet timestamp round-trip', () => {
  assert.equal(formatUtc(NOW), '2026-07-14 12:00');
  assert.equal(parseSheetTimestamp('2026-07-14 12:00'), NOW);
  assert.equal(parseSheetTimestamp(''), null);
  assert.equal(parseSheetTimestamp('12/07/2026'), null);
});

test('hours rounding and display', () => {
  assert.equal(roundHours(2.34567), 2.35);
  assert.equal(fmtHours(2.35), '2.4h');
  assert.equal(fmtHours(8), '8h');
  assert.equal(fmtHours(1.5000001), '1.5h');
});
