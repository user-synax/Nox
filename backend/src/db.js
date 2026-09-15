import { MongoClient } from "mongodb";

/**
 * Native driver connection (shared with the Better Auth Mongo adapter).
 * Creates the indexes auth depends on: unique email + unique username,
 * unique profileStats.userId, TTL cleanup for sessions/verifications.
 *
 * PRD §28: User.email + User.username are unique identity handles
 * (username is the public /u/[username] handle).
 */
export async function connectDB(uri) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // database name comes from the URI path

  await db
    .collection("user")
    .createIndex({ email: 1 }, { unique: true, name: "user_email_unique" });
  // Partial index: only docs that actually carry a username participate,
  // so legacy/system docs without one can never collide.
  await db.collection("user").createIndex(
    { username: 1 },
    {
      unique: true,
      name: "user_username_unique",
      partialFilterExpression: { username: { $exists: true } },
    }
  );

  // One stats doc per user (PRD §28 ProfileStats).
  await db
    .collection("profileStats")
    .createIndex({ userId: 1 }, { unique: true, name: "profileStats_userId_unique" });
  // Leaderboard sort paths (PRD §16): rating ladder + XP race.
  await db
    .collection("profileStats")
    .createIndex({ rating: -1, xp: -1 }, { name: "profileStats_rating_xp" });
  await db
    .collection("profileStats")
    .createIndex({ xp: -1, rating: -1 }, { name: "profileStats_xp_rating" });

  // Dev-only email outbox (see auth.js) — fast lookup by email.
  await db
    .collection("devOutbox")
    .createIndex({ email: 1, kind: 1 }, { name: "devOutbox_email_kind" });

  // Challenges (PRD §7): unique slug + catalog filter/sort paths.
  await db
    .collection("challenges")
    .createIndex({ slug: 1 }, { unique: true, name: "challenges_slug_unique" });
  await db
    .collection("challenges")
    .createIndex({ status: 1, createdAt: -1 }, { name: "challenges_status_created" });
  await db
    .collection("challenges")
    .createIndex(
      { status: 1, difficulty: 1, language: 1, category: 1 },
      { name: "challenges_status_filters" }
    );
  await db
    .collection("challenges")
    .createIndex({ status: 1, solveCount: -1 }, { name: "challenges_status_popular" });

  // Execution queue (workers/queue.js): claim order + owner history.
  await db
    .collection("runs")
    .createIndex({ status: 1, createdAt: 1 }, { name: "runs_status_created" });
  await db
    .collection("runs")
    .createIndex({ userId: 1, createdAt: -1 }, { name: "runs_user_created" });

  // Submissions (immutable judging records) + rating events (feed).
  await db
    .collection("submissions")
    .createIndex({ userId: 1, challengeId: 1, createdAt: -1 }, { name: "submissions_user_challenge" });
  await db
    .collection("submissions")
    .createIndex({ userId: 1, createdAt: -1 }, { name: "submissions_user_created" });
  await db
    .collection("ratingEvents")
    .createIndex({ createdAt: -1 }, { name: "ratingEvents_created" });
  await db
    .collection("ratingEvents")
    .createIndex({ userId: 1, createdAt: -1 }, { name: "ratingEvents_user_created" });
  // Weekly track filters (language/category leaderboards, §16).
  await db
    .collection("ratingEvents")
    .createIndex({ createdAt: -1, language: 1 }, { name: "ratingEvents_created_lang" });
  await db
    .collection("ratingEvents")
    .createIndex({ createdAt: -1, category: 1 }, { name: "ratingEvents_created_cat" });

  // Solutions + comments + likes (PRD §19, solved-only reads).
  await db
    .collection("solutions")
    .createIndex({ challengeId: 1, createdAt: -1 }, { name: "solutions_challenge_created" });
  await db
    .collection("solutions")
    .createIndex(
      { challengeId: 1, likeCount: -1, createdAt: -1 },
      { name: "solutions_challenge_top" }
    );
  await db
    .collection("solutions")
    .createIndex({ authorId: 1, createdAt: -1 }, { name: "solutions_author_created" });
  // Community feed: newest-first across challenges.
  await db
    .collection("solutions")
    .createIndex({ createdAt: -1 }, { name: "solutions_created" });
  await db
    .collection("comments")
    .createIndex({ solutionId: 1, createdAt: 1 }, { name: "comments_solution_thread" });
  await db
    .collection("comments")
    .createIndex({ authorId: 1, createdAt: -1 }, { name: "comments_author_created" });
  // One like per (target × user); targetId stores the ObjectId as a string
  // so solutions and comments share the collection safely.
  await db.collection("likes").createIndex(
    { targetType: 1, targetId: 1, userId: 1 },
    { unique: true, name: "likes_target_user_unique" }
  );
  await db
    .collection("likes")
    .createIndex({ userId: 1, targetType: 1 }, { name: "likes_user_type" });

  // Worker heartbeats (liveness for the execution queue status).
  await db
    .collection("workerHeartbeats")
    .createIndex({ workerId: 1 }, { unique: true, name: "workerHeartbeats_id_unique" });
  await db
    .collection("workerHeartbeats")
    .createIndex({ lastBeat: -1 }, { name: "workerHeartbeats_beat" });

  // Better Auth session + verification collections: TTL on expiry so
  // stale rows disappear even if a worker never cleans them.
  // (Collections are created lazily — createIndex creates them.)
  try {
    await db
      .collection("session")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "session_expires_ttl" });
  } catch {
    /* index may already exist with different options — non-fatal */
  }
  try {
    await db
      .collection("verification")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "verification_expires_ttl" });
  } catch {
    /* non-fatal */
  }

  return { client, db };
}
