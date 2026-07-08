# Thalmor Clock-In

Daily sync of clock-in activity from the Thalmor Discord **#clock-in** channel to the
[Corps roster Google Sheet](https://docs.google.com/spreadsheets/d/1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0/edit).

Each run scans the channel's full message history and, for every roster member matched by the
**Discord** column (E):

- **Last Active** (column H): time of their newest message, `YYYY-MM-DD HH:mm` **UTC** —
  only ever advanced, never regressed.
- **Total Clock-ins** (column I): lifetime message count in the channel.

Users who clocked in but match no roster row are listed in the run summary so officers can fix
handles in column E. Headers, the stats block (columns J+), and every other column are never
touched. Zero npm dependencies — plain Node 18+.

## Run it

```bash
node src/sync.js --dry-run   # show what would be written, change nothing
node src/sync.js             # real sync
npm test                     # unit tests
```

Config comes from `.env` (see [.env.example](.env.example)) plus the service-account key at
`credentials/thalmor-service-account.json`. Both are git-ignored.

## Scheduling

[.github/workflows/daily-sync.yml](.github/workflows/daily-sync.yml) runs the sync **daily at
04:00 UTC** and on demand (Actions tab → *Daily clock-in sync* → *Run workflow*, with an optional
dry-run checkbox).

Required repository **Actions secrets**:

| Secret | Value |
|---|---|
| `DISCORD_TOKEN` | Bot token |
| `CLOCKIN_CHANNEL_ID` | `#clock-in` channel ID |
| `LOG_CHANNEL_ID` | (optional) channel for the daily summary post |
| `SHEET_ID` | `1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full contents of the service-account JSON key |

## Access requirements

- The sheet is shared with `ancarion@thalmor.iam.gserviceaccount.com` as **Editor**.
- The bot needs **View Channel** + **Read Message History** on `#clock-in` (channel-level
  permission if the channel is private).

## Smithing commands (quartermaster)

Slash commands for the **Smithing** tab of the
[Armory sheet](https://docs.google.com/spreadsheets/d/1McJOIBKWVdOF2L6UDIuR4Z74mDH_Eo8b2e3JLT0OqWg/edit),
served by a Cloudflare Worker ([worker/](worker/)) — no always-on process, no channel setup:

- `/add qty item` — add smithed items (e.g. `/add 1 item:Thalmor Boots`)
- `/remove qty item` — remove items, floored at 0
- `/set qty item` — correct a count to an exact number (0 allowed)
- `/stock [item]` — one item's count + storage location, or a per-section summary

The `item` field autocompletes from the live sheet; unknown names get "did you mean"
suggestions and never write. Only Qty cells (column B) of recognized item rows are ever
written. Usable only by the Discord IDs in `ALLOWED_USER_IDS` (enforced in the Worker).

**Deploy** (from `worker/`): `npx wrangler@3 deploy` (wrangler 3 — this machine's Node 18
can't run wrangler 4), secrets `DISCORD_PUBLIC_KEY` and `GOOGLE_SERVICE_ACCOUNT_JSON` via
`wrangler secret put`; vars live in [worker/wrangler.toml](worker/wrangler.toml). The
app's Interactions Endpoint URL points at the Worker
(`https://thalmor-quartermaster.salaz4r.workers.dev`). Re-register commands after changing
their definitions: `node scripts/register-commands.js`.

## Design docs

Planning lives in [openspec/changes/add-clockin-bot/](openspec/changes/add-clockin-bot/):
proposal, design (architecture + decisions), specs (testable requirements), tasks.
