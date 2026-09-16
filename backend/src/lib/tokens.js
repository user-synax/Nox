import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";

/**
 * Email tokens: single-use verification LINKS are gone — signup
 * verification is a 6-digit OTP (type "otp"), password reset stays a
 * link (type "reset").
 *
 *   emailTokens: { tokenHash (sha256, unique), userId, email, type,
 *                  expiresAt, usedAt, attempts, createdAt }
 *
 * Raw secrets only ever travel inside emails; the DB keeps hashes.
 * OTPs are low-entropy by design — safety comes from 10-minute expiry,
 * 5-attempt lockout, single use, and per-IP rate limits on the endpoint.
 * TTL index (see db.js) sweeps expired rows.
 */

export const RESET_TTL_MS = 60 * 60 * 1000;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

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
    const res = await db.collection("emailTokens").findOneAndUpdate(
      { tokenHash: hashToken(token), type, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after" }
    );
    // mongodb ≥v5 returns the doc directly; older returns { value }.
    const row = res?.value !== undefined ? res.value : res;
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Issue a fresh 6-digit OTP, invalidating any live ones for the user.
 * Returns the plain code (emailed; never persisted).
 */
export async function issueOtp(db, { userId, email }) {
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const now = new Date();
  const col = db.collection("emailTokens");
  await col
    .deleteMany({ userId: new ObjectId(String(userId)), type: "otp", usedAt: null })
    .catch(() => {});
  await col.insertOne({
    tokenHash: hashToken(code),
    userId: new ObjectId(String(userId)),
    email: String(email).toLowerCase(),
    type: "otp",
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    usedAt: null,
    attempts: 0,
    createdAt: now,
  });
  return code;
}

/**
 * Check an OTP. Wrong guesses increment attempts (locked at
 * OTP_MAX_ATTEMPTS); a match burns the row. Returns the token row or null.
 */
export async function consumeOtp(db, { email, code }) {
  try {
    const clean = String(code ?? "").trim();
    if (!/^[0-9]{6}$/.test(clean)) return null;
    const col = db.collection("emailTokens");
    const row = await col.findOne({
      email: String(email ?? "").toLowerCase(),
      type: "otp",
      usedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: OTP_MAX_ATTEMPTS },
    });
    if (!row) return null;
    const a = Buffer.from(hashToken(clean), "utf8");
    const b = Buffer.from(row.tokenHash, "utf8");
    const match = a.length === b.length && timingSafeEqual(a, b);
    if (!match) {
      await col.updateOne({ _id: row._id }, { $inc: { attempts: 1 } }).catch(() => {});
      return null;
    }
    await col.updateOne({ _id: row._id }, { $set: { usedAt: new Date() } }).catch(() => {});
    return row;
  } catch {
    return null;
  }
}
