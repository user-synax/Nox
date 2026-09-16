import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { strictAuthLimit } from "../middleware/rateLimit.js";
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation.js";
import { env } from "../env.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  getSessionUser,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  requestMeta,
} from "../lib/session.js";
import { issueToken, consumeToken, VERIFY_TTL_MS, RESET_TTL_MS } from "../lib/tokens.js";
import { sendEmail, verifyEmailHtml, resetPasswordHtml } from "../lib/email.js";
import { defaultProfileStats } from "../lib/stats.js";
import { googleKickoff, googleCallback } from "../lib/oauth.js";

/**
 * Auth surface (PRD §29) — hand-rolled sessions, no auth library.
 *
 *   POST /auth/register  → create account (NO session; verification email)
 *   POST /auth/login     → session cookie (403 until verified)
 *   POST /auth/logout    → destroy session + clear cookie
 *   GET  /auth/me        → current user + profileStats (401 when signed out)
 *   POST /auth/verify-email
 *   POST /auth/forgot-password
 *   POST /auth/reset-password
 *   POST /api/auth/send-verification-email (resend; always 200)
 *   POST /api/auth/sign-in/social         (Google kickoff → { url })
 *   GET  /api/auth/callback/google        (Google return → 302 frontend)
 *
 * Paths and response shapes are unchanged from the Better Auth era, so
 * the frontend and smoke suite work untouched. sessions/emailTokens/
 * oauthStates collections replace the old session/verification/account
 * rows (see scripts/migrate-auth.js).
 */

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

async function ensureProfileStats(db, userId) {
  try {
    await db.collection("profileStats").updateOne(
      { userId: String(userId) },
      { $setOnInsert: defaultProfileStats(String(userId)) },
      { upsert: true }
    );
  } catch (err) {
    console.error(`[auth] profileStats seed failed for ${userId}:`, err);
  }
}

async function sendVerifyEmail(db, userDoc) {
  const token = await issueToken(db, {
    userId: userDoc._id,
    email: userDoc.email,
    type: "verify",
    ttlMs: VERIFY_TTL_MS,
  });
  const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail(db, {
    to: userDoc.email,
    subject: "Verify your Nox account",
    html: verifyEmailHtml(url),
    text: `Verify your Nox account: ${url}`,
    kind: "verify-email",
    url,
  });
}

