/**
 * PRD §28 ProfileStats defaults (starting rating 1000 per §14).
 * Shared by the signup seed (auth.js) and profile updates (routes/users.js).
 */
export function defaultProfileStats(userId) {
  const now = new Date();
  return {
    userId,
    rating: 1000,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    solvedCount: 0,
    acceptedCount: 0,
    attemptCount: 0,
    submissionCount: 0,
    successRate: 0,
    hardestSolvedChallengeId: null,
    preferredLanguages: [],
    skills: {},
    createdAt: now,
    updatedAt: now,
  };
}
