// Embassy bulletin quotes — posted to #clock-in every 3 hours by the cron
// trigger. Rotates deterministically: each 3-hour slot since epoch maps to the
// next quote, so the full list cycles (~7 days) with no repeats in between.

export const QUOTES = [
  // ── Dispatch board ──────────────────────────────────────────────────────
  "The Dominion waits for no one. Especially not Gi'Zaro from Staff.",
  'If Lady Celeriel can keep the Embassy afloat through manifests, ledgers, and an incurable fear of missing out, you can make it to muster on time.',
  'Lord Malen died fighting a Dremora and still managed to clock in, what is your excuse?',
  "Lord Verux arrived before the meeting. The meeting hadn't been scheduled yet. The Justiciars are studying how.",
  'Ancarion has already reorganized the armory, counted the moonstone, and filed the requisition with Alinor. Where are you?',
  "Sir Havi is busy Havimaxxing. The Eight preserve him. What's your excuse?",
  'Lady Yhavna clocks-in every day and still has time to maintain a healthy relationship with a human.',
  "Jo'Khazan arrived on time. The rest of you have shamed the Khajiiti people, and Jone and Jode besides.",
  "The Embassy reminds staff that 'I overslept' is not an approved diplomatic response. Neither was it at the White-Gold Tower.",
  "Every minute you're late, Lady Celeriel adds another page to your dossier.",
  'The Eye of the Dominion sees all. The attendance ledger sees more.',
  'Clock in on time or be assigned to inventory moonstone with Ancarion for eight hours. He has opinions about moonstone.',
  'The Black Talons strike swiftly and without warning. The Office of Records strikes with parchment.',
  'Remember: the chain of command begins with showing up.',
  'The White-Gold Concordat took less negotiation than getting some recruits to attend training.',
  "Talos worship is banned. So is the phrase 'I forgot to clock in.'",
  'The Great War lasted five years. Some of you have not clocked in for five weeks. The comparison has been noted.',
  "Everyone has a dossier. Attendance determines whether yours reads 'asset' or 'liability.'",
  "Your dossier currently reads: 'Status — Uncooperative.' Clocking in is the first step of rehabilitation.",
  'A Dragon Break once lasted one thousand and eight years. Your shift lasts three hours. Clock in.',
  'The Psijic Order withdrew from the world for centuries — and still filed proper notice. Be like the Psijics.',
  'The Crystal Tower stood for millennia. Your excuse will not survive the morning briefing.',
  'Moon sugar is contraband. Punctuality is mandatory. Do not confuse the two lists again.',
  'Elsweyr runs on moon sugar. The Embassy runs on attendance. Both are habit-forming.',
  'Eight Divines. Not nine. And exactly one attendance ledger.',
  'Somewhere in Skyrim, a Justiciar is marching a prisoner through a blizzard. You cannot march yourself to muster.',
  'The Dominion brought the Empire to its knees at the White-Gold Tower. You can bring yourself to the clock-in channel.',

  // ── Break room posters ──────────────────────────────────────────────────
  '"Lord Verux is not angry. He has simply added your name to a list. The list is in Alinor now."',
  '"Congratulations on arriving only five minutes late. The inquisition has been downgraded to a conversation."',
  '"If Gi\'Zaro can find the Embassy, so can you."',
  '"Attendance is mandatory. Enthusiasm remains optional."',
  '"Clock in. Clock out. Overthrow human dominance. In that order."',
  '"The Thalmor do not make mistakes. The ledger says you were late. Reflect on what this means."',
  '"Auri-El ascended to Aetherius. You are only asked to ascend the Embassy steps by nine."',

  // ── From the ledger itself ──────────────────────────────────────────────
  'Lord Lakkon misses his husband very much. But no one will miss you if you never show up.',
  'All agents with less than 8h of service this week are invited to a private lecture with Justiciar Ganaril. The topic will be the effects of Fireball on the body.',
  'Lord Elvander and Lady Celeriel have been carrying the Thalmor Embassy on their backs for the last weeks. Find a special someone who motivates you to clock in every day just like them.',
  'Administrator Ancarion has successfully forged a dagger made from mer flesh. This has nothing to do with the missing recruit.',
  "Fen'ril Clawheart honors the Green Pact AND the attendance ledger. A Bosmer in an Altmer navy, out-attending half of you.",
  'Baron Telandor advises Command. Command advises you to clock in. The Dominion does not repeat its advice.',
  'The Embassy reminds new arrivals that "Just Joined" is a status, not a lifestyle. The Dominion measures loyalty in appearances.',
  'INACTIVE is written in the ledger in red ink. Lady Celeriel requisitioned the red ink from Alinor in bulk. Do not justify the shipment.',
  'Recruits marked "CHECK" will be checked. Recruits marked "ACTIVE" will be verified. Recruits marked nothing should be very, very worried.',
];

const SLOT_MS = 3 * 60 * 60 * 1000; // one quote per 3-hour cron slot

/** Deterministic pick: consecutive 3-hour slots walk the list in order. */
export const quoteForTime = (ms) => QUOTES[Math.floor(ms / SLOT_MS) % QUOTES.length];
