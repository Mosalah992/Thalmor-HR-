import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeaderboard, resetWrites, owedClearWrites } from '../worker/src/weekly.js';

const NOW = Date.UTC(2026, 6, 20, 9, 0); // a Monday 09:00 UTC (3 AM CST)

const member = (name, hours, owed = false, row = 4) => ({
  row, rank: 'Junior Soldier', name, discord: `@${name.toLowerCase()}`,
  status: 'ACTIVE', owed, paid: false, lastActive: '', hours,
});

test('buildLeaderboard: ranks by hours, zero-hour members excluded', () => {
  // owed flags are cleared at 08:30, so the count must come from hours, not owed
  const members = [
    member('Aeth', 2), member('Bril', 10), member('Cyr', 0), member('Dor', 8.5),
  ];
  const out = buildLeaderboard(members, null, NOW);
  assert.match(out, /1\. Bril — 10h/);
  assert.match(out, /2\. Dor — 8\.5h/);
  assert.match(out, /3\. Aeth — 2h/);
  assert.doesNotMatch(out, /Cyr/);
  assert.match(out, /2 member\(s\) reached 8h/);
});

test('buildLeaderboard: climber uses hours delta vs snapshot', () => {
  const members = [member('Aeth', 6), member('Bril', 7)];
  const out = buildLeaderboard(members, { Aeth: 5, Bril: 1 }, NOW);
  assert.match(out, /Climber of the week:\*\* Bril \(\+6h\)/);
});

test('buildLeaderboard: open shifts carried into the new week are named, not discarded', () => {
  const out = buildLeaderboard([member('Aeth', 1)], null, NOW, [
    { userId: '1', username: 'sleepy_elf', startMs: NOW - 3600000 },
  ]);
  assert.match(out, /Still clocked in .*not discarded.*: sleepy_elf/);
});

test('buildLeaderboard: empty week still posts', () => {
  const out = buildLeaderboard([member('Aeth', 0)], null, NOW);
  assert.match(out, /No hours were logged this week/);
});

test('resetWrites: zeroes hours, marks Owed at 8h+, unchecks Paid, never touches the Ledger tab', () => {
  const members = [member('Aeth', 9, false, 4), member('Bril', 2, false, 7)];
  const writes = resetWrites('Roster', members);
  assert.equal(writes.length, members.length * 3);
  assert.deepEqual(writes[0], { range: "'Roster'!K4", values: [[0]] });
  assert.deepEqual(writes[1], { range: "'Roster'!G4", values: [[true]] }); // 9h ≥ 8h goal
  assert.deepEqual(writes[2], { range: "'Roster'!H4", values: [[false]] });
  assert.deepEqual(writes[4], { range: "'Roster'!G7", values: [[false]] }); // 2h < goal
  assert.ok(writes.every((w) => !w.range.startsWith("'Ledger'")));
});

test('owedClearWrites: unchecks Owed for every row, nothing else', () => {
  const members = [member('Aeth', 9, true, 4), member('Bril', 2, false, 7)];
  const writes = owedClearWrites('Roster', members);
  assert.deepEqual(writes, [
    { range: "'Roster'!G4", values: [[false]] },
    { range: "'Roster'!G7", values: [[false]] },
  ]);
});
