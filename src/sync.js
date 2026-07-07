// Thalmor Clock-In daily sync: scan -> match -> write -> report.
// Usage: node src/sync.js [--dry-run]
const { required, optional } = require('./env');
const { fetchAllMessages, postMessage } = require('./discord');
const { getAccessToken, getTabTitle, readRoster, batchWrite } = require('./sheets');
const { buildRosterMap, matchUser } = require('./match');
const { aggregate, formatUtc, parseSheetTimestamp } = require('./aggregate');

const TOTALS_HEADER = 'Total Clock-ins';
const START_ROW = 4;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const token = required('DISCORD_TOKEN');
  const channelId = required('CLOCKIN_CHANNEL_ID');
  const sheetId = required('SHEET_ID');
  const keyPath = required('GOOGLE_APPLICATION_CREDENTIALS');
  const logChannelId = optional('LOG_CHANNEL_ID');

  // 1. Scan — complete-scan-or-nothing: any throw here means no writes happen.
  console.log(`Scanning channel ${channelId}...`);
  const messages = await fetchAllMessages(channelId, token);
  const byUser = aggregate(messages);
  console.log(`Scanned ${messages.length} messages from ${byUser.size} distinct users.`);

  // 2. Read roster
  const gToken = await getAccessToken(keyPath);
  const tab = await getTabTitle(gToken, sheetId);
  const roster = await readRoster(gToken, sheetId, tab);
  const { map, duplicates } = buildRosterMap(roster.handles, START_ROW);
  console.log(`Roster: ${roster.handles.filter(Boolean).length} handles on tab "${tab}".`);
  if (duplicates.length) console.warn(`Duplicate roster handles (first row wins): ${duplicates.join(', ')}`);

  // 3. Compute updates
  const perRow = new Map(); // row -> { lastMs, count }
  const unmatched = [];
  for (const [user, agg] of byUser) {
    const row = matchUser(map, user);
    if (row === null) {
      unmatched.push({ user, ...agg });
      continue;
    }
    const cur = perRow.get(row);
    if (cur) {
      // multi-handle cell: two usernames share one roster row
      cur.lastMs = Math.max(cur.lastMs, agg.lastMs);
      cur.count += agg.count;
    } else {
      perRow.set(row, { ...agg });
    }
  }

  const updates = [];
  if (roster.totalsHeader !== TOTALS_HEADER) updates.push({ range: 'I3', value: TOTALS_HEADER });

  let advanced = 0;
  let kept = 0;
  for (const [row, { lastMs, count }] of [...perRow].sort((a, b) => a[0] - b[0])) {
    const idx = row - START_ROW;
    const existingMs = parseSheetTimestamp(roster.lastActive[idx]);
    const newer = existingMs === null || lastMs > existingMs;
    if (newer && formatUtc(lastMs) !== (roster.lastActive[idx] || '').trim()) {
      updates.push({ range: `H${row}`, value: formatUtc(lastMs) });
      advanced++;
    } else {
      kept++;
    }
    if (String(count) !== (roster.totals[idx] || '').trim()) {
      updates.push({ range: `I${row}`, value: count });
    }
  }

  // 4. Write
  if (dryRun) {
    console.log(`\n[dry-run] ${updates.length} cell updates that WOULD be written:`);
    for (const u of updates) console.log(`  ${u.range} = ${u.value}`);
  } else {
    const result = await batchWrite(gToken, sheetId, tab, updates);
    console.log(`Wrote ${result.totalUpdatedCells || 0} cells.`);
  }

  // 5. Report
  unmatched.sort((a, b) => b.lastMs - a.lastMs);
  const lines = [
    `**Thalmor Clock-In sync** (${formatUtc(Date.now())} UTC${dryRun ? ', dry-run' : ''})`,
    `Messages scanned: ${messages.length} | users: ${byUser.size} | roster rows updated: ${perRow.size} (last-active advanced: ${advanced}, unchanged: ${kept})`,
  ];
  if (unmatched.length) {
    lines.push(`⚠️ ${unmatched.length} clock-in user(s) not on the roster:`);
    for (const u of unmatched.slice(0, 25)) lines.push(`  • ${u.user} — ${u.count} msg(s), last ${formatUtc(u.lastMs)} UTC`);
    if (unmatched.length > 25) lines.push(`  …and ${unmatched.length - 25} more`);
  } else {
    lines.push('All clock-in users matched the roster. ✅');
  }
  const summary = lines.join('\n');
  console.log(`\n${summary}`);
  if (logChannelId && !dryRun) {
    try {
      await postMessage(logChannelId, token, summary);
    } catch (e) {
      console.warn(`Could not post summary to log channel: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(`SYNC FAILED — no cells were modified beyond any completed batch.\n${e.stack || e.message}`);
  process.exit(1);
});
