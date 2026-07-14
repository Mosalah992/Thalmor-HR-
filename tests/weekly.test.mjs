import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeaderboard, resetWrites } from '../worker/src/weekly.js';
import { TIERS } from '../worker/src/roster.js';

const NOW = Date.UTC(2026, 6, 19, 18, 0); // a Sunday 18:00 UTC

const member = (name, hours, owed = false, row = 4) => ({
  row, rank: 'Junior Soldier', name, discord: `@${name.toLowerCase()}`,
  status: 'ACTIVE', owed, paid: false, lastActive: '', hours,
});

test('buildLeaderboard: ranks by hours, zero-hour members excluded', () => {
  const members = [
    member('Aeth', 2), member('Bril', 10, true), member('Cyr', 0), member('Dor', 8.5, true),
  ];
  const out = buildLeaderboard(members, null, NOW);
  assert.match(out, /🥇 Bril — 10h/);
  assert.match(out, /🥈 Dor — 8\.5h/);
  assert.match(out, /🥉 Aeth — 2h/);
  assert.doesNotMatch(out, /Cyr/);
  assert.match(out, /2 member\(s\) reached 8h/);
});

test('buildLeaderboard: climber uses hours delta vs snapshot', () => {
  const members = [member('Aeth', 6), member('Bril', 7)];
  const out = buildLeaderboard(members, { Aeth: 5, Bril: 1 }, NOW);
  assert.match(out, /Climber of the week:\*\* Bril \(\+6h\)/);
});

test('buildLeaderboard: discarded open shifts are named', () => {
  const out = buildLeaderboard([member('Aeth', 1)], null, NOW, [
    { userId: '1', username: 'sleepy_elf', startMs: NOW - 3600000 },
  ]);
  assert.match(out, /Open shifts discarded .*: sleepy_elf/);
});

test('buildLeaderboard: empty week still posts', () => {
  const out = buildLeaderboard([member('Aeth', 0)], null, NOW);
  assert.match(out, /No hours were logged this week/);
});

test('resetWrites: zeroes hours, unchecks Owed+Paid, clears every Ledger names cell', () => {
  const members = [member('Aeth', 9, true, 4), member('Bril', 2, false, 7)];
  const writes = resetWrites('Roster', members);
  assert.equal(writes.length, members.length * 3 + TIERS.length);
  assert.deepEqual(writes[0], { range: "'Roster'!K4", values: [[0]] });
  assert.deepEqual(writes[1], { range: "'Roster'!G4", values: [[false]] });
  assert.deepEqual(writes[2], { range: "'Roster'!H4", values: [[false]] });
  assert.ok(writes.some((w) => w.range === "'Ledger'!E5" && w.values[0][0] === ''));
  assert.ok(writes.some((w) => w.range === "'Ledger'!E13" && w.values[0][0] === ''));
});
