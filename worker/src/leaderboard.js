// Weekly attendance leaderboard — cron (Mondays) reads the clock-in roster
// sheet, posts the top 5 + biggest climber to #clock-in, and snapshots the
// counts in KV so next week's deltas can be computed.

import { getAccessToken } from './gsheets.js';

const SNAPSHOT_KEY = 'leaderboard:snapshot';

/** Title of the first tab of the clock-in sheet (roster lives on gid 0). */
async function getTabTitle(token, sheetId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets meta ${res.status}: ${data.error && data.error.message}`);
  const first = data.sheets.find((s) => s.properties.sheetId === 0) || data.sheets[0];
  return first.properties.title;
}

/** Roster rows → [{ name, status, count }] (row 4 down; C=name, F=status, I=total). */
async function readRoster(env, token) {
  const range = encodeURIComponent(`'${await getTabTitle(token, env.CLOCKIN_SHEET_ID)}'!A4:I`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.CLOCKIN_SHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets read ${res.status}: ${data.error && data.error.message}`);
  return (data.values || [])
    .map((r) => ({
      name: String(r[2] || '').trim(),
      status: String(r[5] || '').trim().toUpperCase(),
      count: Number(r[8]) || 0,
    }))
    .filter((m) => m.name);
}

const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.'];

const FOOTERS = [
  'The rest of you have been noted. Lady Celeriel has opened a new spreadsheet.',
  'Everyone below fifth place has been entered into the ledger under "aspirational."',
  'The Eye of the Dominion has reviewed the remaining entries. It was not impressed.',
  'All others are encouraged to reflect, improve, and report to muster.',
];

export function buildLeaderboard(roster, prev, now) {
  const ranked = [...roster].sort((a, b) => b.count - a.count).slice(0, 5);

  const date = new Date(now).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  const lines = [
    `☀️🏆 **DOMINION ATTENDANCE HONORS — Week of ${date}**`,
    '',
    '**The Exemplars:**',
    ...ranked.map((m, i) => `${MEDALS[i]} ${m.name} — ${m.count} clock-ins`),
  ];

  if (prev) {
    let climber = null;
    for (const m of roster) {
      const delta = m.count - (prev[m.name] || 0);
      if (delta > 0 && (!climber || delta > climber.delta)) climber = { name: m.name, delta };
    }
    if (climber) {
      lines.push('', `📈 **Climber of the week:** ${climber.name} (+${climber.delta})`);
    }
  }

  const week = Math.floor(now / (7 * 24 * 60 * 60 * 1000));
  lines.push('', `📋 ${FOOTERS[week % FOOTERS.length]}`);
  return lines.join('\n');
}

export async function postLeaderboard(env, now) {
  const token = await getAccessToken(env);
  const roster = await readRoster(env, token);
  const prev = await env.STATE.get(SNAPSHOT_KEY, 'json');

  const content = buildLeaderboard(roster, prev, now);
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
    Object.fromEntries(roster.map((m) => [m.name, m.count])),
  ));
  return content;
}
