import "dotenv/config";
import { MongoClient } from "mongodb";
import { connectDB } from "../src/db.js";
import { claimNext, finishRun, sweepStale } from "./queue.js";
import { executeJavascript } from "./runners/javascript.js";
import { executePython } from "./runners/Python.js";

/**
 * Execution worker — separate process from the API (PRD §10: untrusted
 * code NEVER runs in the API process). Polls the Mongo queue, runs jobs
 * in throwaway temp dirs via language runners, writes results back.
 *
 *   bun workers/runner.js
 *
 * Env: WORKER_ID (default pid), WORKER_CONCURRENCY (default 2),
 *   WORKER_POLL_MS (default 300), NOX_PYTHON (default "Python").
 * Scale by running more processes; a Docker worker later replaces the
 * language runners without touching the queue protocol.
 */

const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`;
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2) || 2);
const POLL_MS = Math.max(50, Number(process.env.WORKER_POLL_MS ?? 100) || 100);
const LEASE_MS = 60_000;

let client;
try {
  ({ client } = await connectDB(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/Nox"));
} catch (err) {
  console.error(`[worker] cannot reach MongoDB: ${err?.message ?? err}`);
  process.exit(1);
}
const db = client.db();
console.log(`[worker:${WORKER_ID}] up (concurrency ${CONCURRENCY}, langs js+py)`);

const swept = await sweepStale(db).catch((err) => {
  console.error(`[worker:${WORKER_ID}] sweep failed: ${err?.message ?? err}`);
  return { requeued: 0, poisoned: 0 };
});
if (swept.requeued > 0 || swept.poisoned > 0) {
  console.log(`[worker:${WORKER_ID}] recovered ${swept.requeued} orphaned, ${swept.poisoned} poisoned`);
}

let stopping = false;
let inFlight = 0;

async function handleOne(job) {
  inFlight += 1;
  try {
    const result =
      job.language === "Python" ? await executePython(job) : await executeJavascript(job);
    await finishRun(db, job._id.toString(), result);
    // Completed runs count as attempts (analytics), infra faults excluded.
    if (result.status !== "system-error" && job.challengeId) {
      await db
        .collection("challenges")
        .updateOne({ _id: job.challengeId }, { $inc: { attemptCount: 1 } })
        .catch(() => {});
    }
    console.log(
      `[worker:${WORKER_ID}] run ${job._id.toString()} → ${result.status} (${result.testsPassed}/${result.testsTotal}, ${result.executionTimeMs}ms)`
    );
  } catch (err) {
    console.error(`[worker:${WORKER_ID}] run ${job._id?.toString?.()} crashed: ${err?.message ?? err}`);
    try {
      await finishRun(db, job._id.toString(), {
        status: "system-error",
        testsPassed: 0,
        testsTotal: job.tests?.length ?? 0,
        results: [],
        error: "We couldn't run this submission right now. No rating penalty was applied.",
        output: null,
        executionTimeMs: null,
      });
    } catch {}
  } finally {
    inFlight -= 1;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loop() {
  while (!stopping) {
    try {
      while (inFlight < CONCURRENCY) {
        const job = await claimNext(db, WORKER_ID, LEASE_MS);
        if (!job) break;
        void handleOne(job);
      }
    } catch (err) {
      console.error(`[worker:${WORKER_ID}] claim failed: ${err?.message ?? err}`);
    }
    await sleep(POLL_MS);
  }
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[worker:${WORKER_ID}] ${signal} — draining ${inFlight} job(s)`);
  const deadline = Date.now() + 30_000;
  while (inFlight > 0 && Date.now() < deadline) await sleep(200);
  try {
    await client.close();
  } catch {}
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

await loop();
