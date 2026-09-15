/**
 * Progression math (PRD §13–§15) — pure functions, shared by the judge
 * worker and the leaderboard route. All formulas documented; no hidden
 * tuning.
 */

/** Implied opponent rating per difficulty (Elo anchor). */
export const DIFFICULTY_RATING = { easy: 800, medium: 1200, hard: 1600, expert: 2000 };

/** First-accept XP per difficulty (PRD §14). Repeats pay REPEAT_XP. */
export const XP_TABLE = { easy: 50, medium: 100, hard: 200, expert: 350 };
export const REPEAT_XP = 10;

/** Flat rating cost of a rejected submit (keeps stakes, allows practice). */
export const REJECT_RATING_COST = 2;

export const ELO_K = 32;

/** Rank ladder — thresholds configurable here, never in the frontend. */
export const RANKS = [
  { min: 2200, name: "Grandmaster" },
  { min: 2000, name: "Master" },
  { min: 1800, name: "Diamond" },
  { min: 1600, name: "Platinum" },
  { min: 1400, name: "Gold" },
  { min: 1200, name: "Silver" },
  { min: -Infinity, name: "Bronze" },
];

export function rankFor(rating) {
  return RANKS.find((r) => (rating ?? 1000) >= r.min)?.name ?? "Bronze";
}

/** Elo win vs the difficulty anchor. */
export function eloWinDelta(userRating, difficulty) {
  const opp = DIFFICULTY_RATING[difficulty] ?? 1200;
  const expected = 1 / (1 + Math.pow(10, (opp - userRating) / 400));
  return Math.round(ELO_K * (1 - expected));
}

/** Efficiency: faster runs keep more of the 15 (relative to the limit). */
export function efficiencyPoints(executionTimeMs, timeLimitMs) {
  const limit = Math.max(1, timeLimitMs ?? 2000);
  const ratio = Math.min(1, Math.max(0, (executionTimeMs ?? limit) / limit));
  return Math.round(15 * (1 - ratio));
}

/** Speed: fewer submissions = fuller 10. attemptNumber is 1-based. */
export function speedPoints(attemptNumber) {
  if (attemptNumber <= 1) return 10;
  if (attemptNumber === 2) return 8;
  if (attemptNumber === 3) return 6;
  if (attemptNumber <= 5) return 4;
  return 2;
}

/** Multiset line diff size: max(added, removed). A 1-line fix scores 1. */
export function changedLines(before, after) {
  const count = (lines) => {
    const m = new Map();
    for (const l of lines) m.set(l, (m.get(l) ?? 0) + 1);
    return m;
  };
  const a = count(String(before ?? "").split("\n"));
  const b = count(String(after ?? "").split("\n"));
  let added = 0;
  let removed = 0;
  for (const [line, n] of b) added += Math.max(0, n - (a.get(line) ?? 0));
  for (const [line, n] of a) removed += Math.max(0, n - (b.get(line) ?? 0));
  return Math.max(added, removed);
}

/** Quality: small, surgical fixes earn the 5. */
export function qualityPoints(changed) {
  return changed <= 10 ? 5 : 2;
}

/** Every 250 XP is a level. */
export function levelFor(xp) {
  return 1 + Math.floor(Math.max(0, xp ?? 0) / 250);
}

/**
 * Full verdict math. `ctx`: { difficulty, executionTimeMs, timeLimitMs,
 * attemptNumber, starterText, solutionText }.
 * Rejected → all zeros (correctness gates everything, PRD §13).
 */
export function scoreSubmission(ctx) {
  const changed = changedLines(ctx.starterText ?? "", ctx.solutionText ?? "");
  const correctness = 70;
  const efficiency = efficiencyPoints(ctx.executionTimeMs, ctx.timeLimitMs);
  const speed = speedPoints(ctx.attemptNumber ?? 1);
  const quality = qualityPoints(changed);
  return {
    correctness,
    efficiency,
    speed,
    quality,
    changedLines: changed,
    total: correctness + efficiency + speed + quality,
  };
}
