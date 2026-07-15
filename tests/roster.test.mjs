import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMembers, matchMember } from '../worker/src/roster.js';

// A4:K rows (index 0 = sheet row 4): Unit, Rank, Name, Race, Discord, Status,
// Owed, Paid, Notes, Last Active, Total Hours
const ROWS = [
  ['Command', 'First Emissary', 'Lord Verux Valen', 'Altmer', '@roxburyy', 'ACTIVE', 'FALSE', 'FALSE', '', '2026-07-12 20:24', '3.5'],
  ['Command', 'Advisor', 'Baron Telandor Aurelion', 'Altmer', '@.gordy', 'LOA', 'TRUE', 'FALSE', '', '', '9'],
  ['Justiciars', 'High Justiciar', 'Lady Celeriel ✦✦✧', 'Altmer', '@celeriel / celeri', 'ACTIVE', 'TRUE', 'FALSE', '', '', '12.25'],
  ['Soldiers', 'Junior Soldier', 'Fal Roland', 'Bosmer', '@falroland.', 'ACTIVE', 'FALSE', 'FALSE', '', '', ''],
  [],
  ['Recruits', 'Recruit', 'Nimriel Valynwe', 'Altmer', '', 'JUST JOINED', 'FALSE', 'FALSE', '', '', ''],
];

test('parseMembers: rows, checkbox and hours parsing; blank rows dropped', () => {
  const members = parseMembers(ROWS);
  assert.equal(members.length, 5); // empty row skipped
  assert.equal(members[0].row, 4);
  assert.equal(members[2].row, 6); // sheet rows preserved
  assert.equal(members[1].owed, true);
  assert.equal(members[0].owed, false);
  assert.equal(members[2].hours, 12.25);
  assert.equal(members[3].hours, 0);
});

test('matchMember: @ stripped, case-insensitive, multi-handle cells, trailing dots', () => {
  const members = parseMembers(ROWS);
  assert.equal(matchMember(members, 'Roxburyy').name, 'Lord Verux Valen');
  assert.equal(matchMember(members, 'celeri').row, 6);
  assert.equal(matchMember(members, 'celeriel').row, 6);
  assert.equal(matchMember(members, 'falroland.').name, 'Fal Roland');
  assert.equal(matchMember(members, 'falroland'), null); // dot is part of the username
  assert.equal(matchMember(members, 'stranger'), null);
  assert.equal(matchMember(members, ''), null);
});
