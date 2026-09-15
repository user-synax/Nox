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

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: passwordSchema,
});
