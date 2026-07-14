// One-time roster-sheet migration for weekly hours tracking (safe to re-run):
//   1. K3 header "Total Clock-ins" -> "Total Hours"
//   2. K4:K zeroed (old lifetime clock-in counts are meaningless as hours)
//   3. Conditional format: K cells turn green at >= 8 hours
//   4. Ledger tab: missing "# Actives" COUNTIFS formulas (High Justiciar,
//      Justiciar, Recruit) so every tier auto-counts Owed checkboxes
// Usage: node scripts/setup-sheet.js [--dry-run]
const { required } = require('../src/env');
const { getAccessToken } = require('../src/sheets');

const SHEET_ID = '1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0';
const ROSTER_GID = 0;
const HOURS_HEADER = 'Total Hours';
const GOAL_HOURS = 8;

// Ledger rows whose "# Actives" (col C) lacks a COUNTIFS formula, and the
// exact roster ranks each should count (mirrors the existing formulas).
const MISSING_COUNTIFS = [
  { cell: 'C6', ranks: ['High Justiciar'] },
  { cell: 'C7', ranks: ['Justiciar'] },
  { cell: 'C13', ranks: ['Recruit'] },
];
const countifs = (ranks) => ranks
  .map((r) => `COUNTIFS(Roster!G4:G150,"TRUE",Roster!B4:B150,"${r}")`)
  .join(' + ');

async function api(token, method, path, body) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets ${method} ${path.split('?')[0]} -> ${res.status}: ${data.error && data.error.message}`);
  return data;
}

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const token = await getAccessToken(required('GOOGLE_APPLICATION_CREDENTIALS'));

  const meta = await api(token, 'GET', '?fields=sheets(properties(sheetId,title),conditionalFormats)');
  const roster = meta.sheets.find((s) => s.properties.sheetId === ROSTER_GID);
  const tab = roster.properties.title;

  // Current K column state
  const kVals = await api(token, 'GET', `/values/${encodeURIComponent(`'${tab}'!C4:K`)}`);
  const rows = kVals.values || [];
  const valueWrites = [{ range: `'${tab}'!K3`, values: [[HOURS_HEADER]] }];
  rows.forEach((r, i) => {
    const name = String(r[0] || '').trim();
    const k = String(r[8] === undefined ? '' : r[8]).trim();
    if (name && k !== '0') valueWrites.push({ range: `'${tab}'!K${4 + i}`, values: [[0]] });
  });
  for (const { cell, ranks } of MISSING_COUNTIFS) {
    valueWrites.push({ range: `'Ledger'!${cell}`, values: [[`=${countifs(ranks)}`]] });
  }

  // Green-at-8h conditional format on K4:K — skip if an equivalent rule exists
  const hasRule = (roster.conditionalFormats || []).some((cf) =>
    (cf.ranges || []).some((r) => r.startColumnIndex === 10) &&
    cf.booleanRule && cf.booleanRule.condition &&
    cf.booleanRule.condition.type === 'NUMBER_GREATER_THAN_EQ' &&
    (cf.booleanRule.condition.values || []).some((v) => v.userEnteredValue === String(GOAL_HOURS)));

  console.log(`${dryRun ? '[dry-run] ' : ''}${valueWrites.length} cell writes:`);
  for (const w of valueWrites) console.log(`  ${w.range} = ${JSON.stringify(w.values[0][0])}`);
  console.log(`Conditional green >=${GOAL_HOURS}h rule on K: ${hasRule ? 'already present' : 'will add'}`);
  if (dryRun) return;

  await api(token, 'POST', '/values:batchUpdate', {
    valueInputOption: 'USER_ENTERED', // formulas must parse; 0s stay numbers
    data: valueWrites,
  });

  if (!hasRule) {
    await api(token, 'POST', ':batchUpdate', {
      requests: [{
        addConditionalFormatRule: {
          index: 0,
          rule: {
            ranges: [{
              sheetId: ROSTER_GID,
              startRowIndex: 3, // K4 downward
              startColumnIndex: 10,
              endColumnIndex: 11,
            }],
            booleanRule: {
              condition: { type: 'NUMBER_GREATER_THAN_EQ', values: [{ userEnteredValue: String(GOAL_HOURS) }] },
              format: {
                backgroundColor: { red: 0.72, green: 0.88, blue: 0.8 }, // sheets green
                textFormat: { bold: true },
              },
            },
          },
        },
      }],
    });
  }
  console.log('Done.');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
