// Handle normalization and roster matching — pure functions, unit-tested.

/**
 * Normalize one roster Discord-cell into its handle parts.
 * "@roselord / slimely" -> ["roselord", "slimely"]; trailing dots are kept
 * (they are legal in Discord usernames).
 */
function handleParts(cell) {
  if (!cell) return [];
  return cell
    .split('/')
    .map((p) => p.trim().replace(/^@+/, '').toLowerCase())
    .filter((p) => p.length > 0);
}

/** Normalize a Discord username for lookup. */
function normalizeUsername(username) {
  return String(username || '').trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Build a lookup of normalized handle -> sheet row number.
 * @param {string[]} cells  column E values, cells[0] is sheet row `startRow`
 * @returns {{ map: Map<string, number>, duplicates: string[] }}
 */
function buildRosterMap(cells, startRow = 4) {
  const map = new Map();
  const duplicates = [];
  cells.forEach((cell, i) => {
    for (const part of handleParts(cell)) {
      if (map.has(part)) duplicates.push(part);
      else map.set(part, startRow + i);
    }
  });
  return { map, duplicates };
}

/** Resolve a username to a sheet row, or null. */
function matchUser(map, username) {
  const row = map.get(normalizeUsername(username));
  return row === undefined ? null : row;
}

module.exports = { handleParts, normalizeUsername, buildRosterMap, matchUser };
