import { randomBytes, createHash } from "node:crypto";
import { ObjectId } from "mongodb";

/**
 * Single-use email tokens (verification + password reset).
 *
 *   emailTokens: { tokenHash (sha256, unique), userId, email, type,
 *                  expiresAt, usedAt, createdAt }
 *
 * Raw tokens only ever travel inside emailed links; the DB keeps hashes.
 * TTL index (see db.js) sweeps expired rows.
 */

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export async function issueToken(db, { userId, email, type, ttlMs }) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.collection("emailTokens").insertOne({
    tokenHash: hashToken(token),
    userId: new ObjectId(String(userId)),
    email: String(email).toLowerCase(),
    type,
    expiresAt: new Date(now.getTime() + ttlMs),
    usedAt: null,
    createdAt: now,
  });
  return token;
}

/** Atomically consume a live token; null when missing/expired/used. */
export async function consumeToken(db, { token, type }) {
  try {
    if (!token) return null;
    const row = await db.collection("emailTokens").findOneAndUpdate(
      { tokenHash: hashToken(token), type, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after" }
    );
    return row ?? null;
  } catch {
    return null;
  }
}
