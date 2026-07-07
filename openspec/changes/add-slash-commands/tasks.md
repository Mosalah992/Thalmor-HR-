# Tasks: add-slash-commands

## 1. Code

- [ ] 1.1 Implement `worker/src/index.js`: Ed25519 verification, PING→PONG, /help reply, /scan + /sync → GitHub workflow_dispatch with `{dry_run, log_channel}`
- [ ] 1.2 Add `worker/wrangler.toml` (name, main, compatibility date, GITHUB_REPO var)
- [ ] 1.3 Implement `scripts/register-commands.js`: PUT guild commands, scan/sync with default_member_permissions=0
- [ ] 1.4 Update `.github/workflows/daily-sync.yml`: `log_channel` input → LOG_CHANNEL_ID env (fallback to secret)
- [ ] 1.5 Update `src/sync.js`: post summary whenever LOG_CHANNEL_ID is set (dry-run included)

## 2. Registration & deploy

- [ ] 2.1 Run `scripts/register-commands.js` (assistant, uses bot token)
- [ ] 2.2 Owner: create free Cloudflare account
- [ ] 2.3 Owner: create fine-grained GitHub PAT (repo Thalmor-HR-, Actions: read+write)
- [ ] 2.4 Owner: `cd worker && npx wrangler login && npx wrangler deploy`, then `npx wrangler secret put DISCORD_PUBLIC_KEY` and `npx wrangler secret put GITHUB_TOKEN`
- [ ] 2.5 Owner: paste Worker URL into Developer Portal → General Information → Interactions Endpoint URL (Discord validates instantly)
- [ ] 2.6 Admin: grant officer roles to /scan and /sync in Server Settings → Integrations

## 3. Verify

- [ ] 3.1 /help replies in the server
- [ ] 3.2 /scan posts a dry-run report to the invoking channel
- [ ] 3.3 /sync runs and posts the real summary; sheet reflects any new clock-ins
- [ ] 3.4 A non-officer member cannot see /scan or /sync
