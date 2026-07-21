// /clockin and /clockout — weekly duty-hours tracking.
// Open shifts live in KV (`shift:<discordUserId>`), hours accumulate in
// roster column K, Last Active (J) is stamped on both commands. Owed (G) is
// only written on Mondays (08:30 UTC clear, 09:00 UTC / 3 AM CST close-out
// marks members at WEEKLY_GOAL_HOURS+) — never mid-week, so the
// hand-maintained Ledger tab sees a stable owed count all week. A shift still
// open at the Monday reset keeps running — it is not discarded. The sheet's
// own COUNTIFS formulas compute # Actives and Totals from column G.
// The Ledger tab is maintained by hand — the bot never writes to it.

import { getAccessToken, batchWriteValues } from './gsheets.js';
import { readRoster, matchMember, COL } from './roster.js';
import { CLOCK_IN_QUOTES, PRAISE_QUOTES, randomQuote } from './quotes.js';
import { log } from './log.js';

export const WEEKLY_GOAL_HOURS = 8;
const SHIFT_PREFIX = 'shift:';
const MAX_SHIFT_HOURS = 24;
const LONG_SHIFT_HOURS = 12;
const MAX_BACKDATE_DAYS = 7;
const FUTURE_SLACK_MS = 5 * 60 * 1000;

/**
 * Parse the `time` option: a hammertime tag (`<t:1752345678:t>`, any style),
 * or bare unix seconds/milliseconds. Returns unix ms, or null if unparseable.
 */
export function parseTimeOption(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const tag = /^<t:(\d{1,17})(?::[tTdDfFR])?>$/.exec(s);
  const digits = tag ? tag[1] : (/^\d{1,17}$/.test(s) ? s : null);
  if (!digits) return null;
  const n = Number(digits);
  return digits.length >= 12 ? n : n * 1000; // 12+ digits: already milliseconds
}

/** Format a unix-ms timestamp as "YYYY-MM-DD HH:mm" in UTC (sheet format). */
export function formatUtc(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Parse a sheet "YYYY-MM-DD HH:mm" cell (UTC) back to unix ms, or null. */
export function parseSheetTimestamp(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(text || '').trim());
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

/** Round for the sheet: 2 decimals. */
export const roundHours = (h) => Math.round(h * 100) / 100;
/** Round for chat: 1 decimal, no trailing ".0". */
export const fmtHours = (h) => `${Math.round(h * 10) / 10}h`;

const hammertime = (ms) => `<t:${Math.floor(ms / 1000)}:f>`;

/**
 * Resolve the effective instant of a clock command.
 * Returns { ms } or { error } for unparseable / unreasonable times.
 */
export function effectiveTime(raw, nowMs) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { ms: nowMs };
  const ms = parseTimeOption(raw);
  if (ms === null) {
    return { error: 'Could not read that time. Use a hammertime tag like `<t:1752480000:t>` (hammertime.cyou) or plain unix seconds — or omit it to use right now.' };
  }
  if (ms > nowMs + FUTURE_SLACK_MS) return { error: `That time is in the future (${hammertime(ms)}). The Dominion records deeds, not intentions.` };
  if (ms < nowMs - MAX_BACKDATE_DAYS * 24 * 3600 * 1000) return { error: `That time is more than ${MAX_BACKDATE_DAYS} days ago — too far back for this week's records.` };
  return { ms };
}

const shiftKey = (userId) => `${SHIFT_PREFIX}${userId}`;

