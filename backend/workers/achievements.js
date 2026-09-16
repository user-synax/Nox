/**
 * Achievements — backend-owned catalog + evaluation (PRD §6).
 *
 * Like ranks, definitions live here (never in the frontend) and are
 * exposed via GET /achievements. Unlocks are stored in the
 * `userAchievements` collection ({ userId: string, key, unlockedAt },
 * unique on userId+key) and awarded inside workers/judge.js on accepted
 * submits, where all progression math already runs.
 */

export const ACHIEVEMENT_XP = 25;

export const ACHIEVEMENTS = [
  {
    key: "first-fix",
    name: "First Fix",
    description: "Accept your first challenge.",
  },
  {
    key: "clean-shot",
    name: "Clean Shot",
    description: "Accept a challenge on the first attempt.",
  },
  {
    key: "giant-slayer",
    name: "Giant Slayer",
    description: "Accept a hard challenge.",
  },
  {
    key: "titan-slayer",
    name: "Titan Slayer",
    description: "Accept an expert challenge.",
  },
  {
    key: "week-of-fire",
    name: "Week of Fire",
    description: "Reach a 7-day solve streak.",
  },
  {
    key: "polyglot",
    name: "Polyglot",
    description: "Accept challenges in 2 or more languages.",
  },
  {
    key: "gold-standard",
    name: "Gold Standard",
    description: "Reach 1400+ rating.",
  },
  {
    key: "double-digits",
    name: "Double Digits",
    description: "Accept 10 challenges.",
  },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export function achievementByKey(key) {
  return ACHIEVEMENT_MAP.get(key) ?? null;
}

/**
 * Which achievements does THIS accepted solve earn?
 * `ctx`: { difficulty, attemptNumber, firstSolve, newRating,
 *          newLongestStreak, newSolvedCount, languageCount, already: Set }
 * `already` holds previously unlocked keys — evaluation is pure; the
 * judge handles persistence (idempotent via the unique index).
 */
export function evaluateAchievements(ctx) {
  const earned = [];
  const has = (key) => ctx.already?.has(key);
  const give = (key) => {
    if (!has(key) && !earned.includes(key)) earned.push(key);
  };
  if (ctx.firstSolve) give("first-fix");
  if (ctx.attemptNumber <= 1) give("clean-shot");
  if (ctx.difficulty === "hard") give("giant-slayer");
  if (ctx.difficulty === "expert") give("titan-slayer");
  if ((ctx.newLongestStreak ?? 0) >= 7) give("week-of-fire");
  if ((ctx.languageCount ?? 0) >= 2) give("polyglot");
  if ((ctx.newRating ?? 0) >= 1400) give("gold-standard");
  if ((ctx.newSolvedCount ?? 0) >= 10) give("double-digits");
  return earned;
}
