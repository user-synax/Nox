import { randomBytes, createHash } from "node:crypto";
import { env } from "../env.js";
import { defaultProfileStats } from "./stats.js";
import { socialUsernameBase, uniqueUsername } from "./usernames.js";
import { createSession, setSessionCookie, requestMeta } from "./session.js";
import { emailDomainAllowed, ALLOWED_EMAIL_DOMAINS } from "../validation.js";

/**
 * Google OAuth code flow — hand-rolled, no auth library.
 *
 * Contract (unchanged from Better Auth, so the frontend is untouched):
 *   POST /api/auth/sign-in/social { provider, callbackURL,
 *     newUserCallbackURL, errorCallbackURL, loginHint? } → { url }
 *   GET  /api/auth/callback/google?code=&state= → 302 to the frontend
 *
 * Kickoff state (+ PKCE verifier + callback URLs) lives in `oauthStates`
 * (single-use, 10-minute TTL). Code exchange + userinfo run over fetch.
 * Users are matched by verified email: same email ⇔ same account, so
 * Google sign-in links automatically, exactly like before.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function redirectUri() {
  // BETTER_AUTH_URL must have no trailing slash or Google sees
  // "https://host//api/..." and the token exchange 401s with
  // redirect_uri_mismatch / invalid_grant. Trim defensively — the
  // Google Console entry must match this EXACTLY:
  //   {BETTER_AUTH_URL}/api/auth/callback/google
  return `${String(env.BETTER_AUTH_URL ?? "").replace(/\/+$/, "")}/api/auth/callback/google`;
}

/**
 * Relative frontend paths only — never open-redirect to another origin.
 * Also accepts an absolute URL whose origin matches FRONTEND_URL (the
 * frontend currently sends `${location.origin}/dashboard`) and extracts
 * its path, so deploys keep working even if the caller passes full URLs.
 */
function safePath(p, fallback) {
  if (typeof p === "string") {
    const trimmed = p.trim();
    // Absolute URL on our own frontend origin → take its path+query.
    try {
      const frontendOrigin = String(env.FRONTEND_URL ?? "").replace(/\/+$/, "");
      const parsed = new URL(trimmed);
      if (parsed.origin === frontendOrigin) {
        const rel = `${parsed.pathname}${parsed.search}`;
        if (/^\/(?!\/)[^\s\\]*$/.test(rel)) return rel;
      }
    } catch {
      /* not absolute — fall through to the relative check */
    }
    if (/^\/(?!\/)[^\s\\]*$/.test(trimmed)) return trimmed;
  }
  return fallback;
}

function errorRedirect(res, base, code, detail) {
  const target =
    safePath(base, "/") +
    `?error=${encodeURIComponent(code)}` +
    (detail ? `&error_description=${encodeURIComponent(detail)}` : "");
  return res.redirect(302, `${env.FRONTEND_URL}${target}`);
}

function pkceChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function googleKickoff(db, body) {
  if (body?.provider !== "google") {
    const err = new Error("Unknown provider. Use google.");
    err.status = 422;
    throw err;
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    const err = new Error("Google sign-in isn't configured yet.");
    err.status = 503;
    throw err;
  }
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.collection("oauthStates").insertOne({
    state,
    codeVerifier: verifier,
    callbackURL: safePath(body?.callbackURL, "/dashboard"),
    newUserCallbackURL: safePath(body?.newUserCallbackURL, "/onboarding"),
    errorCallbackURL: safePath(body?.errorCallbackURL, "/login"),
    createdAt: now,
  });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
  });
  if (typeof body?.loginHint === "string" && body.loginHint.includes("@")) {
    params.set("login_hint", body.loginHint.trim().slice(0, 254));
  }
  return { url: `${GOOGLE_AUTH_URL}?${params.toString()}` };
}

