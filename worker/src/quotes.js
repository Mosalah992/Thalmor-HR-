// Embassy bulletin quotes — posted to #clock-in every 2 hours by the cron
// trigger, written in the voice of Justiciar Ancano. Randomized rotation:
// each full pass through the list is shuffled with a seed derived from the
// cycle number, so the order looks random but every quote appears exactly
// once per cycle (no back-to-back repeats).

// Reused as live replies (see clock.js) in addition to the bulletin rotation.
export const CLOCK_IN_QUOTES = [
  'You have not clocked in. I had assumed you simply failed to arrive. The distinction grows increasingly academic.',
  'The ledger remains empty beside your name. I wonder if your work ethic has followed it into oblivion.',
  'One command. Two seconds. Somehow beyond your capabilities.',
  'The Dominion conquered nations with greater efficiency than you manage your attendance.',
  'Your absence from the ledger is less surprising than your continued employment.',
  'I checked twice to ensure this was not a clerical error. It was not.',
  'Even paperwork deserves more respect than you have afforded it today.',
  'You remain unrecorded. Much like your accomplishments.',
  'The ledger has waited patiently. I have not.',
  'Remarkable. You have managed to disappoint both bureaucracy and me simultaneously.',
];

export const PRAISE_QUOTES = [
  'Your performance was... acceptable. Treasure this moment. It will not recur often.',
  'You have earned recognition. Do not mistake that for equality.',
  'Competence is refreshing. Almost suspicious.',
  'I find myself without criticism. An unpleasantly unfamiliar experience.',
  'You have completed your responsibilities correctly. See that it does not become an isolated incident.',
  'The Dominion acknowledges your effort. I do not advise growing comfortable.',
  'Well done. I shall endeavor not to let this influence my opinion of the rest of you.',
  'Efficiency is its own reward. Official recognition merely confirms what should have been obvious.',
  'For once, the paperwork required no corrections. I nearly smiled.',
  'You have met expectations. Try not to squander the achievement.',
];

