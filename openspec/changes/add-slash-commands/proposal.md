# Proposal: add-slash-commands

## Why

The daily sync works, but officers have no way to trigger or inspect it from Discord — they must use the GitHub Actions UI. Slash commands (`/help`, `/scan`, `/sync`) give roster management directly in the server, without changing the no-always-on-host architecture.

## What Changes

- Add a **Cloudflare Worker** (free tier) as the Discord Interactions Endpoint for app `1524083694598623553`, verifying request signatures with the app's public key.
- Register three **guild slash commands**:
  - `/help` — usage and status info (available to everyone).
  - `/scan` — dry-run: triggers the GitHub workflow with `dry_run=true`; the report posts back to the invoking channel. Officers only.
  - `/sync` — real sync, same reporting. Officers only.
- Officer gating via Discord-native command permissions: `/scan` and `/sync` register with `default_member_permissions=0` (admins only); server admins grant officer roles once in Server Settings → Integrations.
- The GitHub workflow accepts a `log_channel` input; `src/sync.js` posts its summary to that channel (including dry-runs).

## Capabilities

### New Capabilities

- `slash-commands`: Discord interactions endpoint (signature-verified) serving /help, /scan, /sync, with officer gating and workflow dispatch to GitHub.

### Modified Capabilities

- `roster-sync`: the run summary SHALL also be posted on dry-runs when a log channel is configured (previously console-only for dry-runs).

## Impact

- New `worker/` directory (Cloudflare Worker + wrangler config), new `scripts/register-commands.js`.
- Modified: `.github/workflows/daily-sync.yml` (log_channel input), `src/sync.js` (dry-run summary posting).
- New external dependency: Cloudflare account (owner-created, free) with two Worker secrets (`DISCORD_PUBLIC_KEY`, `GITHUB_TOKEN` fine-grained PAT with Actions write on Mosalah992/Thalmor-HR-).
