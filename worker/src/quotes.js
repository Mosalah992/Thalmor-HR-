// Embassy bulletin quotes — posted to #clock-in every 3 hours by the cron
// trigger. Randomized rotation: each full pass through the list is shuffled
// with a seed derived from the cycle number, so the order looks random but
// every quote appears exactly once per cycle (no back-to-back repeats).

export const QUOTES = [
  // ─── Rivi, Embassy Physician ───
  'Senior Staff Rivi has healed forty-two agents this month through the medical application of purring. The Dominion does not question results. Neither should you.',
  "Rivi's clinic reports a 100% recovery rate. Agents who did not recover were reclassified before the report was filed.",
  "Wounded agents will report to Rivi. Agents faking wounds to receive purr therapy will be assigned to Justiciar Ganaril's Fireball lecture as live demonstration material.",
  'The Embassy physician is a Khajiit. The Embassy is aware of the irony. The Embassy has decided the irony is classified.',
  "Rivi reminds all agents that 'I'll walk it off' is not a treatment plan recognized by the Dominion. Report to the clinic. She can hear your ribs from here.",

  // ─── Orion & The Goon Squad ───
  "Orion and his associates were observed 'conducting field exercises' near the stables. The stables disagree. An inquiry has been opened, and closed, and reopened.",
  "The Embassy does not have a 'goon squad.' The Embassy has an Irregular Tactical Element that answers to Orion and, allegedly, to reason.",
  "Whatever Orion's squad did last Loredas is now a training scenario. Congratulations. This is not a compliment.",
  "Orion's men have been reminded that 'morale operations' require prior written approval. Laughter heard from the barracks is being audited.",

  // ─── The Nuramor Situation ───
  'The Embassy now employs six agents of House Nuramor. Command is no longer certain this was a recruitment drive and not an annexation.',
  "If you shout 'Nuramor!' in the courtyard, statistically, someone will answer. This has been weaponized. Details are classified.",
  'New arrivals are advised: you do not need to be a Nuramor to serve the Dominion. It simply appears to help.',
  'The ledger clerk has requested a separate page for House Nuramor. The request was denied. The clerk has requested a transfer. That was also denied.',

  // ─── General Ledger Menace ───
  'Have you praised the Aldmeri Dominion on main today?',
  'Agents who clock in but never clock out exist in a state the Treasury refuses to define and refuses to pay.',
  'The attendance ledger does not forget. The attendance ledger does not forgive. The attendance ledger has been enchanted, and it is watching.',
  "Reminder: 'I was active, I just didn't clock in' is a confession, not an excuse.",

  // ─── Personnel dispatches ───
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

/** mulberry32 — tiny deterministic PRNG, good enough for shuffling quotes. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle of [0..n) seeded by the cycle number. */
function shuffledOrder(n, seed) {
  const rand = prng(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Deterministic randomized pick: consecutive 3-hour slots walk a per-cycle
 * shuffle of the list, reshuffled every full pass.
 */
export function quoteForTime(ms) {
  const slot = Math.floor(ms / SLOT_MS);
  const cycle = Math.floor(slot / QUOTES.length);
  return QUOTES[shuffledOrder(QUOTES.length, cycle)[slot % QUOTES.length]];
}
