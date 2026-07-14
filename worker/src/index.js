// Thalmor Quartermaster — Discord Interactions endpoint (Cloudflare Worker).
// /add, /remove, /stock adjust and report Qty cells in the Smithing tab of
// the Armory Google Sheet (quartermaster-only, ALLOWED_USER_IDS).
// /clockin & /clockout track weekly duty hours on the clock-in roster sheet
// (any roster member). Sundays 18:00 UTC: hours leaderboard + weekly reset.
//
// Secrets: DISCORD_PUBLIC_KEY, GOOGLE_SERVICE_ACCOUNT_JSON, DISCORD_BOT_TOKEN
// Vars:    SHEET_ID, SMITHING_TAB, ALLOWED_USER_IDS, CLOCKIN_CHANNEL_ID,
//          CLOCKIN_SHEET_ID

import { getAccessToken, readLedgerRows, writeQty } from './gsheets.js';
import { parseLedger, findItem, rankMatches } from './ledger.js';
import { quoteForTime } from './quotes.js';
import { runClockIn, runClockOut } from './clock.js';
import { runWeeklyCloseout } from './weekly.js';
import { log, logError } from './log.js';

const HELP_TEXT = [
  '**Thalmor Quartermaster** — duty & armory commands:',
  '',
  '__Duty hours (everyone on the roster):__',
  '`/clockin [time]` — start your shift; optional hammertime tag (`<t:…>`) to backdate',
  '`/clockout [time]` — end your shift; hours count toward the weekly 8h pay goal',
  'Hours reset every Sunday 18:00 UTC after the attendance honors post.',
  '',
  '__Smithing ledger (quartermaster only):__',
  '`/add qty item` — add smithed items (e.g. `/add 1 Thalmor Boots`)',
  '`/remove qty item` — remove issued/lost items, floors at 0',
  '`/set qty item` — correct a count to an exact number (0 allowed)',
  '`/stock [item]` — one item’s count + location, or the whole ledger summary',
  '',
  'The *item* field autocompletes from the live [Armory sheet](<https://docs.google.com/spreadsheets/d/1McJOIBKWVdOF2L6UDIuR4Z74mDH_Eo8b2e3JLT0OqWg/edit>).',
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
      'raw', hexToBytes(String(publicKeyHex).trim()), { name: 'Ed25519' }, false, ['verify'],
    );
    return await crypto.subtle.verify(
      'Ed25519', key, hexToBytes(signature), new TextEncoder().encode(timestamp + bodyText),
    );
  } catch {
    return false;
  }
}

const invokerId = (interaction) =>
  (interaction.member && interaction.member.user && interaction.member.user.id) ||
  (interaction.user && interaction.user.id) || '';

const isAllowed = (env, interaction) =>
  (env.ALLOWED_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
    .includes(invokerId(interaction));

const option = (interaction, name) => {
  const opt = (interaction.data.options || []).find((o) => o.name === name);
  return opt ? opt.value : undefined;
};

/** Fresh (uncached) ledger read — used by every command. */
async function loadLedger(env) {
  const token = await getAccessToken(env);
  return { token, items: parseLedger(await readLedgerRows(env, token)) };
}

/** Cached ledger for autocomplete: 60 s TTL via the Workers cache. */
async function loadLedgerCached(env, ctx) {
  const cacheKey = new Request(
    `https://ledger.cache.internal/${env.SHEET_ID}/${encodeURIComponent(env.SMITHING_TAB)}`,
  );
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  const { items } = await loadLedger(env);
  ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
  })));
  return items;
}

async function handleAutocomplete(interaction, env, ctx) {
  if (!isAllowed(env, interaction)) return json({ type: 8, data: { choices: [] } });
  const t0 = Date.now();
  try {
    const focused = (interaction.data.options || []).find((o) => o.focused);
    const items = await loadLedgerCached(env, ctx);
    const choices = rankMatches(items, focused ? String(focused.value) : '', 25)
      .map((it) => ({ name: `${it.item} (${it.qty})`.slice(0, 100), value: it.item.slice(0, 100) }));
    log('autocomplete.ok', { query: focused && focused.value, choices: choices.length, ms: Date.now() - t0 });
    return json({ type: 8, data: { choices } });
  } catch (e) {
    logError('autocomplete.fail', e, { ms: Date.now() - t0 });
    return json({ type: 8, data: { choices: [] } }); // degrade silently, never error
  }
}

const suggestionText = (items, name) => {
  const close = rankMatches(items, name).map((it) => `• ${it.item} (${it.qty})`);
  return close.length
    ? `❓ No item named **${name}** in the ledger. Did you mean:\n${close.join('\n')}`
    : `❓ No item named **${name}** in the ledger, and nothing close to it either.`;
};

async function runAdd(env, interaction, sign) {
  const amount = Number(option(interaction, 'qty'));
  const name = String(option(interaction, 'item') || '');
  const { token, items } = await loadLedger(env);

  const it = findItem(items, name);
  if (!it) return suggestionText(items, name);

  let newQty = it.qty + sign * amount;
  let note = '';
  if (newQty < 0) {
    note = ` (only ${it.qty} in stock — floored at 0)`;
    newQty = 0;
  }
  await writeQty(env, token, it.row, newQty);
  const verb = sign > 0 ? 'Added' : 'Removed';
  return `⚒️ ${verb} ${amount} — **${it.item}**: ${it.qty} → **${newQty}**${note}`;
}

