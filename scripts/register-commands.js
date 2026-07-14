// Register the guild slash commands (idempotent — PUT replaces the full set).
// Usage: node scripts/register-commands.js
const { required } = require('../src/env');

const APP_ID = '1524083694598623553';
const GUILD_ID = '1498139135758831749';

// Option types: 3 = STRING, 4 = INTEGER
const itemOption = (requiredOpt) => ({
  type: 3,
  name: 'item',
  description: 'Ledger item name (pick from suggestions)',
  required: requiredOpt,
  autocomplete: true,
});

const qtyOption = {
  type: 4,
  name: 'qty',
  description: 'How many',
  required: true,
  min_value: 1,
};

const timeOption = {
  type: 3,
  name: 'time',
  description: 'Hammertime tag (<t:…>) or unix seconds to backdate — defaults to right now',
  required: false,
};

const commands = [
  // No default_member_permissions: '0' would hide the commands from everyone
  // but server admins — and the quartermaster is not an admin. The Worker's
  // ALLOWED_USER_IDS check is the real gate; others get an ephemeral refusal.
  {
    name: 'help',
    description: 'List the duty and quartermaster commands',
  },
  {
    name: 'clockin',
    description: 'Clock in for duty (weekly hours count toward the 8h pay goal)',
    options: [timeOption],
  },
  {
    name: 'clockout',
    description: 'Clock out — logs the shift hours to the roster sheet',
    options: [timeOption],
  },
  {
    name: 'add',
    description: 'Add smithed items to the armory ledger',
    options: [qtyOption, itemOption(true)],
  },
  {
    name: 'remove',
    description: 'Remove items from the armory ledger (floors at 0)',
    options: [qtyOption, itemOption(true)],
  },
  {
    name: 'set',
    description: 'Correct an item’s count to an exact number',
    options: [
      { type: 4, name: 'qty', description: 'Exact new count', required: true, min_value: 0 },
      itemOption(true),
    ],
  },
  {
    name: 'stock',
    description: 'Show current stock — one item, or the whole ledger summary',
    options: [itemOption(false)],
  },
];

(async () => {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${required('DISCORD_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Discord ${res.status}: ${JSON.stringify(data)}`);
  console.log(`Registered ${data.length} commands:`, data.map((c) => `/${c.name}`).join(' '));
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
