# Design: add-slash-commands

## Context

The clock-in sync is a stateless daily GitHub Actions job — there is deliberately no 24/7 bot
process, so prefix commands (`-help`) are impossible. Discord's alternative is an **Interactions
Endpoint URL**: Discord POSTs each slash-command invocation to an HTTPS endpoint that must
respond within 3 seconds, authenticated by an Ed25519 signature made with the app's **public key**
(`f922e2…0455`, already provided by the owner). A Cloudflare Worker (free tier: 100k req/day) is
the smallest thing that satisfies this.

## Goals / Non-Goals

**Goals:**
- `/help`, `/scan`, `/sync` usable in the Thalmor server; scan/sync restricted to officers.
- Scan/sync results appear in the invoking Discord channel within ~1–2 minutes.
- No change to the daily-cron architecture; the Worker only *triggers* the existing workflow.

**Non-Goals:**
- No clock-in capture via commands (messages remain the source of truth).
- No hosting of sync logic in the Worker (it stays in the repo, run by Actions).

## Decisions

### D1 — Cloudflare Worker as interactions endpoint
Ed25519 verification via Web Crypto (`crypto.subtle.verify`), PING→PONG handshake, command
routing. Alternatives: any serverless platform — Cloudflare chosen for free tier without card
and first-class Ed25519 support.

### D2 — Commands trigger the existing GitHub workflow (workflow_dispatch)
The Worker calls `POST /repos/<repo>/actions/workflows/daily-sync.yml/dispatches` with inputs
`{dry_run, log_channel: interaction.channel_id}` using a fine-grained PAT (Actions: write) stored
as a Worker secret. The Worker replies immediately (ephemeral “⏳ started”); the workflow posts
the public summary to `log_channel` when done. This keeps one implementation of the sync and
stays inside the 3-second interaction deadline.
Alternative rejected: running the sync inside the Worker (would duplicate logic and exceed
CPU/time limits on large histories).

### D3 — Officer gating via Discord-native command permissions
`/scan` and `/sync` register with `default_member_permissions: "0"` → visible/usable only by
administrators until an admin grants roles under Server Settings → Integrations → Thalmor Clock
in → Commands. No role IDs in code; the server controls its own access. `/help` is open to all.

### D4 — Registration script, guild-scoped
`scripts/register-commands.js` PUTs the three commands to
`/applications/{appId}/guilds/{guildId}/commands` (instant availability, no 1-hour global
propagation). Re-running is idempotent (PUT replaces the set).

### D5 — Summary posting on dry-run
`src/sync.js` currently posts the summary only on real runs. Change: post whenever
`LOG_CHANNEL_ID` is set — a `/scan` is useful precisely because its report arrives in Discord.
The workflow maps input `log_channel` → env `LOG_CHANNEL_ID` (falling back to the repo secret).

## Component overview

```
Discord slash command
      │ (signed POST)
      ▼
Cloudflare Worker ── verify Ed25519 ── /help → immediate reply
      │                                /scan, /sync → ephemeral "⏳ started"
      │ workflow_dispatch (PAT)
      ▼
GitHub Actions daily-sync.yml ── node src/sync.js [--dry-run]
      │                                 LOG_CHANNEL_ID = invoking channel
      ▼
summary posted to the Discord channel
```

## Risks / Trade-offs

- [PAT leak would allow triggering workflows] → fine-grained PAT scoped to one repo, Actions
  only, stored as an encrypted Worker secret; rotate anytime.
- [Workflow queue latency] → Actions usually starts in seconds; the ⏳ reply sets expectations.
- [Worker replies success but dispatch fails] → Worker checks GitHub's 204 response and reports
  errors in the ephemeral reply.
- [Command spam] → officer-gated; sync is idempotent anyway.

## Migration Plan

1. Register commands (script, uses bot token — done by assistant).
2. Owner: create Cloudflare account → `npx wrangler login` → `npx wrangler deploy` in `worker/`
   → set secrets `DISCORD_PUBLIC_KEY` and `GITHUB_TOKEN`.
3. Owner: paste the Worker URL into Developer Portal → General Information → Interactions
   Endpoint URL (Discord validates with a test PING immediately).
4. Admin grants officer roles to /scan and /sync in Server Settings → Integrations.
5. Rollback: clear the Interactions Endpoint URL; commands stop resolving. Delete the Worker.

## Open Questions

_None._
