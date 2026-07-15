// Clock-in roster (CLOCKIN_SHEET_ID, first tab): read/parse member rows
// and Discord-handle matching. The Ledger tab is maintained by hand —
// the bot never writes to it.
// Layout (row 3 headers, data from row 4):
//   A Unit | B Rank | C Name | D Race | E Discord | F Status
//   G Owed ☑ | H Paid ☑ | I Notes | J Last Active | K Total Hours
// Columns L+ hold the live stats block — never written.

import { readValues } from './gsheets.js';

export const START_ROW = 4;
export const COL = { OWED: 'G', PAID: 'H', LAST_ACTIVE: 'J', HOURS: 'K' };
export const HOURS_HEADER_CELL = 'K3';
export const HOURS_HEADER = 'Total Hours';

/** Normalize a Discord username for lookup. */
export const normalizeUsername = (username) =>
  String(username || '').trim().replace(/^@+/, '').toLowerCase();

/** "@roselord / slimely" -> ["roselord", "slimely"]; trailing dots are legal. */
export const handleParts = (cell) =>
  String(cell || '')
    .split('/')
    .map((p) => p.trim().replace(/^@+/, '').toLowerCase())
    .filter(Boolean);

/** Title of the first tab (gid 0) of the clock-in sheet. */
export async function getRosterTab(token, env) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.CLOCKIN_SHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets meta ${res.status}: ${data.error && data.error.message}`);
  const first = data.sheets.find((s) => s.properties.sheetId === 0) || data.sheets[0];
  return first.properties.title;
}

/** Parse raw A4:K rows into member objects (row = 1-based sheet row). */
export function parseMembers(rows) {
  const cell = (r, i) => String(r[i] === undefined || r[i] === null ? '' : r[i]).trim();
  return rows
    .map((r, i) => ({
      row: START_ROW + i,
      rank: cell(r, 1),
      name: cell(r, 2),
      discord: cell(r, 4),
      status: cell(r, 5).toUpperCase(),
      owed: cell(r, 6).toUpperCase() === 'TRUE',
      paid: cell(r, 7).toUpperCase() === 'TRUE',
      lastActive: cell(r, 9),
      hours: Number(cell(r, 10)) || 0,
    }))
    .filter((m) => m.name);
}

/** Read + parse the roster. Returns { tab, members }. */
export async function readRoster(env, token) {
  const tab = await getRosterTab(token, env);
  const rows = await readValues(token, env.CLOCKIN_SHEET_ID, `'${tab}'!A${START_ROW}:K`);
  return { tab, members: parseMembers(rows) };
}

/** Find the member whose Discord cell contains this username, or null. */
export function matchMember(members, username) {
  const u = normalizeUsername(username);
  if (!u) return null;
  return members.find((m) => handleParts(m.discord).includes(u)) || null;
}
