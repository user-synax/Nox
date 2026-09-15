import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { strictAuthLimit } from "../middleware/rateLimit.js";
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation.js";
import { env, isDev } from "../env.js";

/**
 * PRD §29 Auth surface — thin Zod-validated aliases over Better Auth.
 *
 *   POST /auth/register  → sign-up + ProfileStats seed (via hooks)
 *   POST /auth/login     → session cookie on success
 *   POST /auth/logout    → clears session
 *   GET  /auth/me        → current user + profileStats (401 when signed out)
 *   POST /auth/verify-email
 *   POST /auth/forgot-password
 *   POST /auth/reset-password
 *
 * Validation failures are 422 with friendly messages. Everything else
 * preserves Better Auth's status codes (401 wrong password, 403 unverified,
 * 422 taken username/email, 429 rate-limited).
 */

export function toWebHeaders(req) {  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  return headers;
}

/** Pipe a Better Auth Response through Express, preserving cookies + JSON. */
async function forward(expressRes, webResponse) {
  expressRes.status(webResponse.status);
  const cookies =
    typeof webResponse.headers.getSetCookie === "function"
      ? webResponse.headers.getSetCookie()
      : null;
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    try {
      expressRes.setHeader(key, value);
    } catch {
      /* header already sent-ish — ignore */
    }
  });
  if (cookies?.length) expressRes.setHeader("Set-Cookie", cookies);
  else {
    const single = webResponse.headers.get("set-cookie");
    if (single) expressRes.setHeader("Set-Cookie", single);
  }
  const text = await webResponse.text();
  const contentType = webResponse.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") && text) {
    try {
      return expressRes.send(JSON.parse(text));
    } catch {
      /* fall through as text */
    }
  }
  return expressRes.send(text || null);
}

/** Public profile shape per PRD §6 / §28 — never leaks hashes/tokens. */
export function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id ?? u._id?.toString?.() ?? null,
    email: u.email,
    username: u.username ?? null,
    displayName: u.displayName ?? u.name ?? null,
    avatarUrl: u.avatarUrl ?? u.image ?? null,
    bio: u.bio ?? null,
    website: u.website ?? null,
    githubUrl: u.githubUrl ?? null,
    roles: u.roles ?? ["USER"],
    emailVerified: !!u.emailVerified,
    interests: u.interests ?? [],
    onboardingCompleted: !!u.onboardingCompletedAt,
    onboardingCompletedAt: u.onboardingCompletedAt ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export function createAuthRoutes(auth, db) {
  const router = Router();

  // Resolve the session from cookies. Null when signed out/expired.
  const getSession = (req) =>
    auth.api.getSession({ headers: toWebHeaders(req) });

  router.post(
    "/auth/register",
    strictAuthLimit(),
    validate(signupSchema),
    async (req, res) => {
      try {
        const { email, password, username, displayName } = req.body;
        const name = displayName ?? username;
        const response = await auth.api.signUpEmail({
          body: { name, email, password, username, displayName: name },
          headers: toWebHeaders(req),
          asResponse: true,
        });
        return await forward(res, response);
      } catch (err) {
        console.error("[auth] register failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not create account." });
      }
    }
  );

  router.post(
    "/auth/login",
    strictAuthLimit(),
    validate(loginSchema),
    async (req, res) => {
      try {
        const response = await auth.api.signInEmail({
          body: req.body,
          headers: toWebHeaders(req),
          asResponse: true,
        });
        return await forward(res, response);
      } catch (err) {
        console.error("[auth] login failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not log in." });
      }
    }
  );

  router.post("/auth/logout", async (req, res) => {
    try {
      const response = await auth.api.signOut({
        headers: toWebHeaders(req),
        asResponse: true,
      });
      return await forward(res, response);
    } catch (err) {
      console.error("[auth] logout failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not log out." });
    }
  });

  router.get("/auth/me", async (req, res) => {
    try {
      const session = await getSession(req);
      if (!session?.user) return res.status(401).json({ error: "Not signed in." });
      const stats = await db
        .collection("profileStats")
        .findOne({ userId: session.user.id });
      return res.json({ user: sanitizeUser(session.user), stats: stats ?? null });
    } catch (err) {
      console.error("[auth] me failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load session." });
    }
  });

  router.post(
    "/auth/verify-email",
    strictAuthLimit(),
    validate(verifyEmailSchema),
    async (req, res) => {
      try {
        const response = await auth.api.verifyEmail({
          query: { token: req.body.token },
          headers: toWebHeaders(req),
          asResponse: true,
        });
        return await forward(res, response);
      } catch (err) {
        console.error("[auth] verify-email failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not verify email." });
      }
    }
  );

  router.post(
    "/auth/forgot-password",
    strictAuthLimit(),
    validate(forgotPasswordSchema),
    async (req, res) => {
      try {
        const response = await auth.api.requestPasswordReset({
          body: {
            email: req.body.email,
            redirectTo: `${env.FRONTEND_URL}/reset-password`,
          },
          headers: toWebHeaders(req),
          asResponse: true,
        });
        return await forward(res, response);
      } catch (err) {
        console.error("[auth] forgot-password failed:", err?.message ?? err);
        // Never reveal whether the email exists.
        return res.json({ status: true });
      }
    }
  );

  router.post(
    "/auth/reset-password",
    strictAuthLimit(),
    validate(resetPasswordSchema),
    async (req, res) => {
      try {
        const response = await auth.api.resetPassword({
          body: { newPassword: req.body.password, token: req.body.token },
          headers: toWebHeaders(req),
          asResponse: true,
        });
        return await forward(res, response);
      } catch (err) {
        console.error("[auth] reset-password failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not reset password." });
      }
    }
  );

  // Dev-only outbox reader — lets smoke tests + frontend devs finish the
  // email flows without SMTP. Never enabled in production.
  if (isDev) {
    router.get("/auth/dev/outbox", async (req, res) => {
      const email = String(req.query.email ?? "").toLowerCase();
      if (!email) return res.status(422).json({ error: "Pass ?email=." });
      const items = await db
        .collection("devOutbox")
        .find({ email })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      return res.json({ email, items });
    });
  }

  return router;
}
