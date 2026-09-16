import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing — dependency-free (node:crypto scrypt).
 *
 * New hashes: `nox1$<saltHex>$<derivedHex>` (N=16384, r=16, p=1, dkLen=64,
 * NFKC-normalized — deliberately the same parameters Better Auth used, so
 * migrated `salt:derived` hashes verify with the same code path).
 * Legacy hashes (migrated from the `account` collection) verify as-is and
 * are transparently re-hashed to nox1 on the next successful login.
 */

const N = 16384;
const R = 16;
const P = 1;
const DKLEN = 64;

function scryptKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      String(password ?? "").normalize("NFKC"),
      salt,
      DKLEN,
      { N, r: R, p: P, maxmem: 128 * N * R * 2 },
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptKey(password, salt);
  return `nox1$${salt}$${key.toString("hex")}`;
}

/** { ok, legacy } — legacy=true means re-hash to nox1 on success. */
export async function verifyPassword(stored, password) {
  try {
    if (typeof stored !== "string" || typeof password !== "string") {
      return { ok: false, legacy: false };
    }
    let salt;
    let expected;
    let legacy = false;
    if (stored.startsWith("nox1$")) {
      const parts = stored.split("$");
      if (parts.length !== 3) return { ok: false, legacy: false };
      [, salt, expected] = parts;
    } else {
      // Legacy Better Auth shape: 16-byte hex salt + 64-byte hex key.
      const m = /^([0-9a-f]{32}):([0-9a-f]{128})$/.exec(stored);
      if (!m) return { ok: false, legacy: false };
      [, salt, expected] = m;
      legacy = true;
    }
    const key = await scryptKey(password, salt);
    const a = Buffer.from(key.toString("hex"), "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return { ok: false, legacy };
    return { ok: timingSafeEqual(a, b), legacy };
  } catch {
    return { ok: false, legacy: false };
  }
}
