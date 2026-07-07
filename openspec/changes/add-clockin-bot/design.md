# Design: add-clockin-bot

## Context

The Thalmor Corps roster lives in a Google Sheet
(`1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0`, first tab, `gid=0`). Its layout matters:

| Sheet fact | Detail |
|---|---|
| Banner rows | Rows 1–2 (title + blank) — never write here |
| Header row | Row 3: `Unit, Rank, Name, Race, Discord, Status, Notes, Last Active` |
| Data rows | Row 4 downward, ~156 members |
| Discord handles | Column **E**, formatted like `@oryninc`; edge cases: `@roselord / slimely` (two handles in one cell), trailing dots (`@grimreaper7865.`) that are part of the username |
| Last Active | Column **H** — header exists, values empty |
| Total Clock-ins | Column **I** — currently the empty gap before stats; we add the `Total Clock-ins` header at I3 |
| Stats block | Columns **J–Q** of the same tab hold live counters — must never be touched |

Members clock in by posting in the **#clock-in** channel. Confirmed decisions from the owner:
any user message counts as a clock-in; the recorded time is the **message post time** (already an
absolute UTC instant — the same value hammertime `<t:…>` tags encode); the sheet displays **UTC**;
totals live in **column I**; the sync runs **once per day** (a later run only advances values —
"populate with new information if there is new last seen, or leave it as is").

Verified so far: the service account (`ancarion@thalmor.iam.gserviceaccount.com`) authenticates
and **reads** the sheet successfully; **writes return 403** until the sheet is shared with it as
Editor. The Discord app exists (ID `1524083694598623553`); a bot token and channel ID are still
needed.

## Goals / Non-Goals

**Goals:**
- Once per day, every roster member's **Last Active** (H) and **Total Clock-ins** (I) reflect the
  clock-in channel's full history, matched by the Discord column (E).
- The first run doubles as the historical backfill — no separate backfill mode.
- Officers get a run summary including clock-in authors who matched no roster row.
- Zero risk to the rest of the sheet (headers, stats block, other columns).

**Non-Goals:**
- Real-time updates, a 24/7 gateway bot, or a Clock In button panel (dropped by owner decision —
  daily cadence is enough).
- Shift-duration tracking (in/out pairs à la the Clockin app) — only "last seen" + total count.
- Editing the `Status` column — the owner manages ACTIVE/ABSENT manually.
- Parsing message text (hammertime tags, keywords) — post time is authoritative; this also means
  **no Message Content intent** is needed.
- Multi-server or multi-sheet support.

## Decisions

### D1 — Runtime: Node.js script, REST-only, minimal dependencies
- A single Node.js 18+ script using `fetch` against the Discord REST API and the Google Sheets
  v4 API (`googleapis` client or signed-JWT fetch — the auth flow is already proven working).
- **Why**: with a daily cadence there is no gateway connection, so discord.js is unnecessary
  weight; plain REST keeps the script portable to any scheduler.
- **Alternatives**: discord.js gateway bot (rejected — always-on host for a daily job);
  Google Apps Script timer polling Discord (viable, but Node keeps us in one repo/language and
  testable locally).

### D2 — Full-history rescan every run (stateless)
- Each run pages `GET /channels/{id}/messages` (100/page, newest → oldest) through the **entire**
  channel history and aggregates per author: `max(timestamp)` and `count(*)`, skipping bot and
  webhook messages.
- **Why**: stateless and self-healing — totals are always exact, deleted messages stop counting,
  and the first run needs no special backfill path. A channel with even 50k messages is ~500
  requests ≈ a few minutes under Discord rate limits, trivially fine daily.
- **Alternative**: incremental scan from a stored `lastMessageId` with counts accumulated in a
  state file (faster, but state loss corrupts totals; revisit only if history grows huge).

### D3 — Identity matching: normalized username against column E
- Normalization: trim, lowercase, strip leading `@`; split multi-handle cells on `/` and match
  any part; trailing dots kept (legal in Discord usernames).
- Match on the author's **unique username** (not display name / server nickname — those are
  roleplay names like "Lord Malen Velrith" and belong to the Name column).
- Unmatched authors go into the run summary (D6).

### D4 — Sheet writes: one read + one batched write per run, monotonic
- Read `E4:H` once (handles + current Last Active), compute updates, then issue a single
  `values.batchUpdate` containing only `H<row>` / `I<row>` ranges for matched members —
  a handful of API calls per day, far under any quota.