export function createAuthRoutes(db) {
  const router = Router();

  router.post(
    "/auth/register",
    strictAuthLimit(),
    validate(signupSchema),
    async (req, res) => {
      try {
        const { email, password, username, displayName } = req.body;
        const existing = await db.collection("user").findOne({ email });
        if (existing) {
          // Anti-enumeration no-op (matches previous behavior): re-send
          // the link for pending accounts, persist nothing, no session.
          if (!existing.emailVerified) {
            try {
              await sendVerifyEmail(db, existing);
            } catch {
              /* send failure must not reveal the account */
            }
          }
          return res.json({ user: sanitizeUser(existing) });
        }
        const taken = await db.collection("user").findOne(
          { username },
          { projection: { _id: 1 } }
        );
        if (taken) {
          return res.status(422).json({
            error: "That username is taken.",
            issues: [{ path: "username", message: "That username is taken." }],
          });
        }
        const name = displayName ?? username;
        const now = new Date();
        let userDoc;
        try {
          const { insertedId } = await db.collection("user").insertOne({
            email,
            emailVerified: false,
            name,
            image: null,
            username,
            displayName: name,
            bio: null,
            website: null,
            githubUrl: null,
            avatarUrl: null,
            avatarFileId: null,
            interests: [],
            onboardingCompletedAt: null,
            roles: ["USER"],
            passwordHash: await hashPassword(password),
            createdAt: now,
            updatedAt: now,
          });
          userDoc = await db.collection("user").findOne({ _id: insertedId });
        } catch (err) {
          // Lost a race on a unique index (email taken concurrently).
          if (err?.code === 11000) {
            const raced = await db.collection("user").findOne({ email });
            return res.json({ user: sanitizeUser(raced) });
          }
          throw err;
        }
        await ensureProfileStats(db, userDoc._id);
        await sendVerifyEmail(db, userDoc);
        // No session until the email is verified (enforced at login).
        return res.json({ user: sanitizeUser(userDoc) });
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
        // Generic message either way — unknown emails, Google-only
        // accounts, and wrong passwords are indistinguishable.
        const userDoc = await db.collection("user").findOne({ email: req.body.email });
        if (!userDoc?.passwordHash) {
          return res.status(401).json({ error: "Invalid email or password." });
        }
        const { ok, legacy } = await verifyPassword(userDoc.passwordHash, req.body.password);
        if (!ok) {
          return res.status(401).json({ error: "Invalid email or password." });
        }
        if (!userDoc.emailVerified) {
          return res.status(403).json({
            error: "Email not verified. Check your inbox for the link.",
            code: "EMAIL_NOT_VERIFIED",
          });
        }
        if (legacy) {
          // Transparent upgrade to the current hash format.
          await db
            .collection("user")
            .updateOne(
              { _id: userDoc._id },
              { $set: { passwordHash: await hashPassword(req.body.password), updatedAt: new Date() } }
            )
            .catch(() => {});
        }
        const meta = requestMeta(req);
        setSessionCookie(res, await createSession(db, userDoc._id, meta));
        return res.json({ user: sanitizeUser(userDoc) });
      } catch (err) {
        console.error("[auth] login failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not log in." });
      }
    }
  );

  router.post("/auth/logout", async (req, res) => {
    try {
      await destroySession(db, req);
      clearSessionCookie(res);
      return res.json({ status: true });
    } catch (err) {
      console.error("[auth] logout failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not log out." });
    }
  });

  router.get("/auth/me", async (req, res) => {
    try {
      const found = await getSessionUser(db, req, res);
      if (!found) return res.status(401).json({ error: "Not signed in." });
      const stats = await db
        .collection("profileStats")
        .findOne({ userId: found.user._id.toString() });
      return res.json({ user: sanitizeUser(found.user), stats: stats ?? null });
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
        const row = await consumeToken(db, { token: req.body.token, type: "verify" });
        if (!row) {
          return res.status(400).json({ error: "This link is invalid or expired." });
        }
        await db
          .collection("user")
          .updateOne(
            { _id: row.userId },
            { $set: { emailVerified: true, updatedAt: new Date() } }
          );
        const userDoc = await db.collection("user").findOne({ _id: row.userId });
        if (!userDoc) return res.status(400).json({ error: "This link is invalid or expired." });
        // Verified users land signed in (verify page routes to onboarding).
        const meta = requestMeta(req);
        setSessionCookie(res, await createSession(db, userDoc._id, meta));
        return res.json({ user: sanitizeUser(userDoc) });
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
        const userDoc = await db.collection("user").findOne({ email: req.body.email });
        if (userDoc?.passwordHash) {
          // Password accounts only — Google-only accounts have no
          // password to reset (generic response either way).
          const token = await issueToken(db, {
            userId: userDoc._id,
            email: userDoc.email,
            type: "reset",
            ttlMs: RESET_TTL_MS,
          });
          const url = `${env.FRONTEND_URL}/reset-password?token=${token}`;
          await sendEmail(db, {
            to: userDoc.email,
            subject: "Reset your Nox password",
            html: resetPasswordHtml(url),
            text: `Reset your Nox password: ${url}`,
            kind: "password-reset",
            url,
          });
        }
      } catch (err) {
        console.error("[auth] forgot-password failed:", err?.message ?? err);
      }
      // Never reveal whether the email exists.
      return res.json({ status: true });
    }
  );

  router.post(
    "/auth/reset-password",
    strictAuthLimit(),
    validate(resetPasswordSchema),
    async (req, res) => {
      try {
        const row = await consumeToken(db, { token: req.body.token, type: "reset" });
        if (!row) {
          return res.status(400).json({ error: "This link is invalid or expired." });
        }
        await db.collection("user").updateOne(
          { _id: row.userId },
          {
            $set: {
              passwordHash: await hashPassword(req.body.password),
              // A working reset link proves inbox access.
              emailVerified: true,
              updatedAt: new Date(),
            },
          }
        );
        return res.json({ status: true });
      } catch (err) {
        console.error("[auth] reset-password failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not reset password." });
      }
    }
  );

  // Dev-only outbox reader — lets smoke tests + frontend devs finish the
  // email flows without SMTP. Never enabled in production.
  if (env.NODE_ENV !== "production") {
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

/**
 * Native /api/auth/* paths (previously served by the auth library's own
 * mount). Registered ONCE at / — do not double-mount under /api.
 */
const resendSchema = z.object({ email: z.string().trim().toLowerCase().email() });

export function createNativeAuthRoutes(db) {
  const router = Router();

  // Re-send a verification link. Always 200 — never reveal account state.
  router.post("/api/auth/send-verification-email", strictAuthLimit(), async (req, res) => {
    try {
      const parsed = resendSchema.safeParse(req.body);
      if (parsed.success) {
        const userDoc = await db.collection("user").findOne({ email: parsed.data.email });
        if (userDoc && !userDoc.emailVerified) {
          try {
            await sendVerifyEmail(db, userDoc);
          } catch {
            /* generic response either way */
          }
        }
      }
      return res.json({ status: true });
    } catch (err) {
      console.error("[auth] resend failed:", err?.message ?? err);
      return res.json({ status: true });
    }
  });

  router.post("/api/auth/sign-in/social", strictAuthLimit(), async (req, res) => {
    try {
      return res.json(await googleKickoff(db, req.body));
    } catch (err) {
      console.error("[auth] social kickoff failed:", err?.message ?? err);
      return res.status(err?.status ?? 500).json({ error: err?.message ?? "Could not reach Google. Try again." });
    }
  });

  router.get("/api/auth/callback/google", async (req, res) => {
    await googleCallback(db, req, res);
  });

  return router;
}