async function runSet(env, interaction) {
  const newQty = Number(option(interaction, 'qty'));
  const name = String(option(interaction, 'item') || '');
  const { token, items } = await loadLedger(env);

  const it = findItem(items, name);
  if (!it) return suggestionText(items, name);

  if (newQty === it.qty) return `📦 **${it.item}** is already at ${it.qty} — nothing changed.`;
  await writeQty(env, token, it.row, newQty);
  return `📝 Corrected — **${it.item}**: ${it.qty} → **${newQty}**`;
}

async function runStock(env, interaction) {
  const name = option(interaction, 'item');
  const { items } = await loadLedger(env);

  if (name) {
    const it = findItem(items, String(name));
    if (!it) return suggestionText(items, String(name));
    const loc = it.location ? ` · ${it.location}` : '';
    return `📦 **${it.item}**: ${it.qty}${loc} _(${it.section})_`;
  }

  const sections = new Map();
  for (const it of items) {
    const s = sections.get(it.section) || { count: 0, qty: 0 };
    s.count += 1;
    s.qty += it.qty;
    sections.set(it.section, s);
  }
  const lines = [...sections].map(
    ([sec, s]) => `**${sec}** — ${s.count} items, ${s.qty} in stock`,
  );
  return `📦 **Smithing ledger**\n${lines.join('\n')}`;
}

/** Edit the deferred response with the final content. */
async function editReply(interaction, content) {
  const res = await fetch(
    `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok) throw new Error(`Discord edit ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

const invokerUsername = (interaction) =>
  (interaction.member && interaction.member.user && interaction.member.user.username) ||
  (interaction.user && interaction.user.username) || '';

function handleCommand(interaction, env, ctx) {
  const name = interaction.data.name;
  if (name === 'help') return json({ type: 4, data: { content: HELP_TEXT, flags: 64 } });

  // Clock commands are open to everyone; the roster match is the gate.
  if (name === 'clockin' || name === 'clockout') {
    const t0 = Date.now();
    const userId = invokerId(interaction);
    const username = invokerUsername(interaction);
    const work = (async () => {
      let content;
      try {
        content = name === 'clockin'
          ? await runClockIn(env, interaction, userId, username)
          : await runClockOut(env, interaction, userId, username);
        log('command.ok', { command: name, user: username, ms: Date.now() - t0, reply: content.slice(0, 120) });
      } catch (e) {
        logError('command.fail', e, { command: name, user: username, ms: Date.now() - t0 });
        content = `❌ ${e.message}`;
      }
      try {
        await editReply(interaction, content);
      } catch (e) {
        logError('reply.fail', e, { command: name, ms: Date.now() - t0 });
      }
    })();
    ctx.waitUntil(work);
    return json({ type: 5 }); // public deferred — the reply is the channel's duty log
  }

  if (!isAllowed(env, interaction)) {
    log('command.refused', { command: name, user: invokerId(interaction) });
    return ephemeral('⛔ Quartermaster only — these commands adjust the armory ledger.');
  }

  const t0 = Date.now();
  const work = (async () => {
    let content;
    try {
      if (name === 'add') content = await runAdd(env, interaction, +1);
      else if (name === 'remove') content = await runAdd(env, interaction, -1);
      else if (name === 'set') content = await runSet(env, interaction);
      else if (name === 'stock') content = await runStock(env, interaction);
      else content = 'Unknown command.';
      log('command.ok', { command: name, ms: Date.now() - t0, reply: content.slice(0, 120) });
    } catch (e) {
      logError('command.fail', e, { command: name, ms: Date.now() - t0 });
      content = `❌ ${e.message}`;
    }
    try {
      await editReply(interaction, content);
      log('reply.edited', { command: name, ms: Date.now() - t0 });
    } catch (e) {
      logError('reply.fail', e, { command: name, ms: Date.now() - t0 });
    }
  })();

  ctx.waitUntil(work);
  return json({ type: 5 }); // deferred — Discord shows "thinking…" and we edit in
}

/** Cron (every 3 h): post the next embassy bulletin quote to #clock-in. */
async function postBulletin(env, scheduledTime) {
  const content = `☀️📋 ${quoteForTime(scheduledTime)}`;
  const res = await fetch(`https://discord.com/api/v10/channels/${env.CLOCKIN_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Discord post ${res.status}: ${(await res.text()).slice(0, 200)}`);
  log('bulletin.posted', { quote: content.slice(0, 120) });
}

export default {
  async scheduled(event, env, ctx) {
    if (event.cron === '0 18 * * SUN') {
      ctx.waitUntil(
        runWeeklyCloseout(env, event.scheduledTime)
          .then((content) => log('weekly.posted', { content: content.slice(0, 120) }))
          .catch((e) => logError('weekly.fail', e)),
      );
      return;
    }
    ctx.waitUntil(postBulletin(env, event.scheduledTime).catch((e) => logError('bulletin.fail', e)));
  },

  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Thalmor Quartermaster interactions endpoint', { status: 200 });
    }

    const bodyText = await request.text();
    if (!(await verifySignature(request, bodyText, env.DISCORD_PUBLIC_KEY))) {
      return new Response('invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(bodyText);
    log('interaction.received', {
      type: interaction.type,
      command: interaction.data && interaction.data.name,
      user: invokerId(interaction),
    });
    if (interaction.type === 1) return json({ type: 1 });                        // PING → PONG
    if (interaction.type === 4) return handleAutocomplete(interaction, env, ctx); // autocomplete
    if (interaction.type === 2) return handleCommand(interaction, env, ctx);      // command

    return ephemeral('Unsupported interaction.');
  },
};
