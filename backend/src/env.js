import { z } from "zod";

/**
 * Environment contract — validated at boot, fail fast on misconfiguration.
 * MONGODB_URI database path selects the database (default: /Nox).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .default("mongodb://127.0.0.1:27017/Nox"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  // Comma-separated to allow both custom domain + Vercel preview in one var:
  // "https://nox.synax.me,https://nox.vercel.app"
  FRONTEND_URL: z
    .string()
    .trim()
    .min(1, "FRONTEND_URL is required")
    .default("http://localhost:3000")
    .refine(
      (v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .every((s) => {
            try {
              new URL(s.replace(/\/+$/, ""));
              return true;
            } catch {
              return false;
            }
          }),
      { message: "FRONTEND_URL must be URL(s) comma-separated" }
    ),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Outbound email (verification + password reset). Optional in dev
  // (dev-outbox fallback); required in production — verification
  // enforcement cannot send without it.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("Nox <noreply@nox.synax.me>"),
  // Appwrite avatar storage (all four or none — avatar upload 503s until set).
  APPWRITE_ENDPOINT: z.string().url().optional(),
  APPWRITE_PROJECT_ID: z.string().min(1).optional(),
  APPWRITE_BUCKET_AVATARS: z.string().min(1).optional(),
  APPWRITE_API_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Invalid environment:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

if (
  (parsed.data.GOOGLE_CLIENT_ID && !parsed.data.GOOGLE_CLIENT_SECRET) ||
  (!parsed.data.GOOGLE_CLIENT_ID && parsed.data.GOOGLE_CLIENT_SECRET)
) {
  console.error("[env] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together.");
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.RESEND_API_KEY) {
  console.error("[env] RESEND_API_KEY is required in production (verification emails).");
  process.exit(1);
}

{
  const appwriteKeys = [
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_BUCKET_AVATARS",
    "APPWRITE_API_KEY",
  ];
  const set = appwriteKeys.filter((k) => parsed.data[k]);
  if (set.length > 0 && set.length < appwriteKeys.length) {
    console.error(
      `[env] Partial Appwrite config (${set.join(", ")}). Set all of ${appwriteKeys.join(", ")} or none — avatar uploads stay disabled until complete.`
    );
    process.exit(1);
  }
}

// Normalize FRONTEND_URL: keep canonical (first) in env.FRONTEND_URL for
// redirects/emails, and expose the full allow-list as env.FRONTEND_URLS
// for CORS + OAuth safePath. Also always include the production custom
// domain so a stale single-value Render var doesn't brick nox.synax.me.
{
  const raw = String(parsed.data.FRONTEND_URL ?? "");
  const list = raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  // Hard fallback so production is never CORS-bricked if the var is stale.
  const extra = ["https://nox.synax.me", "https://www.nox.synax.me"];
  for (const u of extra) if (!list.includes(u)) list.push(u);
  // Local dev origins (harmless in prod, needed when NODE_ENV is overridden).
  if (parsed.data.NODE_ENV !== "production") {
    for (const u of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
      if (!list.includes(u)) list.push(u);
    }
  }
  parsed.data.FRONTEND_URL = list[0];
  parsed.data.FRONTEND_URLS = list;
  // Trim trailing slash on the API URL so Google redirect_uri never double-slashes.
  parsed.data.BETTER_AUTH_URL = String(parsed.data.BETTER_AUTH_URL ?? "").replace(/\/+$/, "");
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === "development";
