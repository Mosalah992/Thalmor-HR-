// Thalmor Clock-In — Discord Interactions endpoint (Cloudflare Worker).
// Verifies Ed25519 signatures, serves /help, and dispatches the GitHub
// sync workflow for /scan (dry-run) and /sync.
//
// Secrets: DISCORD_PUBLIC_KEY, GITHUB_TOKEN (fine-grained PAT, Actions: write)
// Vars:    GITHUB_REPO (owner/name), GITHUB_WORKFLOW (file name)

const HELP_TEXT = [
  '**Thalmor Clock-In** — keeps the [Corps roster](<https://docs.google.com/spreadsheets/d/1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0/edit>) up to date from #clock-in.',
  '',
  '• Every message in #clock-in counts as a clock-in.',
  '• **Last Active** (UTC) and **Total Clock-ins** sync automatically every day at 04:00 UTC.',
  '• Colors: 🟩 ≤7 days · 🟨 ≤14 · 🟧 ≤30 · 🟥 30+ days quiet.',
  '',
  '**Commands** (officers):',
  '`/scan` — dry-run: report what would change, without touching the sheet.',
  '`/sync` — run the sync now; report posts here when done (~1 min).',
].join('\n');

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

const ephemeral = (content) => json({ type: 4, data: { content, flags: 64 } });

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function verifySignature(request, bodyText, publicKeyHex) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw', hexToBytes(publicKeyHex), { name: 'Ed25519' }, false, ['verify'],
    );
    return await crypto.subtle.verify(
      'Ed25519', key, hexToBytes(signature), new TextEncoder().encode(timestamp + bodyText),
    );
  } catch {
    return false;
  }
}

async function dispatchWorkflow(env, dryRun, channelId) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'thalmor-clockin-worker',
    },
    body: JSON.stringify({ ref: 'main', inputs: { dry_run: dryRun, log_channel: channelId } }),
  });
  if (res.status !== 204) {
    const text = await res.text();
    throw new Error(`GitHub responded ${res.status}: ${text.slice(0, 200)}`);
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Thalmor Clock-In interactions endpoint', { status: 200 });

    const bodyText = await request.text();
    if (!(await verifySignature(request, bodyText, env.DISCORD_PUBLIC_KEY))) {
      return new Response('invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(bodyText);
    if (interaction.type === 1) return json({ type: 1 }); // PING -> PONG

    if (interaction.type === 2) {
      const name = interaction.data.name;
      if (name === 'help') return ephemeral(HELP_TEXT);

      if (name === 'scan' || name === 'sync') {
        const dryRun = name === 'scan';
        try {
          await dispatchWorkflow(env, dryRun, interaction.channel_id);
          return ephemeral(
            dryRun
              ? '🔍 Scan started — a dry-run report will post to this channel in ~1 minute. No cells will be changed.'
              : '⏳ Sync started — the report will post to this channel in ~1 minute.',
          );
        } catch (e) {
          return ephemeral(`❌ Could not start the run: ${e.message}`);
        }
      }
    }

    return ephemeral('Unknown command.');
  },
};
