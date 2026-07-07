# Tasks: add-clockin-bot

## 1. Access & credentials (owner actions)

- [x] 1.1 Create GCP service account and provide the JSON key (saved to `credentials/`, git-ignored; auth + sheet read verified)
- [ ] 1.2 Share the roster sheet with `ancarion@thalmor.iam.gserviceaccount.com` as **Editor** (write currently returns 403)
- [ ] 1.3 Provide the Discord bot token (Developer Portal → Bot → Reset Token)
- [ ] 1.4 Invite the bot to the Thalmor server with View Channel + Read Message History on #clock-in
- [ ] 1.5 Provide the #clock-in channel ID (and optional log-channel ID for the daily summary)

## 2. Project scaffold

- [ ] 2.1 `npm init`; install dotenv (googleapis optional — signed-JWT fetch already proven); vitest as dev dependency
- [ ] 2.2 Create `.env.example` (DISCORD_TOKEN, CLOCKIN_CHANNEL_ID, LOG_CHANNEL_ID, SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS) — `.gitignore` already covers secrets
- [ ] 2.3 `git init` and initial commit of scaffold + openspec docs

## 3. Pure logic (unit-tested first)

- [ ] 3.1 Implement `src/match.js`: handle normalization (trim, lowercase, strip `@`, split on `/`) and roster-map building
- [ ] 3.2 Unit-test match.js against real sheet edge cases (`@roselord / slimely`, `@grimreaper7865.`, empty cells)
- [ ] 3.3 Implement `src/aggregate.js`: per-author max-timestamp + count from message pages, bot/webhook exclusion; unit-test

## 4. API clients

- [ ] 4.1 Implement `src/discord.js`: paged history fetch (100/page) with 429 rate-limit handling and retry; summary post to log channel
- [ ] 4.2 Implement `src/sheets.js`: service-account JWT auth, read `E4:H`, ensure `Total Clock-ins` header at I3, single batched write of H/I cells with monotonic Last Active guard

## 5. Sync entry point

- [ ] 5.1 Implement `src/sync.js`: scan → match → write → report pipeline, complete-scan-or-nothing abort, `--dry-run` flag
- [ ] 5.2 Dry-run against the live channel and sheet; review intended writes

## 6. First run & verification

- [ ] 6.1 Execute the first real run — populates Last Active + Total Clock-ins for all matched members
- [ ] 6.2 Spot-check 5 members against channel history; run twice to confirm idempotency
- [ ] 6.3 Review unmatched-author list with the owner; fix column E typos

## 7. Scheduling & docs

- [ ] 7.1 Owner picks scheduler: GitHub Actions cron (private repo + secrets) or Windows Task Scheduler
- [ ] 7.2 Set up the chosen daily schedule (04:00 UTC) + manual trigger path
- [ ] 7.3 Write README: setup, env vars, how to run manually, how to read the summary
