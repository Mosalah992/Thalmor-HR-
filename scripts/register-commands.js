// Register the guild slash commands (idempotent — PUT replaces the full set).
// Usage: node scripts/register-commands.js
const { required } = require('../src/env');

const APP_ID = '1524083694598623553';
const GUILD_ID = '1498139135758831749';

const commands = [
  {
    name: 'help',
    description: 'What the Thalmor Clock-In bot does and how to use it',
    // available to everyone
  },
  {
    name: 'scan',
    description: 'Dry-run the clock-in sync — report what would change, without writing',
    default_member_permissions: '0', // admins only until roles are granted in Integrations
  },
  {
    name: 'sync',
    description: 'Run the clock-in sync now and post the report here',
    default_member_permissions: '0',
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
