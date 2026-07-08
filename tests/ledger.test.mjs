import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLedger, findItem, rankMatches } from '../worker/src/ledger.js';

// Mirrors the real Smithing tab layout (sheet rows = index + 1).
const FIXTURE = [
  ['THALMOR EMBASSY — SMITHING & PRODUCTION LOG'],                    // 1
  ['Quartermaster: Ancarion Saelthar  ·  All figures cumulative'],    // 2
  [],                                                                 // 3
  ['  ARMOR SMITHED'],                                                // 4
  ['Item', 'Qty', 'Storage Location', 'Notes'],                       // 5
  ['UnHooded Thalmor Robes', '3', 'Armory Chest'],                    // 6
  ['Thalmor Gilded Armor', '0', 'Armory Chest', 'High Justiciar'],    // 7
  ['Thalmor Black Armor', '4', 'Armory Chest'],                       // 8
  ['Thalmor Boots', '2', 'Armory Chest'],                             // 9
  ['Thalmor Helmets', '6', 'Armory Chest'],                           // 10
  ['Thalmor Glass Gauntlets', '0'],                                   // 11
  [],                                                                 // 12
  ['ARMOR TOTAL', '15'],                                              // 13
  [],                                                                 // 14
  ['  WEAPONS SMITHED'],                                              // 15
  ['Item', 'Qty', 'Storage Location', 'Notes'],                       // 16
  ['Elven Bow', '1', 'Armory Chest'],                                 // 17
  ['Elven Sword', '3', 'Armory Chest'],                               // 18
  ['Elven Shield', '0'],                                              // 19 (hand-added row)
  ['WEAPONS TOTAL', '4'],                                             // 20
  [],                                                                 // 21
  ['Officer & Quartermaster — Ancarion Saelthar  ·  updated'],        // 22 (footer)
];

test('parses only item rows, with correct sheet row numbers and sections', () => {
  const items = parseLedger(FIXTURE);
  assert.deepEqual(
    items.map((i) => i.item),
    ['UnHooded Thalmor Robes', 'Thalmor Gilded Armor', 'Thalmor Black Armor',
     'Thalmor Boots', 'Thalmor Helmets', 'Thalmor Glass Gauntlets',
     'Elven Bow', 'Elven Sword', 'Elven Shield'],
  );
  const boots = findItem(items, 'thalmor boots');
  assert.equal(boots.row, 9);
  assert.equal(boots.qty, 2);
  assert.equal(boots.location, 'Armory Chest');
  assert.equal(boots.section, 'ARMOR SMITHED');
  assert.equal(findItem(items, 'elven bow').section, 'WEAPONS SMITHED');
});

test('title, headers, totals, and footer are never items', () => {
  const items = parseLedger(FIXTURE);
  for (const bogus of ['Item', 'ARMOR TOTAL', 'WEAPONS TOTAL',
    'THALMOR EMBASSY — SMITHING & PRODUCTION LOG',
    'Officer & Quartermaster — Ancarion Saelthar  ·  updated']) {
    assert.equal(findItem(items, bogus), null, `${bogus} must not be an item`);
  }
});

test('totals row is neither matched nor suggested for "armor total"', () => {
  const items = parseLedger(FIXTURE);
  assert.equal(findItem(items, 'armor total'), null);
  const suggested = rankMatches(items, 'armor total').map((i) => i.item);
  assert.ok(!suggested.some((n) => /TOTAL/i.test(n)));
});

test('hand-added row is found and updatable at its real row', () => {
  const items = parseLedger(FIXTURE);
  const shield = findItem(items, 'Elven Shield');
  assert.equal(shield.row, 19);
  assert.equal(shield.qty, 0);
});

test('exact match is case- and whitespace-insensitive', () => {
  const items = parseLedger(FIXTURE);
  assert.equal(findItem(items, '  THALMOR   black ARMOR ').row, 8);
});

test('unknown name yields close suggestions, never a write target', () => {
  const items = parseLedger(FIXTURE);
  assert.equal(findItem(items, 'thalmor armor'), null); // no plain "Thalmor Armor" row
  const names = rankMatches(items, 'thalmor armor').map((i) => i.item);
  assert.ok(names.includes('Thalmor Gilded Armor'));
  assert.ok(names.includes('Thalmor Black Armor'));
  assert.ok(names.length <= 5);
});

test('empty query ranks everything (autocomplete initial view)', () => {
  const items = parseLedger(FIXTURE);
  assert.equal(rankMatches(items, '', 25).length, items.length);
});

test('blank qty parses as 0', () => {
  const rows = [...FIXTURE.slice(0, 5), ['New Thing', '', 'Chest'], ...FIXTURE.slice(5)];
  const items = parseLedger(rows);
  assert.equal(findItem(items, 'new thing').qty, 0);
});
