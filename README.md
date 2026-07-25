# Thalmor Clock-In

Weekly duty-hours tracking for the Thalmor Discord, synced to the
[Corps roster Google Sheet](https://docs.google.com/spreadsheets/d/1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0/edit).
Everything runs on one Cloudflare Worker ([worker/](worker/)) — no always-on process.
(The old daily message-scan sync is retired; hours come from slash commands now.)

## Duty hours (`/clockin`, `/clockout`)

Any member whose Discord username matches roster column **E** can use:

- `/clockin [time]` — start a shift. Optional `time` backdates it: a hammertime tag
  (`<t:1752480000:t>`) or plain unix seconds; defaults to right now.
- `/clockout [time]` — end the shift and log the hours. Clocking out with no open
  shift earns a random Ancano rebuke; a single shift of **12h+** earns a rare line
  of praise.
- `/help` — the full command list, posted ephemerally.

On the roster sheet (row 3 headers, data from row 4):

| Column | Written by the bot |
|---|---|
| **G Owed** ☑ | Mondays only — cleared 08:30 UTC, ticked at the 09:00 UTC (3 AM CST) close-out for members at **8h+** (never written mid-week, so the Ledger's owed count is stable all week) |
| **H Paid** ☑ | never — managed by hand, unchecked at the weekly reset |
| **J Last Active** | stamped on every clock-in/out, `YYYY-MM-DD HH:mm` UTC, only advances |
| **K Total Hours** | weekly hours, green at ≥ 8h, reset every Monday |

The **Ledger** tab computes pay itself: `# Actives` cells are `COUNTIFS` over the Owed
checkboxes per rank tier, `Total = Payment × # Actives`. The Ledger tab (including the
**Names** cells) is adjusted by hand — the bot never writes to it.

**Weekly cycle — Mondays, 3 AM CST** (Worker crons): at **08:30 UTC** all Owed marks
are cleared. At **09:00 UTC (3 AM CST)** the close-out posts the hours leaderboard
(top 5 + climber of the week + who reached 8h) to `#clock-in`, then rolls the week:
Owed ticked for members at 8h+, Total Hours → 0, Paid unchecked. A shift still open
at reset keeps running (named in the post) and is never force-closed — it ends only
when its holder runs `/clockout`.

Forgot to clock out? The shift stays open until you `/clockout` — use a backdated
`time` to close it honestly. Shifts can't exceed 24h and can't be backdated more
than 7 days.

## Embassy bulletin

Every 2 hours a quote in Justiciar Ancano's voice is posted to `#clock-in`, drawn
from the ~110-line rotation in [worker/src/quotes.js](worker/src/quotes.js). Each
full pass through the list is shuffled deterministically (seeded by the cycle
number), so the order looks random but no quote repeats until every other has
posted. Two of its sets double as the live `/clockout` replies above. **Editing
quotes only takes effect after a deploy** — the Worker serves whatever was last
deployed, not what is committed.

## Smithing commands (quartermaster)

Slash commands for the **Smithing** tab of the
[Armory sheet](https://docs.google.com/spreadsheets/d/1McJOIBKWVdOF2L6UDIuR4Z74mDH_Eo8b2e3JLT0OqWg/edit):

- `/add qty item` — add smithed items (e.g. `/add 1 Thalmor Boots`)
- `/remove qty item` — remove items, floored at 0
- `/set qty item` — correct a count to an exact number (0 allowed)
- `/stock [item]` — one item's count + storage location, or a per-section summary

The `item` field autocompletes from the live sheet; unknown names get "did you mean"
suggestions and never write. `/add` and `/remove` are open to members holding a role
named in `ALLOWED_ROLE_NAMES` (Quartermaster, Supply Corp, Blacksmith, Miner — matched by
name via the Discord API); `/set` and `/stock` remain limited to the Discord IDs in `ALLOWED_USER_IDS`.

## Operations

```bash
npm test                            # unit tests (pure functions, no network)
npm run setup-sheet                 # one-time sheet migration (idempotent, --dry-run supported)
npm run register                    # (re-)register the slash commands
cd worker && npx wrangler@3 deploy  # deploy (wrangler 3 — Node 18 can't run wrangler 4)
```

Worker secrets (`npx wrangler@3 secret put …` from `worker/`): `DISCORD_PUBLIC_KEY`,
`GOOGLE_SERVICE_ACCOUNT_JSON`, `DISCORD_BOT_TOKEN`. Vars and the three cron triggers
(2-hourly bulletin; Mondays 08:30 UTC Owed clear and 09:00 UTC / 3 AM CST close-out)
live in [worker/wrangler.toml](worker/wrangler.toml).
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
