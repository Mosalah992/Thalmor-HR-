# stock-adjust

## Purpose

Resolve a typed item name to a row in the Smithing tab of the Armory Google Sheet, adjust or
report its Qty safely, and reply with the item's old → new count. Writes are confined to Qty
cells of recognized item rows.

## Requirements

### Requirement: Ledger rows are parsed structurally from the Smithing tab
The system SHALL read columns A:B of the configured Smithing tab and identify item rows,
excluding empty rows, the title/quartermaster block, section headers, `Item` column-header rows,
and totals rows (column A matching `/TOTAL/i`; a totals row also closes its section). Row
numbers from this read SHALL be used directly as write targets so items added or moved by hand —
including entirely new sections — are handled without code changes.

#### Scenario: Item added to the sheet manually
- **WHEN** the quartermaster adds a new row "Elven Shield | 0" under WEAPONS SMITHED and then runs `/add 1 elven shield`
- **THEN** the new row is found and its Qty becomes 1

#### Scenario: Totals row is never a match candidate
- **WHEN** a user types an item name resembling "armor total"
- **THEN** the totals row is neither matched nor suggested, and no write occurs to it

### Requirement: Item names resolve by exact match or fail with suggestions
Item lookup SHALL be case- and surrounding-whitespace-insensitive. If no exact match exists, the
system MUST NOT write; it SHALL reply with up to 5 closest item names (substring/token-overlap
ranking) so the user can retry.

#### Scenario: Exact match, different case
- **WHEN** the user runs `/add 1 thalmor boots`
- **THEN** the row "Thalmor Boots" is matched and updated

#### Scenario: Ambiguous or unknown name
- **WHEN** the user runs `/add 1 thalmor armor` and no row is named exactly "Thalmor Armor"
- **THEN** nothing is written and the reply lists close matches (e.g. "Thalmor Black Armor", "Thalmor Gilded Armor")

### Requirement: /add and /remove adjust Qty and report old → new
`/add qty item` SHALL increase and `/remove qty item` decrease the matched row's Qty (column B)
by the given positive integer, writing only that single cell. `/remove` SHALL floor the result
at 0 and say so when it clamps. The confirmation SHALL show the item's canonical name and
`old → new` counts.

#### Scenario: Add stock
- **WHEN** Qty of "Thalmor Helmets" is 6 and the user runs `/add 2 thalmor helmets`
- **THEN** cell B of that row becomes 8 and the reply reads "Thalmor Helmets: 6 → 8"

#### Scenario: Remove below zero clamps
- **WHEN** Qty of "Elven Bow" is 1 and the user runs `/remove 3 elven bow`
- **THEN** the cell becomes 0 and the reply notes only 1 was in stock

### Requirement: /set corrects Qty to an exact value
`/set qty item` SHALL overwrite the matched row's Qty with the given non-negative integer,
reporting `old → new`. Setting the current value SHALL be a no-op that says so.

#### Scenario: Correcting a miscount
- **WHEN** Qty of "Elven Sword" is 3 and the user runs `/set 1 elven sword`
- **THEN** cell B of that row becomes 1 and the reply reads "Elven Sword: 3 → 1"

### Requirement: /stock reports without writing
`/stock item` SHALL reply with the item's current Qty (and storage location when present);
`/stock` with no item SHALL summarize each section (item count and total quantity). Neither form
performs any write.

#### Scenario: Whole-ledger summary
- **WHEN** the user runs `/stock` with no item
- **THEN** the reply lists each section (e.g. ARMOR SMITHED, WEAPONS SMITHED) with its item and quantity totals, and the sheet is unchanged

### Requirement: Item option autocompletes from the live sheet
The `item` option on the ledger commands SHALL offer autocomplete choices filtered from the
current item list, using a cached read (TTL ≤ 60 s) to stay within the synchronous autocomplete
deadline. Autocomplete failures SHALL degrade to no suggestions, never to an error the user sees.

#### Scenario: Typing a partial name
- **WHEN** the user has typed "glass" in the item field
- **THEN** the choices shown include the Thalmor Glass items from the sheet (max 25, Discord's limit)

### Requirement: Writes are confined to Qty cells of matched item rows
The system SHALL only ever write single Qty cells (column B) of item rows it matched in the
configured Smithing tab. Headers, section titles, totals rows, columns other than B, other tabs,
and other spreadsheets MUST never be written.

#### Scenario: Every command path
- **WHEN** any command completes, succeeds or fails
- **THEN** the only possible sheet mutation is one Qty cell of one matched item row