export async function googleCallback(db, req, res) {
  const fail = (code, detail) =>
    errorRedirect(res, req.query?.errorCallbackURL ?? "/login", code, detail);
  // NOTE: the stored errorCallbackURL is authoritative, not the query's.
  try {
    const q = req.query ?? {};
    // Load + burn the state first: every callback attempt is single-use,
    // which also bounds replay of intercepted codes.
    // mongodb driver ≥v5 returns the doc directly; older returns { value }.
    const deleted = q.state
      ? await db.collection("oauthStates").findOneAndDelete({ state: String(q.state) })
      : null;
    const row = deleted?.value !== undefined ? deleted.value : deleted;
    const storedCb = row?.errorCallbackURL ?? "/login";
    const failWith = (code, detail) => errorRedirect(res, storedCb, code, detail);
    if (q.error) {
      return failWith(q.error === "access_denied" ? "access_denied" : "authentication_failed");
    }
    if (
      !row ||
      !q.code ||
      Date.now() - new Date(row.createdAt).getTime() > OAUTH_STATE_TTL_MS
    ) {
      return failWith("authentication_failed");
    }

    // Code → tokens (PKCE verifier proves this server started the flow).
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(q.code),
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
        code_verifier: row.codeVerifier,
      }),
    });
    const tokens = await tokenRes.json().catch(() => null);
    if (!tokenRes.ok || !tokens?.access_token) {
      // Google answers invalid_client (bad id/secret) with 401 and
      // redirect_uri_mismatch / invalid_grant with 400 — the status alone
      // can't tell them apart, so log the body (no secrets in it).
      console.error(
        "[oauth] token exchange failed:",
        tokenRes.status,
        JSON.stringify(tokens)?.slice(0, 300),
        `redirect_uri=${redirectUri()}`
      );
      return failWith("authentication_failed");
    }

    const meRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await meRes.json().catch(() => null);
    const email = String(profile?.email ?? "").toLowerCase();
    if (!meRes.ok || !email || profile?.verified_email === false) {
      console.error("[oauth] userinfo failed:", meRes.status);
      return failWith("authentication_failed");
    }
    if (!emailDomainAllowed(email)) {
      return failWith(
        "email_not_allowed",
        `Use an email from: ${ALLOWED_EMAIL_DOMAINS.join(", ")}.`
      );
    }

    // Find-or-create by verified email (automatic account linking).
    let userDoc = await db.collection("user").findOne({ email });
    let isNew = false;
    const now = new Date();
    if (!userDoc) {
      isNew = true;
      const username = await uniqueUsername(
        db,
        socialUsernameBase(profile?.name, email)
      );
      const displayName = String(profile?.name ?? "").trim().slice(0, 40) || username;
      const { insertedId } = await db.collection("user").insertOne({
        email,
        emailVerified: true,
        name: displayName,
        image: profile?.picture ?? null,
        username,
        displayName,
        bio: null,
        website: null,
        githubUrl: null,
        avatarUrl: profile?.picture ?? null,
        avatarFileId: null,
        interests: [],
        onboardingCompletedAt: null,
        roles: ["USER"],
        passwordHash: null,
        createdAt: now,
        updatedAt: now,
      });
      userDoc = await db.collection("user").findOne({ _id: insertedId });
      try {
        await db.collection("profileStats").updateOne(
          { userId: userDoc._id.toString() },
          { $setOnInsert: defaultProfileStats(userDoc._id.toString()) },
          { upsert: true }
        );
      } catch (err) {
        console.error(`[oauth] profileStats seed failed for ${userDoc._id}:`, err);
      }
    } else if (!userDoc.emailVerified) {
      await db
        .collection("user")
        .updateOne({ _id: userDoc._id }, { $set: { emailVerified: true, updatedAt: now } })
        .catch(() => {});
    }

    const meta = requestMeta(req);
    const token = await createSession(db, userDoc._id, meta);
    setSessionCookie(res, token);
    const target = isNew ? row.newUserCallbackURL : row.callbackURL;
    return res.redirect(302, `${env.FRONTEND_URL}${safePath(target, "/dashboard")}`);
  } catch (err) {
    console.error("[oauth] callback failed:", err?.message ?? err);
    return fail("authentication_failed");
  }
}