- **Monotonic**: a cell is only written when the scanned timestamp is **newer** than the parsed
  existing value (or the cell is empty); totals are always overwritten with the exact recount.
  Re-running is idempotent.
- The `Total Clock-ins` header is written to I3 once if missing.
- Rows are resolved from column E **in the same run** that writes, so hand-re-sorted rows are
  always current.

### D5 — Timestamp format: `YYYY-MM-DD HH:mm` UTC
- Human-readable, sortable-as-text, unambiguous; UTC is the same reference frame Discord and
  hammertime use, so members' `<t:…>` tags in chat and the sheet always refer to the same instant.

### D6 — Run summary + unmatched report
- Every run ends by printing a summary (members updated, unmatched authors with counts) and
  **posting it to Discord** via the bot (a short message to a configurable log/officer channel,
  falling back to console-only if unset). Officers see roster typos without reading logs.

### D7 — Auth & config
- Discord: bot token via `DISCORD_TOKEN`; channel via `CLOCKIN_CHANNEL_ID`; optional
  `LOG_CHANNEL_ID` for the run summary.
- Google: service account key at `credentials/thalmor-service-account.json` (git-ignored) via
  `GOOGLE_APPLICATION_CREDENTIALS`; sheet shared with the service-account email as Editor.
- All config in `.env` (dotenv), `.env.example` committed.

### D8 — Scheduling: GitHub Actions cron (primary) or Task Scheduler (local)
- Preferred: a private GitHub repo with an Actions workflow on `schedule: cron '0 4 * * *'`
  (daily 04:00 UTC) + `workflow_dispatch` for manual runs; secrets held in repo Actions secrets.
- Alternative: Windows Task Scheduler on the owner's PC (works, but misses days the PC is off —
  harmless, since each run rescans everything).

## Component overview

```
        daily cron / manual run
                 │
                 ▼
  ┌───────────────────────────────┐
  │ sync.js                       │
  │ 1. scan     ── Discord REST ──┼──▶ GET /channels/{id}/messages (paged)
  │    · skip bots/webhooks       │      → per author: max(ts), count
  │ 2. match    ── match.js       │
  │    · normalize handles        │
  │ 3. write    ── Google Sheets ─┼──▶ read E4:H, then one batchUpdate
  │    · monotonic H, exact I     │      on H<row>/I<row> only
  │ 4. report   ── Discord REST ──┼──▶ summary → log channel + stdout
  └───────────────────────────────┘
```

Source layout:

```
src/
  sync.js       # entry point: scan → match → write → report
  discord.js    # REST client: paged history fetch, summary post, rate-limit handling
  sheets.js     # service-account auth (JWT), roster read, batchUpdate writes
  match.js      # handle normalization + matching (pure, unit-testable)
  aggregate.js  # per-author max-timestamp + counts (pure, unit-testable)
.github/workflows/daily-sync.yml
```

## Risks / Trade-offs

- [Handles in column E are stale/wrong (users rename)] → unmatched report surfaces them next
  morning; matching uses the unique username, not display names.
- [Officers re-sort rows] → rows are re-resolved in the same run that writes; no stale cache
  exists by construction.
- [Two members share one cell (`@roselord / slimely`)] → alias splitting; either author updates
  that row (timestamps take the max), counts sum both — matches the roster's intent of one row.
- [Very large channel history] → full rescan grows linearly; acceptable to ~100k messages, then
  switch to the incremental variant of D2.
- [Discord/Sheets API failure mid-run] → the batch write happens only after a complete scan;
  a failed run writes nothing and the next day's run covers everything (stateless).
- [PC off at scheduled time (Task Scheduler path)] → missed day self-heals on the next run;
  GitHub Actions path avoids it entirely.

## Migration Plan

1. Owner shares the sheet with `ancarion@thalmor.iam.gserviceaccount.com` as **Editor**
   (read already verified; write currently 403).
2. Owner supplies the bot token, invites the bot (View Channel + Read Message History on
   #clock-in), and provides the channel ID (+ optional log channel ID).
3. Implement + unit-test locally; dry-run mode prints intended writes without writing.
4. First real run populates H and I for all matched members; spot-check 5 members against
   channel history; review unmatched list and fix column E typos.
5. Enable the daily schedule.
6. Rollback: disable the schedule; worst-case cleanup is clearing columns H and I.

## Open Questions

1. Which scheduler does the owner prefer — GitHub Actions (needs a private repo; runs even when
   their PC is off) or Windows Task Scheduler (fully local)?
2. Should the daily summary post to a Discord channel, and if so which one (needs its channel ID)?