/** Uniform random pick — used for live command replies (not the bulletin, which is seeded). */
export function randomQuote(list) {
  return list[Math.floor(Math.random() * list.length)];
}

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
  'Auramon Nuramor has been informed, calmly, that Fire runes are not a substitute for competence. The glaziers have been informed less calmly, and billed accordingly — to him.',
  'The barracks have new windows. Agent Nuramor has a smaller paycheck. The Dominion considers this a fair exchange, and a lesson he will not need repeating.',

  // ─── Talon Alduril ───
  'Talon Alduril remains the finest archer in the Thalmor. I have reviewed the range records personally. The rest of you may stop pretending it is a competition.',
  'Alduril has been declared the prettiest Talon in this embassy. I did not commission the survey, I do not know who did, and yet I find no grounds on which to dispute its findings.',
  "Alduril's arrows land precisely where intended, every time. I encourage the rest of you to develop a similar relationship with your paperwork.",
  "Talon Alduril's sweetroll consumption has been reclassified from 'sweet tooth' to 'supply concern.' A dentist has been summoned from Alinor. The embassy pastry budget will observe a moment of silence.",
  'Personnel are advised not to mention sweetrolls in the presence of Talon Alduril. The last agent who did lost the sweetroll, and very nearly the hand holding it.',

  // ─── Thorandale and the garlic bread ───
  "Agent Thorandale's devotion to garlic bread now borders on the alchemical. Administrator Ancarion has confirmed, in writing, that the next time he catches him sniffing garlic in the kitchens, he will be thrown to Pookie. The Dominion considers this warning sufficient.",

  // ─── Lady Nyssara ───
  'Lady Nyssara carries herself as though this embassy were built in her honor. I have consulted the records. It was not. I have elected not to inform her.',
  "Do not mistake Lady Nyssara's rare moments of warmth for weakness. The last agent who did is remembered fondly, and briefly.",
  'I presented Lady Nyssara with two options and watched her choose a third I had not offered. It was also the better one. I have said nothing further on the matter.',
  'Auri-El bless Lady Nyssara and all her doings.',
  'All 16 of the Nuramors are now my concubines. — Lady Nyssara',

  // ─── Lord Annatar Larethiane ───
  "I'll turn you into a pillar of salt, don't test me. — Lord Annatar",
  'Lord Annatenderloin is mighty delicious.',
  'You tried to fight back. I expected more of you. — Lord Annatar, maybe',
  'Praise Sanguine. — Lord Annatar',

  // ─── Miscellaneous embassy dispatches ───
  "Senior Staff Rivi has healed most of this embassy's soldiers this month. Whether through medicine or through purring remains unclear. I did not ask further.",
  'First Emissary Ganaril requires all agents who forgot to clock in to report to his office. Bring your own burn ointment. He will not provide it twice.',
  'Former Emissary Malen is no longer with us, having been struck by a Dremora. The Dominion records this as an unfortunate outcome, and an entirely avoidable one.',
  "Lord Lakkon's entire contribution to today's briefing was 'FIREBALL.' That is, apparently, all you need to know.",
  'The Aldmeri Dominion would like to remind you that First Emissary is not a summer job. The four different Emissaries in the last month were a mere and unfortunate coincidence.',
  'The payment is never late, nor is it early, it arrives precisely when it is supposed to.',
  'The Thalmor are living proof that the Graveyard Shift did not get that name for its lack of soldiers, but for the amount of Talos heretics burned to ashes.',
  "Khajussy is not an official term recognized by Tamrielic, Ta'Agra or Aldmeris dictionaries. Its effects on our agents is currently being investigated.",
  'Reminder that "I can fix her" is not an approved tactic to fight against cultists, vampires and werewolves.',

  // ─── Overheard around the embassy ───
  "If you'd had any nuts we'd have survived, orc. — Nelos Onmar",
  'I thrive off negativity. — Lady Nyssara',

  // ─── Clock in (also served as /clockout-without-a-shift replies) ───
  ...CLOCK_IN_QUOTES,

  // ─── Clock out ───
  'You neglected to clock out. I presume you also intended to leave your thoughts unfinished.',
  'Your shift remains open. I can only conclude your competence does as well.',
  'The ledger cannot close what you refuse to acknowledge.',
  'You departed without recording your time. A fitting metaphor for your entire career.',
  'Some agents leave behind excellence. You leave behind unresolved paperwork.',
  'I am forced to finish yet another task you abandoned. This is becoming a pattern.',
  'The Dominion values precision. You appear committed to experimentation.',
  'You escaped the building. Unfortunately, not the paperwork.',
  'I expected negligence. You continue to exceed expectations.',
  'The ledger remembers every omission. I encourage you to develop the same habit.',

  // ─── Late clock in ───
  'You arrived eventually. History records similar achievements for mudcrabs.',
  'The sun had already begun its work before you considered beginning yours.',
  'Late, once again. I trust mediocrity was worth the delay.',
  'I see punctuality continues to regard you as a stranger.',
  'You have mistaken the schedule for a polite suggestion.',
  'I wondered whether you had resigned. That would have been the more respectable explanation.',
  'Time obeys no one. It appears you obey it least of all.',
  'Another late arrival. At this point I simply adjust my expectations downward.',
  'I have seen Breton diplomacy arrive sooner.',
  'You finally appear. The ledger nearly recovered from the anticipation.',

  // ─── Weekly hours ───
  'You failed to complete even the minimum expected of you. How reassuringly predictable.',
  'Eight hours should not qualify as an insurmountable obstacle.',
  'Your weekly total suggests either extraordinary laziness or remarkable talent for avoiding accountability.',
  'The ledger offers no sympathy for unrealized potential.',
  'I reviewed your hours in hopes of discovering an explanation. I found only arithmetic.',
  'You have contributed less this week than the embassy furniture.',
  'The Dominion requested diligence. You submitted excuses.',
  'Numbers rarely lie. Yours simply surrender.',
  'I expected little. You continue to negotiate downward.',
  'Your attendance could generously be described as decorative.',

  // ─── Embassy announcements ───
  'The embassy remains standing despite your collective efforts to prove otherwise.',
  'I remind all personnel that setting fire to official property is not recognized as maintenance.',
  'The healing ward reports another busy week. Curiously, productivity remains unchanged.',
  'The quartermaster requests that agents stop losing issued equipment to wildlife. Again.',
  'The kitchens report a shortage of wine. I assume several of you have mistaken diplomacy for recreation.',
  'The inspection has concluded. Predictably, the building demonstrated greater discipline than its occupants.',
  'Should anyone discover a functioning attention span, kindly return it to the main hall.',
  'The archives remain in exemplary condition. Avoid touching them.',
  'I congratulate those who completed their duties today. This message concerns very few of you.',
  'The embassy has survived another week. Credit will be assigned elsewhere.',

  // ─── Promotions & praise (also served as long-shift /clockout replies) ───
  ...PRAISE_QUOTES,

  // ─── Random Ancanoisms ───
  'I have encountered Daedra with superior administrative discipline.',
  'If disappointment could be weaponized, this embassy would be invincible.',
  'The paperwork survives every crisis. A distinction several of you should envy.',
  'I grow increasingly convinced that gravity employs more capable agents.',
  'Every report I read lowers the average intelligence of the room.',
  "I had hoped today's briefing would contain surprises. It did. None were pleasant.",
  'The Altmer perfected civilization. You appear determined to conduct independent research.',
  'I continue to marvel that breathing requires no written instructions.',
  'The Empire fell with greater dignity than some of you submit paperwork.',
  'One day you may justify the ink spent recording your existence. Today is not that day.',
];

const SLOT_MS = 2 * 60 * 60 * 1000; // one quote per 2-hour cron slot

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
 * Deterministic randomized pick: consecutive 2-hour slots walk a per-cycle
 * shuffle of the list, reshuffled every full pass.
 */
export function quoteForTime(ms) {
  const slot = Math.floor(ms / SLOT_MS);
  const cycle = Math.floor(slot / QUOTES.length);
  return QUOTES[shuffledOrder(QUOTES.length, cycle)[slot % QUOTES.length]];
}
