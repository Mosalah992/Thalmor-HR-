// Embassy bulletin quotes — posted to #clock-in every 3 hours by the cron
// trigger. Rotates deterministically: each 3-hour slot since epoch maps to the
// next quote, so the full list cycles (~7 days) with no repeats in between.

export const QUOTES = [
  // ── Original dispatch board ─────────────────────────────────────────────
  "The Dominion waits for no one. Especially not Gi'Zaro from Staff.",
  'If Lady Celeriel can keep the ship afloat through spreadsheets and incurable FOMO, you can make it to muster on time.',
  "Lord Malen has only three clock-ins recorded. Somehow that's still more punctual than you.",
  "Lord Verux arrived before the meeting. The meeting hadn't been scheduled yet.",
  'Ancarion has already reorganized the armory, filed the paperwork, and submitted the requisition request. Where are you?',
  "Sir Havi is busy Havimaxxing. What's your excuse?",
  'Lady Yhavna has 43 clock-ins. She is beginning to suspect she works here.',
  "Falcril has clocked in 42 times. At this point we're not sure he ever leaves.",
  'Jo\'Khazan arrived on time. The rest of you have shamed the Khajiiti people.',
  "Ak'karim challenged the chain of command and still made it to roll call.",
  'Orion Du Bois went OOC three times this week and still managed to clock in.',
  "The Embassy would like to remind staff that 'I overslept' is not an approved diplomatic response.",
  "Every minute you're late, Lady Celeriel creates another spreadsheet about it.",
  'The Eye of the Dominion sees all. The attendance ledger sees more.',
  'Clock in on time or be assigned to inventory moonstone with Ancarion for eight hours.',
  'The Black Talons strike swiftly. HR strikes with paperwork.',
  'Remember: the chain of command begins with showing up.',
  'The White-Gold Concordat took less negotiation than getting some recruits to attend training.',

  // ── Break room posters ──────────────────────────────────────────────────
  '"Lord Verux is not angry. He has simply added your name to a list."',
  '"Congratulations on arriving only five minutes late. The investigation has been downgraded to a conversation."',
  '"If Gi\'Zaro can find the Embassy, so can you."',
  '"Attendance is mandatory. Enthusiasm remains optional."',
  '"Clock in. Clock out. Overthrow human dominance. In that order."',

  // ── From the ledger itself ──────────────────────────────────────────────
  'Lord Annatar of the Black Talons holds the record: 45 clock-ins. The Talons strike swiftly. Apparently they also arrive early.',
  'Lord Annatar: 45. Lady Yhavna: 43. Falcril: 42. This is now a race, and you are losing it from bed.',
  'Alaren Velrith clocked in at six in the morning. Nobody asked him to. Be like Alaren, minus the insomnia.',
  'Ariniel has 37 clock-ins. Ambassadors are supposed to be away on diplomatic missions. She simply refuses to be. Where are YOU?',
  'Akira Frey, Ambassador, 33 clock-ins. Diplomacy is mostly showing up. So is everything else.',
  "Lady Alduril of the Black Talons: 33 clock-ins, zero complaints on file. Lord Verux finds this statistically suspicious and personally delightful.",
  'Ka\'Taravi and Iwelien are tied at 31 clock-ins. The Black Talons do everything in formation, including attendance.',
  "Ganaril has 27 clock-ins and zero excuses on file. HR has opened an inquiry into how this is possible.",
  "Lord Lakkon's personnel file contains a single word: FIREBALL. It also contains 24 clock-ins. Correlation unclear. Compliance mandatory.",
  'Milinuen and Iireussa Thilinaine are tied at 22 clock-ins each. Sibling rivalry is now an approved motivational technique.',
  "Ja'Sharr sees nothing and still finds the clock-in channel more reliably than recruits with two working eyes.",
  'Fen\'ril Clawheart is a Bosmer in an Altmer navy and still out-attends half of you.',
  'Aethelm of the Eagle Guard clocked in at 5:24 in the morning. The eagles were still asleep. He was not.',
  'Rivi has exactly one clock-in. It was flawless. The Embassy wishes to clarify that quality over quantity is NOT attendance policy.',
  'Lady Valynwe has eight clock-ins and one recorded compliment from the bot. The bot is not wrong. The bot is also counting.',
  'Eris Greyrat is listed as ACTIVE. The question in the margin reads: "but are they present?" Do not let this question be asked about you.',
  'Vincent Vithmiris will receive training as soon as he shows up. Emphasis, recruit, on "shows up."',
  'Elenwen was demoted to recruit and restored to soldier by Lord Malen himself. Redemption arcs are real. So is the ledger.',
  "Eidolon Juno infiltrated the Ninth Vanguard undercover. You can't even infiltrate the muster line before nine.",
  "Gor'zan of the Auxiliary has trained exactly once. He is still ahead of several of you. An Orc. In an Altmer navy. Think about that.",
  'House Nuramor sent a dozen recruits this week alone. If even half of them clock in, several senior soldiers are about to be publicly embarrassed.',
  'Celborn is on approved leave until the 10th. Note the word "approved." Your pillow is not an approving authority.',
  'Oreve Caemorin is working overtime in another plane of existence and still filed the proper notice. Take notes.',
  "Dar-ri Jhazar was moved to regular recruit. Movement is encouraged. Try moving toward the clock-in channel.",
  "M'harra, the Daft has no recorded clock-ins. M'harra has an excuse built into the name. You do not.",
  'Zerk. One name. One syllable. Zero recorded clock-ins. Brevity is not the same as attendance.',
  'Baron Telandor advises Command. Command advises you to clock in.',
  'The Embassy reminds new arrivals that "Just Joined" is a status, not a lifestyle.',
  'The Dominion conquered the Summerset Isles. You can conquer your alarm.',
  'INACTIVE is written in the ledger in red ink. Lady Celeriel bought the red ink in bulk. Do not make it a sound investment.',
  'Recruits marked "CHECK" will be checked. Recruits marked "ACTIVE" will be verified. Recruits marked nothing should be very, very worried.',
  'The Eagle Guard watches the skies. The Black Talons watch the shadows. Lady Celeriel watches column I.',
];

const SLOT_MS = 3 * 60 * 60 * 1000; // one quote per 3-hour cron slot

/** Deterministic pick: consecutive 3-hour slots walk the list in order. */
export const quoteForTime = (ms) => QUOTES[Math.floor(ms / SLOT_MS) % QUOTES.length];
