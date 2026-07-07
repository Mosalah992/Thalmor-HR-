# Proposal: add-clockin-bot

## Why

The Thalmor Corps roster spreadsheet tracks ~156 members, but the **Last Active** column (column H) is empty and there is no automated way to know when a member last clocked in. Members clock in by posting messages in the **#clock-in** channel of the Thalmor Discord server, and officers currently have no tooling to turn those messages into roster data. This change builds a daily sync job that reads the clock-in channel and keeps the roster's Last Active column (and a clock-in total) up to date automatically, keyed by each member's Discord handle (the `Discord` column, E).

## What Changes

- Create a new Node.js sync script ("Thalmor Clock-In") that runs **once per day** on a scheduler (GitHub Actions cron or Windows Task Scheduler) — no always-on bot process.
- Each run scans the full message history of the configured **Clock In** channel via the Discord REST API and aggregates, per author: newest message timestamp (last clock-in) and total message count (total clock-ins).
- The script connects to the roster Google Sheet (`1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0`, tab `gid=0`) via the `ancarion@thalmor` service account and writes:
  - **Last Active** (column H): newest clock-in as `YYYY-MM-DD HH:mm` **UTC** (message post time — the same absolute instant hammertime tags encode). Existing values are only ever advanced, never regressed.
  - **Total Clock-ins** (column I, new header at I3): lifetime message count in the channel.
- Rows are matched by the **Discord** column (E); members with no new activity keep their previous values untouched.
- Clock-ins from authors not found in the roster are reported in the run summary so officers can fix roster handles.
- Batched, rate-limit-aware API usage on both the Discord and Google sides.

## Capabilities

### New Capabilities

- `clockin-scan`: Scan the clock-in channel's message history via the Discord REST API and aggregate last-seen timestamp + total count per author.
- `roster-sync`: Resolve Discord usernames to roster rows and write Last Active (H) and Total Clock-ins (I) to the Google Sheet safely (batched, monotonic, no damage to headers or the stats block in columns J+), reporting unmatched authors.
- `daily-schedule`: Run the sync automatically once per day and allow manual on-demand runs.

### Modified Capabilities

_None — this is a greenfield project with no existing specs._

## Impact

- **New codebase**: `src/` Node.js project (plain REST calls, googleapis, dotenv), `.env` configuration, no existing code affected.
- **External systems**:
  - Discord: a bot application (App ID `1524083694598623553`) invited to the Thalmor server with *View Channel* + *Read Message History* on #clock-in. Author + timestamp only — **no Message Content privileged intent required**.
  - Google Sheets: service account `ancarion@thalmor.iam.gserviceaccount.com`; the roster sheet must be shared with it as **Editor**. Only columns H and I of data rows (row 4 down) are ever written; headers (rows 1–3), the stats block (columns J–Q), and all other columns are never touched.
- **Operations**: one scheduled run per day — free GitHub Actions cron, or Windows Task Scheduler on any PC that's on daily. No hosting cost.
