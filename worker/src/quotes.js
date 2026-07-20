// Embassy bulletin quotes — posted to #clock-in every 3 hours by the cron
// trigger, written in the voice of Justiciar Ancano. Randomized rotation:
// each full pass through the list is shuffled with a seed derived from the
// cycle number, so the order looks random but every quote appears exactly
// once per cycle (no back-to-back repeats).

export const QUOTES = [
  // ─── Missed clock-in / clock-out ───
  'You forgot to clock in. Or perhaps you simply believed the ledger would not notice. It notices everything.',
  'Failing to clock out is not an oversight, agent. It is a confession that your time was never worth recording in the first place.',
  'I have neither the time nor the patience to track down agents who cannot be bothered to press one button before leaving. Do better.',
  'An open shift with no clock-out is a wound the ledger cannot close. Neither, apparently, can you.',
  'You are late to record your own labor. How thoroughly unremarkable.',

  // ─── Missed the 8h weekly goal ───
  'Eight hours. A number small enough to count on both hands, and yet half of you cannot reach it.',
  'You did not make your hours this week. I am not disappointed — disappointment would require I expected more of you.',
  'The Dominion does not pay for potential. It pays for hours logged. You have offered neither in sufficient quantity.',
  'Your weekly total is an embarrassment I will not dignify with further commentary — though clearly I already have.',

  // ─── Why are there so many Nuramors ───
  "House Nuramor now accounts for a suspicious fraction of this embassy's roster. I have not ordered an investigation. Yet.",
  'Sixteen Nuramors are now enrolled in this embassy. At this rate the Dominion will require a second House Nuramor merely to staff the first.',
  'One Nuramor is a soldier. Sixteen is a pattern. I dislike patterns I did not authorize.',
  'Someone will explain to me why House Nuramor multiplies faster than the paperwork required to process them. Sixteen, and counting. I am listening. I am not impressed.',

  // ─── Auramon Nuramor and the barracks windows ───
  "Agent Auramon Nuramor was found 'testing' something combustible near the barracks. The windows did not survive the test. His next pay will.",
  'Auramon Nuramor has been informed, calmly, that explosives are not a substitute for competence. The glaziers have been informed less calmly, and billed accordingly — to him.',
  'The barracks have new windows. Agent Nuramor has a smaller paycheck. The Dominion considers this a fair exchange, and a lesson he will not need repeating.',

  // ─── Lady Celeriel carrying the embassy ───
  'Lady Celeriel manages the ledger, the inspections, and apparently the collective attention span of this embassy. You cannot manage eight hours.',
  "While Lady Celeriel conducts inspections and keeps the Dominion's paperwork from collapsing entirely, several of you cannot locate the clock-in command. I have reviewed both tasks. Only one of you is struggling.",
  'Lady Celeriel juggles administration and inspection without complaint. You are asked only to press a button twice a day. Draw your own comparison.',

  // ─── Miscellaneous embassy dispatches ───
  "Senior Staff Rivi has healed most of this embassy's soldiers this month. Whether through medicine or through purring remains unclear. I did not ask further.",
  'First Emissary Ganaril requires all agents who forgot to clock in to report to his office. Bring your own burn ointment. He will not provide it twice.',
  'Former Emissary Malen is no longer with us, having been struck by a Dremora. The Dominion records this as an unfortunate outcome, and an entirely avoidable one.',
  "Lord Lakkon's entire contribution to today's briefing was 'FIREBALL.' The Dominion has chosen not to elaborate.",

  // ─── Overheard around the embassy ───
  "If you'd had any nuts we'd have survived, orc. — Nelos Onmar",
  'Wait! My friend, my friend, my friend... WE MUST KILL THIS MAN. — Demetrius and the Vigilants',
  'Is it just me, or is one in three Thalmor a Talos kisser? — Cobble',
  "Life is like a wiener: it gets hard sometimes for no reason, but it doesn't stay hard for long. — Annatar Larethiane",
  'You find yourself with a dirty condom in your ass. Do you tell anyone? No... want to go camping? — Verux',
  "It's like being propositioned by a 6 when you're hoping for a 9 or a 10, but it's late at night, and you just don't care anymore. — Thorgim Hammersmite, moments before his execution",
  "So, y'all come here often? Uh, somewhat — sometimes I like to come on the floor. — Overheard at the embassy gates",
  'I thrive off negativity. — Lady Nyssara',
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
