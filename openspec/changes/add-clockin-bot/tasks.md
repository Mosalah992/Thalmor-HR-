# Tasks: add-clockin-bot

## 1. Access & credentials (owner actions)

- [x] 1.1 Create GCP service account and provide the JSON key (saved to `credentials/`, git-ignored; auth + sheet read verified)
- [x] 1.2 Share the roster sheet with `ancarion@thalmor.iam.gserviceaccount.com` as **Editor** (write verified)
- [x] 1.3 Provide the Discord bot token (verified — logs in as "Thalmor Clock in")
- [ ] 1.4 Grant the bot access to #clock-in: bot is in the server, but the channel is private → channel Settings → Permissions → add the bot/its role with **View Channel** + **Read Message History** (currently 403 Missing Access)
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
- [ ] 5.2 Dry-run against the live channel and sheet; review intended writes (blocked by task 1.4 — verified clean abort with no writes)

## 6. First run & verification

- [ ] 6.1 Execute the first real run — populates Last Active + Total Clock-ins for all matched members
- [ ] 6.2 Spot-check 5 members against channel history; run twice to confirm idempotency
- [ ] 6.3 Review unmatched-author list with the owner; fix column E typos

## 7. Scheduling & docs

- [x] 7.1 Owner picked scheduler: GitHub Actions on github.com/Mosalah992/Thalmor-HR-
- [x] 7.2 Workflow `.github/workflows/daily-sync.yml` pushed: daily 04:00 UTC cron + manual workflow_dispatch with dry-run option
- [ ] 7.3 Owner adds Actions secrets (DISCORD_TOKEN, CLOCKIN_CHANNEL_ID, SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON, optional LOG_CHANNEL_ID) in repo Settings → Secrets and variables → Actions
- [x] 7.4 README written: setup, env vars, manual runs, summary
