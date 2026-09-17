import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env.js";
import { connectDB } from "./db.js";
import { createAuthRoutes, createNativeAuthRoutes } from "./routes/auth.js";
import { createUserRoutes } from "./routes/users.js";
import { createChallengeRoutes } from "./routes/challenges.js";
import { createDailyRoutes } from "./routes/daily.js";
import { createAchievementRoutes } from "./routes/achievements.js";
import { createAdminRoutes } from "./routes/admin.js";
import { createRunRoutes } from "./routes/runs.js";
import { createSubmissionRoutes } from "./routes/submissions.js";
import { createLeaderboardRoutes } from "./routes/leaderboard.js";
import { createSolutionRoutes } from "./routes/solutions.js";
import { createModerationRoutes } from "./routes/moderation.js";
import { createNotificationRoutes } from "./routes/notifications.js";
import { assertEmailReady } from "./lib/email.js";
import { initRealtime } from "./lib/realtime.js";

// Connect first: auth + indexes depend on the database.
// A missing/unreachable MongoDB fails fast here with a clear message.
let client;
let db;
try {
  ({ client, db } = await connectDB(env.MONGODB_URI));
  console.log(`[api] connected to MongoDB (${db.databaseName})`);
} catch (err) {
  console.error(`[api] cannot reach MongoDB at ${env.MONGODB_URI}`);
  console.error(`[api] start a local mongod (mongod --dbpath <path>) or set MONGODB_URI.`);
  console.error(err?.message ?? err);
  process.exit(1);
}

// Prod-only: fail fast if the sender domain isn't verified in Resend,
// instead of silently dropping verification/reset links at signup.
await assertEmailReady();
const app = express();
app.disable("x-powered-by");
// One trusted proxy hop (Vercel / reverse proxy) so req.ip + secure
// cookies resolve correctly. Increase if behind multiple proxies.
app.set("trust proxy", 1);

app.use(helmet());
{
  // FRONTEND_URL may be comma-separated; env.FRONTEND_URLS is the full
  // allow-list (always includes https://nox.synax.me so a stale Render var
  // can't CORS-brick production). Must match Origin header EXACTLY or the
  // browser strips Set-Cookie and every fetch is 401/CORS.
  const allowed = new Set(
    (env.FRONTEND_URLS ?? [env.FRONTEND_URL]).map((s) => String(s).replace(/\/+$/, ""))
  );
  console.log(`[api] CORS allowed origins: ${[...allowed].join(", ")}`);
  app.use(
    cors({
      origin(origin, cb) {
        // No Origin → same-origin / curl / health checks: allow.
        if (!origin) return cb(null, true);
        const norm = String(origin).replace(/\/+$/, "");
        if (allowed.has(norm)) return cb(null, true);
        console.warn(`[cors] blocked origin ${origin} (allowed: ${[...allowed].join(", ")})`);
        return cb(null, false);
      },
      credentials: true,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
}

app.use(express.json({ limit: "100kb" }));

// PRD §29 auth surface with Zod validation. Mounted at both /auth/*
// (PRD-literal) and /api/auth/* so the frontend can use either base
// without CORS surprises.
app.use(createAuthRoutes(db));
app.use("/api", createAuthRoutes(db));
// Native /api/auth/* paths (resend, Google kickoff/callback) — full paths,
// mounted once (never under a second /api prefix).
app.use(createNativeAuthRoutes(db));

// PRD §29 Users surface (public profiles + self edits + avatar uploads).
app.use(createUserRoutes(db));
app.use("/api", createUserRoutes(db));

// Challenge catalog (public) + daily challenge (PRD §18) + admin (ADMIN+, PRD §22).
app.use(createChallengeRoutes(db));
app.use("/api", createChallengeRoutes(db));
app.use(createDailyRoutes(db));
app.use("/api", createDailyRoutes(db));
app.use(createAchievementRoutes(db));
app.use("/api", createAchievementRoutes(db));
app.use(createAdminRoutes(db));
app.use("/api", createAdminRoutes(db));

// Visible-test execution queue (PRD §10/§12).
app.use(createRunRoutes(db));
app.use("/api", createRunRoutes(db));

// Submissions (hidden judging) + leaderboards (PRD §12/§16).
app.use(createSubmissionRoutes(db));
app.use("/api", createSubmissionRoutes(db));
app.use(createLeaderboardRoutes(db));
app.use("/api", createLeaderboardRoutes(db));

// Community solutions + comments + likes (PRD §19, solved-only reads).
app.use(createSolutionRoutes(db));
app.use("/api", createSolutionRoutes(db));

// Moderation + reports (PRD §23): POST /reports + /admin/* (MODERATOR+).
app.use(createModerationRoutes(db));
app.use("/api", createModerationRoutes(db));

// In-app notifications inbox (PRD §21).
app.use(createNotificationRoutes(db));
app.use("/api", createNotificationRoutes(db));

app.get("/api/health", async (_req, res) => {
  // Execution liveness rides along: counts only, nothing sensitive.
  // Lets the workspace distinguish "no worker online" from "queue busy".
  let queue = { queued: 0, running: 0 };
  let workersOnline = 0;
  try {
    const [queued, running, workers] = await Promise.all([
      db.collection("runs").countDocuments({ status: "queued" }),
      db.collection("runs").countDocuments({ status: "running" }),
      db
        .collection("workerHeartbeats")
        .countDocuments({ lastBeat: { $gte: new Date(Date.now() - 30_000) } }),
    ]);
    queue = { queued, running };
    workersOnline = workers;
  } catch {
    /* health stays up even if stats fail */
  }
  res.json({ ok: true, time: new Date().toISOString(), queue, workersOnline });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[api] unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const httpServer = createServer(app);
// Realtime fan-out lives on the same origin (PRD §25) — routes emit via
// req.app.get("io"), sockets only ever receive.
app.set("io", initRealtime(httpServer, db));

const server = httpServer.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  console.log(
    `[api] Google OAuth ${env.GOOGLE_CLIENT_ID ? "ENABLED" : "disabled (set GOOGLE_CLIENT_ID/SECRET to enable)"}`
  );
});

const shutdown = async (signal) => {
  console.log(`[api] ${signal} — shutting down`);
  server.close(() => process.exit(0));
  try {
    await client?.close();
  } catch {
    /* already closed */
  }
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
