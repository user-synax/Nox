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

  // Dev-only email outbox (see auth.js) — fast lookup by email.
  await db
    .collection("devOutbox")
    .createIndex({ email: 1, kind: 1 }, { name: "devOutbox_email_kind" });

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
