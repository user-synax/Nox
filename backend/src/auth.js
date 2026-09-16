import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError } from "better-auth/api";
import { env } from "./env.js";
import {
  signupExtraSchema,
  emailDomainAllowed,
  ALLOWED_EMAIL_DOMAINS,
} from "./validation.js";
import { defaultProfileStats } from "./lib/stats.js";
import { sendEmail, verifyEmailHtml, resetPasswordHtml } from "./lib/email.js";

/**
 * Handle base for an OAuth signup (Google sends no username): prefer the
 * profile name, fall back to the email local part, sanitized to the
 * username alphabet. Usernames are immutable, so this must be decent on
 * the first try — "Ayush Sharma" → ayush_sharma, "ayush@gmail" → ayush.
 */
function socialUsernameBase(name, email) {
  const raw = name || String(email ?? "").split("@")[0] || "debugger";
  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 15);
  return clean.length >= 3 ? clean : "debugger";
}

/** First free handle: base, base_2 … base_10, then a random fallback. */
async function uniqueUsername(db, base) {
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

/**
 * Better Auth instance — email/password + Google OAuth (enabled when
 * GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set).
 *
 * Email delivery: Resend when RESEND_API_KEY is set, dev-outbox fallback
 * otherwise (dev only). Verification is ENFORCED for password accounts —
 * signup creates the account without a session; login is 403 until the
 * email is verified. OAuth emails are provider-verified, so Google
 * sign-ins skip that gate. Pre-enforcement accounts were grandfathered
 * (scripts/grandfather-verified.js).
 *
 * PRD §28 User model mapping:
 *   Better Auth core → email, emailVerified, name (= displayName), image,
 *                      createdAt, updatedAt
 *   additionalFields → username (unique /u/[username] handle), displayName,
 *                      bio, website, githubUrl, avatarUrl,
 *                      roles (default ["USER"]; USER/MODERATOR/ADMIN/FOUNDER)
 *
 * PRD §5 Auth required: email/pass, Google, verification,
 * sessions (7d), logout, password reset, brute-force protection (§35/§37).
 */
export function createAuth(db) {
  const isProd = env.NODE_ENV === "production";

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.FRONTEND_URL],
    database: mongodbAdapter(db),

    emailAndPassword: {
      enabled: true,
      // Enforced: signup creates the account WITHOUT a session and sends
      // a verification link; login is 403 until verified. The signup page
      // shows a check-your-inbox state; the login page offers resend.
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url, token }) => {
        // The persisted `url` keeps its historic shape (smoke follows it);
        // the emailed link always points at the frontend reset screen.
        const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
        await sendEmail(db, {
          to: user.email,
          subject: "Reset your Nox password",
          html: resetPasswordHtml(link),
          text: `Reset your Nox password: ${link}`,
          kind: "password-reset",
          url,
        });
      },
    },

    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, token }) => {
        // Frontend owns the verify screen; the API token rides along as ?token=.
        const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
        await sendEmail(db, {
          to: user.email,
          subject: "Verify your Nox account",
          html: verifyEmailHtml(url),
          text: `Verify your Nox account: ${url}`,
          kind: "verify-email",
          url,
        });
      },
    },

    session: {
      // 7-day DB sessions, refreshed daily; 5-min signed cookie cache.
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    account: {
      // Google links by verified email automatically.
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
        // Appwrite file id behind avatarUrl (lets us delete replaces).
        avatarFileId: { type: "string", required: false, input: false },
        // Onboarding picks (PRD §4.1): category slugs, see validation.js.
        interests: {
          type: "string[]",
          required: false,
          defaultValue: [],
          input: false,
        },
        // Set when the onboarding wizard completes (null = fresh user).
        onboardingCompletedAt: { type: "date", required: false, input: false },
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
            // before hooks run, without knowing our allowlist). Applies to
            // OAuth too — gmail.com (the Google consumer domain) passes.
            if (!emailDomainAllowed(user.email ?? "")) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                message: `Use an email from: ${ALLOWED_EMAIL_DOMAINS.join(", ")}.`,
              });
            }
            // OAuth profiles (Google) carry no username — derive a
            // permanent, human-readable handle (usernames are immutable)
            // instead of failing the signup.
            const username =
              user.username ??
              (await uniqueUsername(
                db,
                socialUsernameBase(user.name, user.email)
              ));
            const parsed = signupExtraSchema.safeParse({
              username,
              // Google names can exceed our 40-char cap — trim, don't fail.
              displayName: (user.displayName ?? user.name ?? "").trim().slice(0, 40) || undefined,
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
                // Adopt the provider photo when the account has none
                // (external URL only — no avatarFileId, so avatar
                // replace/delete keeps working untouched).
                ...(user.avatarUrl ?? user.image
                  ? { avatarUrl: user.avatarUrl ?? user.image }
                  : {}),
                roles: user.roles ?? ["USER"],
              },
            };
          },
          // Seed PRD §28 ProfileStats (starting rating 1000 per §14)
          // + streak bookkeeping per §17.
          // Best-effort: a stats failure must never fail the signup itself.
          async after(user) {
            try {
              await db.collection("profileStats").updateOne(
                { userId: user.id },
                { $setOnInsert: defaultProfileStats(user.id) },
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

    // Google OAuth — live when credentials are configured (PRD §5).
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
