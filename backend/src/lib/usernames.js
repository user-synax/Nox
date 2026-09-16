import { randomBytes } from "node:crypto";

/**
 * Username derivation for accounts created without one (OAuth signups).
 * Usernames are immutable URL handles, so generation must be decent on
 * the first try: "Ayush Sharma" → ayush_sharma, "ayush@gmail" → ayush.
 * (Moved verbatim from the old Better Auth hooks in src/auth.js.)
 */

export function socialUsernameBase(name, email) {
  const raw = name || String(email ?? "").split("@")[0] || "debugger";
  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 15);
  return clean.length >= 3 ? clean : "debugger";
}

/** First free handle: base, base_2 … base_10, then a random fallback. */
export async function uniqueUsername(db, base) {
  for (let i = 0; i < 10; i++) {
    const suffix = i === 0 ? "" : `_${i + 1}`;
    const candidate = base.slice(0, 20 - suffix.length) + suffix;
    const taken = await db
      .collection("user")
      .findOne({ username: candidate }, { projection: { _id: 1 } });
    if (!taken) return candidate;
  }
  return `user_${randomBytes(4).toString("hex")}`;
}
