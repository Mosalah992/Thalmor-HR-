# Tasks: add-clockin-bot

## 1. Access & credentials (owner actions)

- [x] 1.1 Create GCP service account and provide the JSON key (saved to `credentials/`, git-ignored; auth + sheet read verified)
- [x] 1.2 Share the roster sheet with `ancarion@thalmor.iam.gserviceaccount.com` as **Editor** (write verified)
- [x] 1.3 Provide the Discord bot token (verified — logs in as "Thalmor Clock in")
- [x] 1.4 Grant the bot access to #clock-in (channel-level overwrite for the bot member; verified)
- [x] 1.5 Provide the #clock-in channel ID (1511723933609754797; log channel: none, console-only summary)

## 2. Project scaffold

- [x] 2.1 Zero-dependency setup: plain Node 18+, `node --test` for tests (no npm install needed anywhere)
- [x] 2.2 Create `.env` + `.env.example` (DISCORD_TOKEN, CLOCKIN_CHANNEL_ID, LOG_CHANNEL_ID, SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS) — `.gitignore` covers secrets
- [x] 2.3 `git init`, initial commit, pushed to github.com/Mosalah992/Thalmor-HR-

## 3. Pure logic (unit-tested first)

- [x] 3.1 Implement `src/match.js`: handle normalization (trim, lowercase, strip `@`, split on `/`) and roster-map building
- [x] 3.2 Unit-test match.js against real sheet edge cases (`@roselord / slimely`, `@grimreaper7865.`, empty cells)
- [x] 3.3 Implement `src/aggregate.js`: per-author max-timestamp + count from message pages, bot/webhook exclusion; unit-test (16/16 passing)

## 4. API clients

- [x] 4.1 Implement `src/discord.js`: paged history fetch (100/page) with 429 rate-limit handling and retry; summary post to log channel
- [x] 4.2 Implement `src/sheets.js`: service-account JWT auth, tab-title resolution, batchGet of E/H/I, ensure `Total Clock-ins` header at I3, single batched write with monotonic Last Active guard

## 5. Sync entry point

- [x] 5.1 Implement `src/sync.js`: scan → match → write → report pipeline, complete-scan-or-nothing abort, `--dry-run` flag
- [x] 5.2 Dry-run against the live channel and sheet; reviewed intended writes (127 cells, all H/I only)

## 6. First run & verification

- [x] 6.1 First real run executed 2026-07-07: 900 messages, 81 users, 63 roster rows populated (127 cells)
- [x] 6.2 Read-back verified 6 sample rows + I3 header; second run wrote 0 cells (idempotent)
- [ ] 6.3 Owner reviews the 18 unmatched authors; fix column E typos (likely: `@akuhidracul`→`akujidracul`, `@roselord`→`roserlord`, `@lireaper586`→`ltreaper586`)

## 7. Scheduling & docs

- [x] 7.1 Owner picked scheduler: GitHub Actions on github.com/Mosalah992/Thalmor-HR-
- [x] 7.2 Workflow `.github/workflows/daily-sync.yml` pushed: daily 04:00 UTC cron + manual workflow_dispatch with dry-run option
- [x] 7.3 Owner added Actions secrets (DISCORD_TOKEN, CLOCKIN_CHANNEL_ID, SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON)
- [ ] 7.5 Confirm the first scheduled/manual GitHub Actions run succeeds (Actions tab → Daily clock-in sync → Run workflow)
- [x] 7.4 README written: setup, env vars, manual runs, summary
