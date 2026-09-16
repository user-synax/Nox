import { z } from "zod";

/**
 * Zod validation — single source of truth for auth input rules.
 * Mirrors the frontend field rules; enforced server-side in
 * databaseHooks (signup extras) and at boot (env).
 *
 * PRD user identity: username is the canonical, URL-safe handle
 * (Nox.synax.me/u/[username]) → lowercase, 3–20 chars.
 */

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username must be at most 20 characters.")
  .regex(
    /^[a-z0-9_]+$/,
    "Username may only contain letters, numbers and underscores."
  );

/**
 * Allowed email domains for signup/login (anti-spam gate).
 * Keep in sync with the client helper in frontend/lib/auth.js.
 */
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "proton.me",
  "yahho.com",
  "icloud.com",
  "aol.com",
  "outlook.com",
  "hotmail.com",
];

export function emailDomainAllowed(email) {
  const domain =
    String(email ?? "")
      .trim()
      .toLowerCase()
      .split("@")[1] ?? "";
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .email("Enter a valid email address.")
  .refine((v) => emailDomainAllowed(v), {
    message: `Use an email from: ${ALLOWED_EMAIL_DOMAINS.join(", ")}.`,
  });

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

/** Extra profile fields accepted at signup (PRD §28 User). */
export const signupExtraSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(40).optional(),
});

/** Full signup payload shape (email/password rules match Better Auth config). */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(40).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required."),
});

/** POST /auth/verify-email — 6-digit code from the signup email. */
export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  otp: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code."),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: passwordSchema,
});

/* ── Profile / onboarding (PRD §6 + §28) ─────────────────────────── */

/** MVP languages (PRD §8). Slugs double as UI chip keys. */
export const LANGUAGES = ["javascript", "typescript", "Python"];

/** Challenge categories repurposed as onboarding interests (PRD §7.3). */
export const INTERESTS = [
  "newbies",
  "general",
  "algorithms",
  "frontend",
  "backend",
  "security",
  "database",
  "performance",
];

/** Optional URL: "" clears the field, otherwise scheme is auto-added server-side. */
const optionalUrlSchema = (message) =>
  z
    .string()
    .trim()
    .max(200, message)
    .refine((v) => v === "" || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(v), {
      message,
    });

/** PATCH /users/me + POST /users/me/onboarding — all keys optional, applied when present. */
export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "Display name can't be empty.").max(40).optional(),
  bio: z.string().trim().max(160, "Bio must be at most 160 characters.").optional(),
  website: optionalUrlSchema("Enter a valid URL.").optional(),
  githubUrl: optionalUrlSchema("Enter a valid GitHub URL.")
    .refine(
      (v) =>
        v === "" ||
        /^(https?:\/\/)?(www\.)?github\.com(\/|$)/i.test(v),
      { message: "GitHub URL must point to github.com." }
    )
    .optional(),
  preferredLanguages: z.array(z.enum(LANGUAGES)).min(1).max(10).optional(),
  interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length).optional(),
});

/** Avatar upload guards (multer enforces size; route enforces mime). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* ── Challenges (PRD §7) ─────────────────────────────────────────── */

export const DIFFICULTIES = ["easy", "medium", "hard", "expert"];
export const CHALLENGE_KINDS = ["bug-fix", "logic-error", "runtime-error", "api-bug"];
export const CHALLENGE_STATUSES = ["draft", "published"];
export const CHALLENGE_SORTS = ["recommended", "newest", "trending", "popular"];

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case.");

const starterFileSchema = z.object({
  path: z.string().trim().min(1).max(120),
  content: z.string().min(1).max(100_000),
});

const testCaseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  input: z.unknown(),
  expected: z.unknown(),
});

/** Admin write payload — full challenge create/update (PRD §7.1 + §22). */
export const challengeWriteSchema = z.object({
  title: z.string().trim().min(3).max(100),
  slug: slugSchema.optional(),
  description: z.string().trim().min(10).max(20_000),
  kind: z.enum(CHALLENGE_KINDS).default("bug-fix"),
  language: z.enum(LANGUAGES),
  difficulty: z.enum(DIFFICULTIES),
  category: z.enum(INTERESTS),
  tags: z.array(z.string().trim().min(1).max(30).toLowerCase()).max(10).default([]),
  starterFiles: z.array(starterFileSchema).min(1).max(20),
  visibleTests: z.array(testCaseSchema).min(1).max(50),
  hiddenTests: z.array(testCaseSchema).max(100).default([]),
  // Execution entry: which export the judge calls. testContext appends
  // extra trailing args (evaluated in the harness, admin-authored).
  entryFile: z.string().trim().min(1).max(120),
  entryFunction: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, "Entry function must be a valid identifier."),
  testContext: z.record(z.string(), z.string().max(5000)).default({}),
  constraints: z.string().trim().max(2000).default(""),
  hints: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  timeLimitMs: z.number().int().min(100).max(30_000).default(2000),
  memoryLimitMb: z.number().int().min(8).max(1024).default(64),
  estimatedSolveMinutes: z.number().int().min(1).max(180).default(15),
  status: z.enum(CHALLENGE_STATUSES).default("draft"),
});

/** GET /challenges query — all optional, validated after coercion. */
export const challengeListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  language: z.enum(LANGUAGES).optional(),
  category: z.enum(INTERESTS).optional(),
  tag: z.string().trim().min(1).max(30).toLowerCase().optional(),
  sort: z.enum(CHALLENGE_SORTS).default("recommended"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/* ── Solutions + comments (PRD §19) ───────────────────────────── */

/** POST /challenges/:id/solutions — one write-up; multiples per user allowed. */
export const solutionWriteSchema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters.").max(100),
  body: z
    .string()
    .trim()
    .min(10, "Explain the fix in at least 10 characters.")
    .max(20_000, "Explanation is too long."),
  code: z.string().min(1, "Solution code is required.").max(100_000, "Code is too large."),
  language: z.enum(LANGUAGES),
  tags: z.array(z.string().trim().min(1).max(30).toLowerCase()).max(10).default([]),
});

/** PATCH /solutions/:id — partial edit, at least one field. */
export const solutionPatchSchema = solutionWriteSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });

/** POST /solutions/:id/comments — single thread per solution, no nesting. */
export const commentWriteSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty.").max(2000, "Comment is too long."),
});

/** GET /challenges/:id/solutions query. */
export const solutionListQuerySchema = z.object({
  sort: z.enum(["newest", "top"]).default("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** GET /solutions/:id/comments query — oldest-first thread order. */
export const commentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/* ── Execution (run visible tests) ──────────────────────────────── */

/** Languages the workers can actually execute (rest → 422 for now). */
export const EXECUTABLE_LANGUAGES = ["javascript", "Python"];

/** POST /challenges/:id/run — user code snapshot (merged over starters). */
export const runRequestSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(120),
        content: z.string().max(100_000),
      })
    )
    .min(1)
    .max(20),
});
