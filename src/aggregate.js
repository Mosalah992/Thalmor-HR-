// Per-author aggregation of clock-in messages — pure functions, unit-tested.

/**
 * Fold message pages into per-username { lastMs, count }.
 * Bots and webhook messages never count.
 * @param {Iterable<object>} messages  Discord message objects
 * @returns {Map<string, {lastMs: number, count: number}>}
 */
function aggregate(messages) {
  const byUser = new Map();
  for (const m of messages) {
    if (!m || !m.author || m.author.bot || m.webhook_id) continue;
    const user = m.author.username.toLowerCase();
    const ms = Date.parse(m.timestamp);
    if (Number.isNaN(ms)) continue;
    const cur = byUser.get(user);
    if (cur) {
      cur.count += 1;
      if (ms > cur.lastMs) cur.lastMs = ms;
    } else {
      byUser.set(user, { lastMs: ms, count: 1 });
    }
  }
  return byUser;
}

/** Format a unix-ms timestamp as "YYYY-MM-DD HH:mm" in UTC. */
function formatUtc(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Parse a sheet "YYYY-MM-DD HH:mm" cell (assumed UTC) back to unix ms, or null. */
function parseSheetTimestamp(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(text || '').trim());
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

module.exports = { aggregate, formatUtc, parseSheetTimestamp };
