import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError } from "better-auth/api";
import { env } from "./env.js";
import {
  signupExtraSchema,
  emailDomainAllowed,
  ALLOWED_EMAIL_DOMAINS,
} from "./validation.js";

/**
 * Better Auth instance — email/password today, Google config-ready.
 * Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to enable Google OAuth
 * (no code changes needed).
 *
 * PRD §28 User model mapping:
 *   Better Auth core → email, emailVerified, name (= displayName), image,
 *                      createdAt, updatedAt
 *   additionalFields → username (unique /u/[username] handle), displayName,
 *                      bio, website, githubUrl, avatarUrl,
 *                      roles (default ["USER"]; USER/MODERATOR/ADMIN/FOUNDER)
 *
 * PRD §5 Auth required: email/pass, Google (dormant), verification,
 * sessions (7d), logout, password reset, brute-force protection (§35/§37).
 */
export function createAuth(db) {
  const isProd = env.NODE_ENV === "production";

  // Dev-only outbox: persist the last verification / reset link per email
  // so smoke tests + frontend devs can complete the flow without SMTP.
  // Production must wire a real provider (Resend) here instead.
  const recordDevOutbox = async (kind, email, url) => {
    if (isProd) return;
    try {
      await db.collection("devOutbox").updateOne(
        { email: email.toLowerCase(), kind },
        { $set: { email: email.toLowerCase(), kind, url, createdAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error(`[auth] devOutbox write failed (${kind}):`, err?.message ?? err);
    }
  };

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.FRONTEND_URL],
    database: mongodbAdapter(db),

    emailAndPassword: {
      enabled: true,
      // Verification disabled for now: users sign straight in on signup.
      // Re-enable by flipping this to true (verify-email + resend flows
      // in src/routes/auth.js and the frontend pages go live again).
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url }) => {
        // Dev stub (per scope decision): log + persist for smoke/frontend.
        // TODO(production): send via Resend.
        console.log(`[auth] password reset for ${user.email}: ${url}`);
        await recordDevOutbox("password-reset", user.email, url);
      },
    },

    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, token }) => {
        // Frontend owns the verify screen; the API token rides along as ?token=.
        // Dev stub (per scope decision): log + persist for smoke/frontend.
        // TODO(production): send via Resend.
        const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
        console.log(`[auth] verify ${user.email}: ${url}`);
        await recordDevOutbox("verify-email", user.email, url);
      },
    },

    session: {
      // 7-day DB sessions, refreshed daily; 5-min signed cookie cache.
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    account: {
      // When Google is enabled later, link by verified email automatically.
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },

    user: {
      additionalFields: {
        username: { type: "string", required: true, input: true },
        displayName: { type: "string", required: false, input: true },
        bio: { type: "string", required: false, input: false },
        website: { type: "string", required: false, input: false },
        githubUrl: { type: "string", required: false, input: false },
        avatarUrl: { type: "string", required: false, input: false },
        roles: {
          type: "string[]",
          required: false,
          defaultValue: ["USER"],
          input: false,
        },
      },
    },

    advanced: {
      cookiePrefix: "Nox",
      useSecureCookies: isProd,
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      },
    },

    databaseHooks: {
      user: {
        create: {
          // Server-side Zod enforcement + normalization for signup extras,
          // plus a friendly 422 on taken usernames (before the index bites).
          // Also syncs Better Auth core fields: name (= displayName) and
          // image (= avatarUrl) so clients can use either convention.
          async before(user) {
            // Domain gate, enforced server-side even though the Zod
            // aliases check it first (Better Auth validates email itself
            // before hooks run, without knowing our allowlist).
            if (!emailDomainAllowed(user.email ?? "")) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                message: `Use an email from: ${ALLOWED_EMAIL_DOMAINS.join(", ")}.`,
              });
            }
            const parsed = signupExtraSchema.safeParse({
              username: user.username,
              displayName: user.displayName ?? user.name,
            });
            if (!parsed.success) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                message: parsed.error.issues[0]?.message ?? "Invalid input.",
              });
            }
            const taken = await db.collection("user").findOne(
              { username: parsed.data.username },
              { projection: { _id: 1 } }
            );
            if (taken) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                message: "That username is taken.",
              });
            }
            const displayName = parsed.data.displayName ?? parsed.data.username;
            return {
              data: {
                ...user,
                username: parsed.data.username,
                displayName,
                // Keep core `name` in sync — it's what sessions expose.
                name: displayName,
                roles: user.roles ?? ["USER"],
              },
            };
          },
          // Seed PRD §28 ProfileStats (starting rating 1000 per §14)
          // + streak bookkeeping per §17.
          // Best-effort: a stats failure must never fail the signup itself.
          async after(user) {
            try {
              const now = new Date();
              await db.collection("profileStats").updateOne(
                { userId: user.id },
                {
                  $setOnInsert: {
                    userId: user.id,
                    rating: 1000,
                    xp: 0,
                    level: 1,
                    currentStreak: 0,
                    longestStreak: 0,
                    lastActiveDate: null,
                    solvedCount: 0,
                    acceptedCount: 0,
                    attemptCount: 0,
                    successRate: 0,
                    hardestSolvedChallengeId: null,
                    preferredLanguages: [],
                    skills: {},
                    createdAt: now,
                    updatedAt: now,
                  },
                },
                { upsert: true }
              );
            } catch (err) {
              console.error(
                `[auth] profileStats seed failed for ${user.id}:`,
                err
              );
            }
          },
        },
      },
    },

    // Google OAuth — dormant until credentials are configured (PRD §5 future).
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          },
        }
      : {}),

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      // PRD §37: strict per-minute caps on auth attempts, configurable here.
      // (Better Auth defaults are 3 sign-ups per 10s — too tight for
      // legitimate bursts and for the smoke suite, so we raise them
      // while keeping password/verification flows tight.)
      customRules: {
        "/sign-up/email": { window: 60, max: 20 },
        "/sign-in/email": { window: 60, max: 20 },
        "/request-password-reset": { window: 60, max: 5 },
        "/send-verification-email": { window: 60, max: 5 },
      },
    },
  });
}
