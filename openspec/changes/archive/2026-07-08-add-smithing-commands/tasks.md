# Tasks: add-smithing-commands

## 1. Restore worker scaffolding from reverted commit

- [x] 1.1 `git checkout 627b004 -- worker scripts` and remove GitHub-dispatch code, `/help` `/scan` `/sync` handlers, and `GITHUB_*` config from `worker/src/index.js` + `worker/wrangler.toml` (keep signature verification, PING handling, response helpers)
- [x] 1.2 Update `worker/wrangler.toml`: vars `SHEET_ID`, `SMITHING_TAB` (= `Smithing`), `ALLOWED_USER_IDS`; secret comments for `DISCORD_PUBLIC_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`

## 2. Sheets access from the Worker

- [x] 2.1 Implement `worker/src/gsheets.js`: service-account token exchange using WebCrypto (`importKey` PKCS#8, `RSASSA-PKCS1-v1_5` SHA-256), token cached in module scope until ~5 min before expiry
- [x] 2.2 Add `values.get` (read `A:D` of the Smithing tab) and single-cell `values.update` helpers with error messages that surface the Sheets API error text

## 3. Ledger parsing and matching

- [x] 3.1 Implement `worker/src/ledger.js`: parse rows into `{row, item, qty, location, section}` skipping title block, section headers, `Item` header rows, blank rows, and `/TOTAL/i` rows
- [x] 3.2 Implement matching: exact case/trim-insensitive lookup; fallback ranking (substring + token overlap) returning top 5 suggestions; never match non-item rows
- [x] 3.3 Unit-test parsing and matching with a fixture of the real tab layout (`tests/ledger.test.js`, Node test runner, no deps) — include the "armor total" and hand-added-row scenarios from the spec

## 4. Command handlers

- [x] 4.1 Route interactions: PING→PONG; autocomplete (type 4) → synchronous choices; commands (type 2) → deferred response + `ctx.waitUntil` followup edit
- [x] 4.2 Enforce `ALLOWED_USER_IDS` on every command (ephemeral refusal) and return empty autocomplete choices for others
- [x] 4.3 `/add qty item` and `/remove qty item`: fresh read → match → write single Qty cell → reply `Item: old → new`; `/remove` clamps at 0 and says so; unknown item replies with suggestions and writes nothing
- [x] 4.4 `/stock [item]`: single-item report (qty + storage location) or per-section summary; no writes
- [x] 4.5 Autocomplete for `item`: cached ledger read via `caches.default` (TTL 60 s), filter by typed prefix/substring, max 25 choices, empty list on any failure

## 5. Registration and deployment

- [x] 5.1 Rewrite `scripts/register-commands.js` for `/add` (`qty` integer min 1, `item` string autocomplete), `/remove` (same), `/stock` (`item` optional autocomplete) — no `default_member_permissions` (it would hide the commands from the non-admin quartermaster; the Worker allowlist is the gate)
- [x] 5.2 Deploy: `npx wrangler deploy`, set secrets (`DISCORD_PUBLIC_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`) — requires user's Cloudflare login
- [x] 5.3 User sets Interactions Endpoint URL to the Worker URL in the Discord developer portal (PING validation must pass)
- [x] 5.4 Run `node scripts/register-commands.js`; verify the three commands appear in the guild

## 6. Verify end-to-end and document

- [x] 6.1 `/stock` summary matches the sheet; `/stock thalmor boots` shows current qty
- [x] 6.2 `/add 1` then `/remove 1` on a real item round-trips the Qty cell and the confirmations show correct old → new; totals row formula unaffected
- [ ] 6.3 Non-allowlisted account (or removed ID) gets the ephemeral refusal
- [x] 6.4 Update README.md with a Smithing Commands section (usage, config, deployment)

## 7. Post-verification additions (from user feedback)

- [x] 7.1 `/set qty item` — correct a count to an exact number (0 allowed)
- [x] 7.2 `/help` — ephemeral command list, available to everyone
- [x] 7.3 Structured JSON logging (`worker/src/log.js`, `src/log.js`) across worker interactions and daily sync
- [x] 7.4 Fix: strip UTF-8 BOM before parsing `GOOGLE_SERVICE_ACCOUNT_JSON` (PowerShell pipe added one; secrets now uploaded via bash)
