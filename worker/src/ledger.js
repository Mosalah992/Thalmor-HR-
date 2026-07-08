// Smithing-tab ledger: structural row parsing and item-name matching.
// Pure functions — no I/O — so they are unit-testable from Node.

const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Parse raw A:D rows into item entries. Sheet layout (see design.md):
 * title block, then per section: a title row (e.g. "  ARMOR SMITHED"),
 * an "Item | Qty | Storage Location | Notes" header row, item rows, and a
 * totals row ("ARMOR TOTAL | 41"). Item rows exist only after a header row;
 * totals and structural rows are never items.
 *
 * @param {string[][]} rows  values of A:D, index 0 = sheet row 1
 * @returns {{row:number, item:string, qty:number, location:string, section:string}[]}
 */
export function parseLedger(rows) {
  const items = [];
  let pendingSection = null; // last structural title seen, becomes the section on its header row
  let section = null;        // non-null only after an "Item" header row

  rows.forEach((cells, i) => {
    const a = String(cells[0] ?? '').trim();
    const b = String(cells[1] ?? '').trim();
    if (!a) return;                                   // blank / spacer row

    if (/^item$/i.test(a)) {                          // column-header row opens a section
      section = pendingSection || 'LEDGER';
      return;
    }
    if (/TOTAL/i.test(a)) {                           // totals row closes its section,
      section = null;                                 // so trailing footer text is never an item
      return;
    }
    if (a === a.toUpperCase() && a !== a.toLowerCase()) {
      // all-caps structural row: sheet title or section title ("ARMOR SMITHED")
      pendingSection = a;
      section = null;                                 // leaving the previous section
      return;
    }
    if (!section) return;                             // preamble (Quartermaster line, footer, …)

    items.push({
      row: i + 1,                                     // 1-based sheet row = write target
      item: a,
      qty: Number.parseInt(b, 10) || 0,
      location: String(cells[2] ?? '').trim(),
      section,
    });
  });
  return items;
}

/** Exact match, case- and whitespace-insensitive. Returns the entry or null. */
export function findItem(items, name) {
  const n = norm(name);
  return items.find((it) => norm(it.item) === n) || null;
}

/**
 * Rank items for a query: substring hits first, then token overlap.
 * Used for both autocomplete and "did you mean" suggestions.
 * Returns up to `limit` entries with score > 0 (all items if query is empty).
 */
export function rankMatches(items, query, limit = 5) {
  const q = norm(query);
  if (!q) return items.slice(0, limit);
  const qTokens = q.split(' ');
  return items
    .map((it) => {
      const name = norm(it.item);
      let score = 0;
      if (name.includes(q)) score += 100;
      if (name.startsWith(q)) score += 50;
      const nameTokens = name.split(' ');
      for (const t of qTokens) {
        if (nameTokens.some((nt) => nt === t)) score += 10;
        else if (nameTokens.some((nt) => nt.startsWith(t) || t.startsWith(nt))) score += 4;
      }
      return { it, score };
    })
    .filter((m) => m.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((m) => m.it);
}
