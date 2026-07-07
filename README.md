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

## Design docs

Planning lives in [openspec/changes/add-clockin-bot/](openspec/changes/add-clockin-bot/):
proposal, design (architecture + decisions), specs (testable requirements), tasks.
