import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { env } from "./env.js";
import { connectDB } from "./db.js";
import { createAuth } from "./auth.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createUserRoutes } from "./routes/users.js";
import { createChallengeRoutes } from "./routes/challenges.js";
import { createAdminRoutes } from "./routes/admin.js";
import { createRunRoutes } from "./routes/runs.js";
import { createSubmissionRoutes } from "./routes/submissions.js";
import { createLeaderboardRoutes } from "./routes/leaderboard.js";
import { createSolutionRoutes } from "./routes/solutions.js";
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

const auth = createAuth(db);
const app = express();
app.disable("x-powered-by");
// One trusted proxy hop (Vercel / reverse proxy) so req.ip + secure
// cookies resolve correctly. Increase if behind multiple proxies.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: [env.FRONTEND_URL],
    credentials: true,
  })
);

// Better Auth owns the native /api/auth/* endpoints and consumes the raw
// body stream itself, so its mount must come BEFORE express.json().
// The PRD /api/auth/* aliases (register, login, …) are excluded here —
// they fall through to express.json() + the Zod-validated router below.
const PRD_API_PATHS = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/verify-email",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/dev/outbox",
]);
app.all("/api/auth/*", (req, res, next) => {
  if (PRD_API_PATHS.has(req.path)) return next();
  return toNodeHandler(auth)(req, res, next);
});

app.use(express.json({ limit: "100kb" }));

// PRD §29 aliases with Zod validation. Mounted at both /auth/* (PRD-literal)
// and /api/auth/* (same origin as the Better Auth endpoints) so the
// frontend can use either base without CORS surprises.
app.use(createAuthRoutes(auth, db));
app.use("/api", createAuthRoutes(auth, db));

// PRD §29 Users surface (public profiles + self edits + avatar uploads).
app.use(createUserRoutes(auth, db));
app.use("/api", createUserRoutes(auth, db));

// Challenge catalog (public) + challenge admin (ADMIN+, PRD §22).
app.use(createChallengeRoutes(auth, db));
app.use("/api", createChallengeRoutes(auth, db));
app.use(createAdminRoutes(auth, db));
app.use("/api", createAdminRoutes(auth, db));

// Visible-test execution queue (PRD §10/§12).
app.use(createRunRoutes(auth, db));
app.use("/api", createRunRoutes(auth, db));

// Submissions (hidden judging) + leaderboards (PRD §12/§16).
app.use(createSubmissionRoutes(auth, db));
app.use("/api", createSubmissionRoutes(auth, db));
app.use(createLeaderboardRoutes(auth, db));
app.use("/api", createLeaderboardRoutes(auth, db));

// Community solutions + comments + likes (PRD §19, solved-only reads).
app.use(createSolutionRoutes(auth, db));
app.use("/api", createSolutionRoutes(auth, db));

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
app.set("io", initRealtime(httpServer, auth));

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
