# Design: add-smithing-commands

## Context

The Smithing tab of the Armory sheet is a sectioned ledger: a title block (rows 1–2), then
sections ("  ARMOR SMITHED", "  WEAPONS SMITHED"), each with an `Item | Qty | Storage Location | Notes`
header row, item rows, and a totals row (e.g. `ARMOR TOTAL | 41`). Qty lives in column B.
The sheet is a native Google Sheet owned by the user and is already shared with
`ancarion@thalmor.iam.gserviceaccount.com` (Editor) — verified by API read.

Reverted commit `627b004` contains a working Cloudflare Worker interactions endpoint
(Ed25519 verification via WebCrypto, `crypto.subtle` `Ed25519` key import) and an idempotent
guild command registration script (`PUT .../guilds/{gid}/commands` with the bot token).
Both are recoverable with `git checkout 627b004 -- worker scripts` and need only their
GitHub-workflow-dispatch parts removed.

Constraints:

- The user has **no Discord server admin rights** (can edit roles only). Nothing in this design
  may require channel IDs, channel permissions, or server settings. Guild command registration
  uses only the bot token + app ID (`applications.commands` scope already granted — proven by
  `627b004`).
- Discord requires an interaction response **within 3 seconds**; autocomplete responses must be
  synchronous.
- The repo convention is **zero npm dependencies**; the Worker must use only Web APIs.

## Goals / Non-Goals

**Goals:**

- `/add`, `/remove`, `/stock` slash commands that adjust/report Qty in the Smithing tab.
- Item-name autocomplete sourced from the live sheet.
- Quartermaster-only use, enforced server-side in the Worker (not just Discord UI permissions).
- Never corrupt the ledger: only Qty cells of recognized item rows are written.

**Non-Goals:**

- No changes to the clock-in sync (`src/`, daily workflow).
- No writes to Armory Dossier or Materials Register tabs (read nothing from them either).
- No append-only audit log tab (can be a later change).
- No multi-user role gating (single allowlisted user ID; env var accepts a comma-separated
  list so it can grow without code changes).
- No `/scan` `/sync` restoration — out of scope; only the verification/registration scaffolding
  is reused.

## Decisions

1. **Cloudflare Worker webhook, not a gateway bot.** Interactions arrive over HTTPS; free tier,
   no always-on process, no channel visibility needed. Alternative (always-on `discord.js` bot)
   rejected: hosting cost/hassle, and was the reason the first attempt felt heavy.

2. **Worker talks to Google Sheets directly** (token exchange + `values.get` / `values.update`),
   rather than dispatching a GitHub Actions workflow like the reverted `/sync`. A Qty bump is a
   two-call operation that fits comfortably in the interaction window; Actions dispatch would add
   ~30–60 s latency for no benefit.

3. **Service-account JWT via WebCrypto.** Port `src/sheets.js#getAccessToken` from Node `crypto`
   to `crypto.subtle` (`importKey` PKCS#8 → `RSASSA-PKCS1-v1_5`/SHA-256 → `sign`). The key JSON
   goes in a Worker secret (`GOOGLE_SERVICE_ACCOUNT_JSON`), same as the Actions secret today.
   Cache the access token in isolate global scope until ~5 min before expiry.

4. **Command responses are deferred** (`type 5`, then PATCH the followup via
   `ctx.waitUntil`) so a slow Google round-trip can never hit the 3-second wall.
   **Autocomplete is synchronous** (must be, per Discord) and served from a cached sheet read:
   `caches.default` keyed on the values range, ~60 s TTL. Stale-by-a-minute suggestions are
   acceptable; the actual adjustment always re-reads fresh values.

5. **Ledger parsing by shape, not fixed rows.** Read `A1:B` of the Smithing tab; an *item row* is
   any row whose column A is non-empty and is not a section title (all-caps/leading-spaces
   heuristic isn't needed — concretely: skip rows where column A matches the known non-item set:
   empty, `Item`, `THALMOR EMBASSY…`, `Quartermaster…`, section headers containing `SMITHED`,
   and totals rows matching `/TOTAL/i`). Row indices from this read map 1:1 to sheet rows, so the
   write targets `B<row>` exactly. New items added to the sheet by hand are picked up
   automatically; no hardcoded item list.

6. **Matching: exact (case/whitespace-insensitive) first, else suggest.** If the typed item
   doesn't match exactly, the command does **not** write; it replies with the closest matches
   (simple substring + token-overlap scoring). Autocomplete makes this path rare. Alternative
   (auto-pick best fuzzy match) rejected: silent wrong-row writes are the worst failure mode.

7. **Authorization = user ID allowlist in the Worker** (`ALLOWED_USER_IDS` var), checked on every
   command interaction; non-allowlisted users get an ephemeral refusal. The commands are
   registered **without** `default_member_permissions` — setting `'0'` hides them from everyone
   but server admins, and the quartermaster is not an admin. The Worker check is the only gate;
   other members see the commands but get the refusal.

8. **`/remove` floors at 0** and reports when it clamps. Negative stock is always a data error.

## Risks / Trade-offs

- [Sheet restructured by hand (sections renamed, Qty moved off column B)] → parser recognizes
  item rows structurally per Decision 5 and writes only to rows it just read; if the tab is
  renamed, the Worker fails loudly with the Sheets API error in an ephemeral reply. Tab name is
  a Worker var, not code.
- [Race between two adjustments] → single authorized user makes this negligible; read-modify-write
  is accepted. Not using batchUpdate transactions.
- [3-second budget on autocomplete when cache is cold] → token + values fetch is typically
  <800 ms from Cloudflare edge; if it ever misses, Discord just shows no suggestions — command
  still works by typing the full name.
- [Worker secret sprawl] → three secrets (`DISCORD_PUBLIC_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`)
  plus vars (`SHEET_ID`, `SMITHING_TAB`, `ALLOWED_USER_IDS`); documented in `wrangler.toml`
  comments like the reverted version.
- [Interactions Endpoint URL must be set in the Discord developer portal] → one-time manual step
  by the app owner (the user has the app credentials); Discord validates with a PING which the
  Worker already answers.

## Migration Plan

1. Restore `worker/` + `scripts/register-commands.js` from `627b004`; strip GitHub dispatch code.
2. Implement Sheets client + command handlers; unit-test parsing/matching with Node's test runner.
3. `npx wrangler deploy` on the user's Cloudflare account; set secrets.
4. Set Interactions Endpoint URL in the Discord developer portal (user action).
5. Run `node scripts/register-commands.js` to register `/add` `/remove` `/stock`.
6. Verify end-to-end with `/stock`, then `/add` on a low-stakes item.

Rollback: delete the guild commands (empty `PUT`) and the Worker; the sheet is untouched by
rollback since all writes are user-initiated.

## Open Questions

- None blocking. (Audit-log tab and role-based access are deliberate later changes.)
