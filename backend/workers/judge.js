import {
  XP_TABLE,
  REPEAT_XP,
  REJECT_RATING_COST,
  eloWinDelta,
  scoreSubmission,
  levelFor,
} from "./scoring.js";
import { defaultProfileStats } from "../src/lib/stats.js";

/**
 * Submit judging — runs against HIDDEN tests, then settles progression.
 *
 * Accepted ⇔ every hidden test passed (correctness is the only gate).
 * Stored results keep { name, passed, error? } — never input/expected/
 * actual, so reading your own submission can't leak hidden data.
 * The submission transitions pending → terminal exactly once.
 */

function todayStr(d = new Date()) {  return d.toISOString().slice(0, 10);
}
function yesterdayStr() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function starterText(challenge) {
  return (challenge?.starterFiles ?? []).map((f) => f.content ?? "").join("\n");
}
function solutionText(files) {
  return (files ?? []).map((f) => f.content ?? "").join("\n");
}

export async function judgeSubmit(db, job, exec) {
  const submissions = db.collection("submissions");
  const statsCol = db.collection("profileStats");
  const events = db.collection("ratingEvents");
  const userId = job.userId.toString();

  const priorCount = await submissions.countDocuments({
    userId: job.userId,
    challengeId: job.challengeId,
  });
  const attemptNumber = priorCount + 1;
  const priorAccepted = await submissions.findOne(
    { userId: job.userId, challengeId: job.challengeId, status: "accepted" },
    { projection: { _id: 1 } }
  );

  const allPassed =
    exec.status === "passed" && (exec.testsTotal ?? 0) > 0;
  const status = allPassed
    ? "accepted"
    : exec.status === "failed"
      ? "rejected"
      : exec.status; // timeout | runtime-error | system-error pass through

  const stripped = (exec.results ?? []).map((r) => ({
    name: r.name,
    passed: !!r.passed,
    ...(r.error ? { error: String(r.error).slice(0, 300) } : {}),
  }));

  let score = { correctness: 0, efficiency: 0, speed: 0, quality: 0, changedLines: 0, total: 0 };
  let xpAwarded = 0;
  let ratingDelta = 0;
  let solveLanguage = job.language ?? null;
  let solveCategory = job.category ?? null;
  if (status === "accepted") {
    const challenge = await db
      .collection("challenges")
      .findOne(
        { _id: job.challengeId },
        { projection: { difficulty: 1, starterFiles: 1, language: 1, category: 1 } }
      );
    const difficulty = challenge?.difficulty ?? "medium";
    solveLanguage = job.language ?? challenge?.language ?? null;
    solveCategory = job.category ?? challenge?.category ?? null;
    score = scoreSubmission({
      difficulty,
      executionTimeMs: exec.executionTimeMs,
      timeLimitMs: job.timeLimitMs,
      attemptNumber,
      starterText: starterText(challenge),
      solutionText: solutionText(job.files),
    });
    const stats = await statsCol.findOne({ userId });
    const rating = stats?.rating ?? 1000;
    xpAwarded = priorAccepted ? REPEAT_XP : (XP_TABLE[difficulty] ?? 100);
    ratingDelta = eloWinDelta(rating, difficulty);
  } else if (status === "rejected") {
    ratingDelta = -REJECT_RATING_COST;
  }

  // Progression update (stats row always exists post-seed, upsert guards).
  const now = new Date();
  const current = (await statsCol.findOne({ userId })) ?? defaultProfileStats(userId);
  const newRating = (current.rating ?? 1000) + ratingDelta;
  const newXp = (current.xp ?? 0) + xpAwarded;
  let { currentStreak = 0, longestStreak = 0 } = current;
  const lastActive = current.lastActiveDate ?? null;
  if (status === "accepted") {
    const today = todayStr(now);
    if (lastActive === today) {
      /* same-day solve: streak untouched */
    } else if (lastActive === yesterdayStr()) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }
  const set = {
    rating: newRating,
    xp: newXp,
    level: levelFor(newXp),
    currentStreak,
    longestStreak,
    updatedAt: now,
  };
  if (status === "accepted") {
    set.lastActiveDate = todayStr(now);
    set.acceptedCount = (current.acceptedCount ?? 0) + 1;
    if (!priorAccepted) set.solvedCount = (current.solvedCount ?? 0) + 1;
  }
  if (status !== "system-error") {
    set.attemptCount = (current.attemptCount ?? 0) + 1;
    set.submissionCount = (current.submissionCount ?? 0) + 1;
  }
  const acceptedCount = set.acceptedCount ?? current.acceptedCount ?? 0;
  const submissionCount = set.submissionCount ?? current.submissionCount ?? 0;
  set.successRate = submissionCount > 0 ? acceptedCount / submissionCount : 0;
  // $setOnInsert only fires on insert — createdAt included safely.
  // Strip every $set path: Mongo rejects same-path $set + $setOnInsert.
  const insertDefaults = defaultProfileStats(userId);
  for (const k of Object.keys(set)) delete insertDefaults[k];
  const inc = {};
  if (status === "accepted" && xpAwarded > 0) {
    // Per-track XP powers language/category leaderboards (§16).
    // $inc creates the nested maps on old docs that predate them.
    if (solveLanguage) inc[`xpByLanguage.${solveLanguage}`] = xpAwarded;
    if (solveCategory) inc[`xpByCategory.${solveCategory}`] = xpAwarded;
    if (!priorAccepted) {
      if (solveLanguage) inc[`solvesByLanguage.${solveLanguage}`] = 1;
      if (solveCategory) inc[`solvesByCategory.${solveCategory}`] = 1;
    }
  }
  const updateOp = { $set: set, $setOnInsert: insertDefaults };
  if (Object.keys(inc).length > 0) updateOp.$inc = inc;
  await statsCol.updateOne({ userId }, updateOp, { upsert: true });

  // Rating event feeds weekly leaderboard + recent solves.
  if (status === "accepted" || status === "rejected") {
    await events
      .insertOne({
        userId: job.userId,
        challengeId: job.challengeId,
        challengeSlug: job.challengeSlug,
        challengeTitle: job.challengeTitle,
        difficulty: job.difficulty,
        language: solveLanguage,
        category: solveCategory,
        accepted: status === "accepted",
        score: score.total,
        ratingDelta,
        xpAwarded,
        createdAt: now,
      })
      .catch(() => {});
  }

  // Single terminal transition for the immutable submission.
  const update = {
    status,
    testsPassed: exec.testsPassed ?? 0,
    testsTotal: exec.testsTotal ?? 0,
    results: stripped,
    executionTimeMs: exec.executionTimeMs ?? null,
    score: score.total,
    scoreBreakdown:
      status === "accepted"
        ? {
            correctness: score.correctness,
            efficiency: score.efficiency,
            speed: score.speed,
            quality: score.quality,
          }
        : null,
    xpAwarded,
    ratingDelta,
    error: exec.error ?? null,
    completedAt: now,
  };
  await submissions.updateOne(
    { _id: job.submissionId, status: "pending" },
    { $set: update }
  );
  // Challenge counters: every judged submit is an attempt; accepts solve.
  if (status !== "system-error" && job.challengeId) {
    await db
      .collection("challenges")
      .updateOne(
        { _id: job.challengeId },
        { $inc: { attemptCount: 1, ...(status === "accepted" ? { solveCount: 1 } : {}) } }
      )
      .catch(() => {});
  }
  const submission = await submissions.findOne({ _id: job.submissionId });
  return { submission, score, xpAwarded, ratingDelta, firstSolve: !priorAccepted && status === "accepted" };
}
