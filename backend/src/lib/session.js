import { randomBytes, createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { env } from "../env.js";

/**
 * Session management — opaque tokens, no auth library.
 *
 *   sessions: { tokenHash (sha256, unique), userId, createdAt, updatedAt,
 *               expiresAt, ip, userAgent }
 *
 * Cookie `Nox.session` (httpOnly, Lax, Secure in prod, 7-day max-age).
 * Sliding expiry mirrors the old behavior: 7-day sessions refreshed when
 * the row hasn't been touched for 24h. TTL index (see db.js) sweeps the
 * dead rows even if no worker ever cleans them.
 */

export const SESSION_COOKIE = "Nox.session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

const secureCookies = () => env.NODE_ENV === "production";

/**
 * SameSite policy — the API and the frontend live on different origins in
 * production (Render API + Vercel app), so the session cookie must be sent
 * on cross-site fetch() calls (credentials: "include").
 *
 *   - production → SameSite=None; Secure (cross-site fetch sends it)
 *   - dev        → SameSite=Lax (localhost:3000 ↔ localhost:4000 are
 *                  same-site, so Lax works and keeps dev simple)
 *
 * SameSite=Lax in production is the classic "login 200s but /users/me
 * 401s" bug: the browser stores Set-Cookie but never sends it back on
 * cross-site fetch, and the user row still gets created in MongoDB.
 */
const sameSite = () => (env.NODE_ENV === "production" ? "None" : "Lax");

export function parseCookies(req) {
  const out = {};
  const header = req?.headers?.cookie;
  if (!header) return out;
  for (const part of String(header).split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    if (k && out[k] === undefined) {
      try {
        out[k] = decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        out[k] = part.slice(i + 1).trim();
      }
    }
  }
  return out;
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function setSessionCookie(res, token) {
  // Clear must mirror these attributes exactly or the browser keeps the
  // old cookie (see clearSessionCookie below).
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite()}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secureCookies() ? "; Secure" : ""}`
  );
}

export function clearSessionCookie(res) {
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${sameSite()}; Max-Age=0${secureCookies() ? "; Secure" : ""}`
  );
}

export async function createSession(db, userId, { ip, userAgent } = {}) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.collection("sessions").insertOne({
    tokenHash: hashToken(token),
    userId: new ObjectId(String(userId)),
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    ip: ip ?? null,
    userAgent: userAgent ?? null,
  });
  return token;
}

function clientIp(req) {
  return (
    req.ip ??
    req.headers?.["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    null
  );
}

/**
 * Resolve the session user from the request cookie.
 * Returns { user, session } or null. When `res` is given, sliding expiry
 * is refreshed (daily) and the cookie re-issued. Never throws.
 */
export async function getSessionUser(db, req, res = null) {
  try {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (!token) return null;
    const row = await db.collection("sessions").findOne({ tokenHash: hashToken(token) });
    if (!row || row.expiresAt <= new Date()) {
      if (row) {
        await db.collection("sessions").deleteOne({ _id: row._id }).catch(() => {});
      }
      return null;
    }
    const user = await db.collection("user").findOne({ _id: row.userId });
    if (!user) {
      await db.collection("sessions").deleteOne({ _id: row._id }).catch(() => {});
      return null;
    }
    if (res && Date.now() - new Date(row.updatedAt).getTime() > REFRESH_AFTER_MS) {
      const now = new Date();
      await db
        .collection("sessions")
        .updateOne(
          { _id: row._id },
          { $set: { updatedAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) } }
        )
        .catch(() => {});
      setSessionCookie(res, token);
    }
    return { user, session: row };
  } catch {
    return null;
  }
}

export async function destroySession(db, req) {
  try {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) {
      await db.collection("sessions").deleteOne({ tokenHash: hashToken(token) });
    }
  } catch {
    /* logout is best-effort */
  }
}

/** Request metadata for session rows (same header preference as rateLimit). */
export function requestMeta(req) {
  return {
    ip: clientIp(req),
    userAgent: req.headers?.["user-agent"]?.toString().slice(0, 200) ?? null,
  };
}
