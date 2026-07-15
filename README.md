# Thalmor Clock-In

Weekly duty-hours tracking for the Thalmor Discord, synced to the
[Corps roster Google Sheet](https://docs.google.com/spreadsheets/d/1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0/edit).
Everything runs on one Cloudflare Worker ([worker/](worker/)) — no always-on process.
(The old daily message-scan sync is retired; hours come from slash commands now.)

## Duty hours (`/clockin`, `/clockout`)

Any member whose Discord username matches roster column **E** can use:

- `/clockin [time]` — start a shift. Optional `time` backdates it: a hammertime tag
  (`<t:1752480000:t>`) or plain unix seconds; defaults to right now.
- `/clockout [time]` — end the shift and log the hours.

On the roster sheet (row 3 headers, data from row 4):

| Column | Written by the bot |
|---|---|
| **G Owed** ☑ | Sundays only — cleared 17:30 UTC, ticked at the 18:00 UTC close-out for members at **8h+** (never written mid-week, so the Ledger's owed count is stable all week) |
| **H Paid** ☑ | never — managed by hand, unchecked at the weekly reset |
| **J Last Active** | stamped on every clock-in/out, `YYYY-MM-DD HH:mm` UTC, only advances |
| **K Total Hours** | weekly hours, green at ≥ 8h, reset every Sunday |

The **Ledger** tab computes pay itself: `# Actives` cells are `COUNTIFS` over the Owed
checkboxes per rank tier, `Total = Payment × # Actives`. The Ledger tab (including the
**Names** cells) is adjusted by hand — the bot never writes to it.

**Weekly cycle — Sundays** (Worker crons): at **17:30 UTC** all Owed marks are
cleared. At **18:00 UTC** the close-out posts the hours leaderboard (top 5 +
climber of the week + who reached 8h) to `#clock-in`, then rolls the week:
Owed ticked for members at 8h+, Total Hours → 0, Paid unchecked. Shifts still
open are discarded and named in the post.

Forgot to clock out? The shift stays open until you `/clockout` — use a backdated
`time` to close it honestly. Shifts can't exceed 24h and can't be backdated more
than 7 days.

## Smithing commands (quartermaster)

Slash commands for the **Smithing** tab of the
[Armory sheet](https://docs.google.com/spreadsheets/d/1McJOIBKWVdOF2L6UDIuR4Z74mDH_Eo8b2e3JLT0OqWg/edit):

- `/add qty item` — add smithed items (e.g. `/add 1 item:Thalmor Boots`)
- `/remove qty item` — remove items, floored at 0
- `/set qty item` — correct a count to an exact number (0 allowed)
- `/stock [item]` — one item's count + storage location, or a per-section summary

The `item` field autocompletes from the live sheet; unknown names get "did you mean"
suggestions and never write. Usable only by the Discord IDs in `ALLOWED_USER_IDS`.

## Operations

```bash
npm test                       # unit tests (pure functions, no network)
node scripts/setup-sheet.js    # one-time sheet migration (idempotent, --dry-run supported)
node scripts/register-commands.js   # (re-)register the slash commands
cd worker && npx wrangler@3 deploy  # deploy (wrangler 3 — Node 18 can't run wrangler 4)
```

Worker secrets (`npx wrangler@3 secret put …` from `worker/`): `DISCORD_PUBLIC_KEY`,
`GOOGLE_SERVICE_ACCOUNT_JSON`, `DISCORD_BOT_TOKEN`. Vars and the two cron triggers
(3-hourly bulletin, Sunday close-out) live in [worker/wrangler.toml](worker/wrangler.toml).
The app's Interactions Endpoint URL points at the Worker
(`https://thalmor-quartermaster.salaz4r.workers.dev`).

Local scripts read `.env` (see [.env.example](.env.example)) and the service-account key
at `credentials/thalmor-service-account.json` (git-ignored). The roster sheet is shared
with `ancarion@thalmor.iam.gserviceaccount.com` as **Editor**.

## Design docs

Original planning for the retired daily sync lives in
[openspec/changes/add-clockin-bot/](openspec/changes/add-clockin-bot/); the roster
column layout described there predates the Owed/Paid columns (E Discord is unchanged,
Last Active is now J, and Total Clock-ins became K Total Hours).