export async function runClockIn(env, interaction, userId, username) {
  const now = Date.now();
  const t = effectiveTime(optionValue(interaction, 'time'), now);
  if (t.error) return t.error;

  const token = await getAccessToken(env);
  const { tab, members } = await readRoster(env, token);
  const member = matchMember(members, username);
  if (!member) return `**@${username}** is not on the roster (Discord column). Report to an officer to be enrolled before clocking in.`;

  const existing = await env.STATE.get(shiftKey(userId), 'json');
  if (existing) {
    return `${member.name}, you are already clocked in since ${hammertime(existing.startMs)}. Close it with \`/clockout\` (add a backdated \`time\` if you forgot).`;
  }

  await env.STATE.put(shiftKey(userId), JSON.stringify({ username, startMs: t.ms }));

  const updates = lastActiveUpdate(tab, member, t.ms);
  await batchWriteValues(token, env.CLOCKIN_SHEET_ID, updates);

  log('clockin.ok', { user: username, row: member.row, startMs: t.ms });
  return `**${member.name}** clocked in — ${hammertime(t.ms)}. Serve well; the Dominion is watching.`;
}

export async function runClockOut(env, interaction, userId, username) {
  const now = Date.now();
  const t = effectiveTime(optionValue(interaction, 'time'), now);
  if (t.error) return t.error;

  const shift = await env.STATE.get(shiftKey(userId), 'json');
  if (!shift) {
    return `${randomQuote(CLOCK_IN_QUOTES)}\n**@${username}**, no open shift found. Clock in first with \`/clockin\`.`;
  }

  const hours = (t.ms - shift.startMs) / 3600000;
  if (hours <= 0) {
    return `That clock-out (${hammertime(t.ms)}) is before your clock-in (${hammertime(shift.startMs)}). Give a later \`time\`.`;
  }
  if (hours > MAX_SHIFT_HOURS) {
    return `That shift would be ${fmtHours(hours)} — longer than ${MAX_SHIFT_HOURS}h. If you forgot to clock out, run \`/clockout\` again with a backdated \`time\` (hammertime tag).`;
  }

  const token = await getAccessToken(env);
  const { tab, members } = await readRoster(env, token);
  const member = matchMember(members, username);
  if (!member) return `**@${username}** is not on the roster (Discord column). Report to an officer — your shift is still held open.`;

  const newTotal = roundHours(member.hours + hours);
  const goalReached = newTotal >= WEEKLY_GOAL_HOURS;

  const updates = [
    { range: `'${tab}'!${COL.HOURS}${member.row}`, values: [[newTotal]] },
    ...lastActiveUpdate(tab, member, t.ms),
  ];
  await batchWriteValues(token, env.CLOCKIN_SHEET_ID, updates);

  await env.STATE.delete(shiftKey(userId));
  log('clockout.ok', { user: username, row: member.row, shiftHours: roundHours(hours), weekTotal: newTotal, goalReached });

  const lines = [
    `**${member.name}** clocked out — ${fmtHours(hours)} this shift, **${fmtHours(newTotal)}** this week.`,
  ];
  if (goalReached) lines.push(`${WEEKLY_GOAL_HOURS}h reached — you will be marked **Owed** at Monday's close-out. The Dominion rewards diligence.`);
  else lines.push(`${fmtHours(Math.max(0, WEEKLY_GOAL_HOURS - newTotal))} to go for this week's pay.`);
  if (hours >= LONG_SHIFT_HOURS) lines.push(randomQuote(PRAISE_QUOTES));
  return lines.join('\n');
}

/** Monotonic Last Active (J) update — empty when the sheet value is newer. */
function lastActiveUpdate(tab, member, ms) {
  const existing = parseSheetTimestamp(member.lastActive);
  if (existing !== null && existing >= ms) return [];
  return [{ range: `'${tab}'!${COL.LAST_ACTIVE}${member.row}`, values: [[formatUtc(ms)]] }];
}

/** List all open shifts: [{ userId, username, startMs }]. */
export async function listOpenShifts(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.STATE.list({ prefix: SHIFT_PREFIX, cursor });
    for (const k of page.keys) {
      const v = await env.STATE.get(k.name, 'json');
      if (v) out.push({ userId: k.name.slice(SHIFT_PREFIX.length), ...v });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

export async function deleteOpenShifts(env, shifts) {
  for (const s of shifts) await env.STATE.delete(shiftKey(s.userId));
}

const optionValue = (interaction, name) => {
  const opt = (interaction.data.options || []).find((o) => o.name === name);
  return opt ? opt.value : undefined;
};
