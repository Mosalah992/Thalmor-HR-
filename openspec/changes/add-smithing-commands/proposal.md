# Proposal: add-smithing-commands

## Why

The quartermaster tracks smithed armor and weapons in the **Smithing** tab of the Armory Google Sheet (`1McJOIBKWVdOF2L6UDIuR4Z74mDH_Eo8b2e3JLT0OqWg`), but every stock change means opening the sheet, finding the item row, and editing the Qty cell by hand — usually while playing, from Discord. A CLI-style slash command (`/add qty:1 item:thalmor boots`) lets the quartermaster log production and issuance without leaving Discord. A prior slash-command attempt (commit `627b004`, reverted) already proved the zero-hosting approach works; this change reuses that foundation for a much simpler write path.

## What Changes

- Restore the **Cloudflare Worker** interactions endpoint and the guild command **registration script** from reverted commit `627b004` (Ed25519 request verification, guild-scoped registration), stripped of the old `/scan` `/sync` workflow-dispatch logic.
- Add three new slash commands, usable in any channel the bot can see (no channel IDs, no server-admin steps):
  - `/add qty item` — increase an item's Qty in the Smithing tab (e.g. `/add 1 thalmor armor`).
  - `/remove qty item` — decrease an item's Qty, floored at 0.
  - `/set qty item` — correct an item's Qty to an exact number (0 allowed).
  - `/stock [item]` — show one item's current Qty, or a summary of all sections.
- The `item` option **autocompletes** from the live item list in the Smithing tab; on a non-exact match the bot suggests the closest item names instead of guessing.
- The Worker authenticates to Google Sheets directly with the existing `ancarion@thalmor` **service account** via a WebCrypto-signed JWT (no npm dependencies, mirrors `src/sheets.js`).
- Command use is restricted to the **quartermaster's Discord user ID** (allowlist in Worker config); everyone else gets an ephemeral refusal.
- Only Qty cells (column B) of item rows in the Smithing tab are ever written; headers, section titles, totals rows, other tabs (Armory Dossier, Materials Register), and the clock-in roster sheet are never touched.

## Capabilities

### New Capabilities

- `slash-command-gateway`: Receive Discord interactions on a Cloudflare Worker — Ed25519 signature verification, command routing, quartermaster-only authorization, guild-scoped command registration.
- `stock-adjust`: Resolve a typed item name to a Smithing-tab row (exact, case-insensitive, and fuzzy suggestion), adjust or report its Qty safely, and reply with the item's old → new count.

### Modified Capabilities

_None — the existing clock-in sync capabilities (`clockin-scan`, `roster-sync`, `daily-schedule`) are unaffected._

## Impact

- **New code**: `worker/` (Cloudflare Worker: interactions endpoint, Sheets client via WebCrypto), `scripts/register-commands.js` (one-shot guild command registration). Existing `src/` sync code untouched.
- **External systems**:
  - Discord: same bot application; commands registered guild-scoped with the existing bot token. Interactions Endpoint URL must be set once in the Discord developer portal (app owner action).
  - Google Sheets: the Armory sheet is already shared with `ancarion@thalmor.iam.gserviceaccount.com` as Editor (verified). Service-account key added as a Worker secret.
  - Cloudflare: one Worker on the user's existing account, free tier.
- **Operations**: no scheduled jobs, no always-on process; the Worker runs only when a command is invoked.
