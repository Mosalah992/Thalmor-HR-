// Sunday weekly cycle. Owed (G) is written ONLY here, never mid-week, so the
// hand-maintained Ledger tab sees a stable owed count all week.
//   17:30 UTC — clear last week's Owed marks (all G unchecked).
//   18:00 UTC — close-out: post the hours leaderboard to #clock-in, snapshot
//   hours in KV for next week's "climber" delta, then roll the week — Owed (G)
//   checked for members at WEEKLY_GOAL_HOURS+, Total Hours (K) to 0, Paid (H)
//   unchecked, and any still-open shifts discarded (named in the post).
// The Ledger tab is maintained by hand — never written.

import { getAccessToken, batchWriteValues } from './gsheets.js';
import { readRoster, COL } from './roster.js';
import { fmtHours, listOpenShifts, deleteOpenShifts, WEEKLY_GOAL_HOURS } from './clock.js';
import { log } from './log.js';

const SNAPSHOT_KEY = 'leaderboard:snapshot';

const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.'];

const FOOTERS = [
  'The rest of you have been noted. Lady Celeriel has opened a new spreadsheet.',
  'Everyone below fifth place has been entered into the ledger under "aspirational."',
  'The Eye of the Dominion has reviewed the remaining entries. It was not impressed.',
  'All others are encouraged to reflect, improve, and report to muster.',
];

export function buildLeaderboard(members, prev, now, openShifts = []) {
  const ranked = members
    .filter((m) => m.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);
  const owedCount = members.filter((m) => m.hours >= WEEKLY_GOAL_HOURS).length;

  const date = new Date(now).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  const lines = [
    `☀️🏆 **DOMINION ATTENDANCE HONORS — Week of ${date}**`,
    '',
    '**The Exemplars:**',
    ...(ranked.length
      ? ranked.map((m, i) => `${MEDALS[i]} ${m.name} — ${fmtHours(m.hours)}`)
      : ['No hours were logged this week. The Dominion trusts this will not repeat.']),
  ];

  if (prev) {
    let climber = null;
    for (const m of members) {
      const delta = m.hours - (prev[m.name] || 0);
      if (delta > 0 && (!climber || delta > climber.delta)) climber = { name: m.name, delta };
    }
    if (climber) {
      lines.push('', `📈 **Climber of the week:** ${climber.name} (+${fmtHours(climber.delta)})`);
    }
  }

  lines.push('', `💰 ${owedCount} member(s) reached ${WEEKLY_GOAL_HOURS}h and are marked **Owed** for this week's pay.`);

  if (openShifts.length) {
    const names = openShifts.map((s) => s.username).join(', ');
    lines.push(`⏳ Open shifts discarded (clocked in, never out): ${names}. Close your shifts, agents.`);
  }

  lines.push('', `📋 ${FOOTERS[Math.floor(now / (7 * 24 * 60 * 60 * 1000)) % FOOTERS.length]}`);
  lines.push('_Hours now reset for the new week; the **Owed** column shows who earned this week\'s pay. Clock in with `/clockin`._');
  return lines.join('\n');
}

/** 17:30 writes: uncheck Owed for every member row (last week's pay cycle over). */
export function owedClearWrites(tab, members) {
  return members.map((m) => ({ range: `'${tab}'!${COL.OWED}${m.row}`, values: [[false]] }));
}

/** 18:00 reset writes: Owed checked at goal hours+, hours 0, Paid unchecked. */
export function resetWrites(tab, members) {
  const data = [];
  for (const m of members) {
    data.push({ range: `'${tab}'!${COL.HOURS}${m.row}`, values: [[0]] });
    data.push({ range: `'${tab}'!${COL.OWED}${m.row}`, values: [[m.hours >= WEEKLY_GOAL_HOURS]] });
    data.push({ range: `'${tab}'!${COL.PAID}${m.row}`, values: [[false]] });
  }
  return data;
}

/** Sunday 17:30 UTC cron: clear all Owed marks ahead of the 18:00 close-out. */
export async function runOwedClear(env) {
  const token = await getAccessToken(env);
  const { tab, members } = await readRoster(env, token);
  const owedBefore = members.filter((m) => m.owed).length;
  const result = await batchWriteValues(token, env.CLOCKIN_SHEET_ID, owedClearWrites(tab, members));
  log('weekly.owedclear.done', {
    members: members.length,
    owedBefore,
    cells: result.totalUpdatedCells || 0,
  });
}

export async function runWeeklyCloseout(env, now) {
  const token = await getAccessToken(env);
  const { tab, members } = await readRoster(env, token);
  const prev = await env.STATE.get(SNAPSHOT_KEY, 'json');
  const openShifts = await listOpenShifts(env);

  const content = buildLeaderboard(members, prev, now, openShifts);
  const res = await fetch(`https://discord.com/api/v10/channels/${env.CLOCKIN_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Discord post ${res.status}: ${(await res.text()).slice(0, 200)}`);

  await env.STATE.put(SNAPSHOT_KEY, JSON.stringify(
    Object.fromEntries(members.map((m) => [m.name, m.hours])),
  ));

  const writes = resetWrites(tab, members);
  const result = await batchWriteValues(token, env.CLOCKIN_SHEET_ID, writes);
  await deleteOpenShifts(env, openShifts);
  log('weekly.reset.done', {
    members: members.length,
    cells: result.totalUpdatedCells || 0,
    openShiftsDiscarded: openShifts.length,
  });
  return content;
}
