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
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
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

export const env = parsed.data;
export const isDev = env.NODE_ENV === "development";
