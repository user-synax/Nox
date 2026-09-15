/**
 * MongoDB-backed execution queue (PRD §10 "queue or equivalent").
 *
 * No Redis to install: `runs` doubles as the durable job log. Workers
 * claim jobs atomically; leases + a startup sweep recover crashed workers.
 * Statuses: queued → running → passed | failed | timeout | runtime-error,
 * plus system-error (infra fault, retried up to 3 attempts).
 */
import { ObjectId } from "mongodb";

export const TERMINAL_RUN = new Set([
  "passed",
  "failed",
  "timeout",
  "runtime-error",
  "system-error",
]);

const MAX_ATTEMPTS = 3;

export async function createRun(db, doc) {
  const now = new Date();
  const { insertedId } = await db.collection("runs").insertOne({
    type: "run",
    status: "queued",
    attempts: 0,
    testsPassed: 0,
    testsTotal: doc.tests?.length ?? 0,
    results: [],
    error: null,
    output: null,
    executionTimeMs: null,
    createdAt: now,
    ...doc,
  });
  return insertedId.toString();
}

export function getRun(db, id) {
  return db.collection("runs").findOne({ _id: toId(id) }).catch(() => null);
}

function toId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

/** Atomic claim: oldest queued job with attempts left. */
export async function claimNext(db, workerId, leaseMs) {
  const now = new Date();
  const doc = await db.collection("runs").findOneAndUpdate(
    { status: "queued", attempts: { $lt: MAX_ATTEMPTS } },
    {
      $set: {
        status: "running",
        workerId,
        leaseUntil: new Date(now.getTime() + leaseMs),
        startedAt: now,
      },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" }
  );
  return doc ?? null;
}

export async function finishRun(db, id, result) {
  await db.collection("runs").updateOne(
    { _id: toId(id) },
    {
      $set: {
        ...result,
        completedAt: new Date(),
      },
    }
  );
}

/**
 * Crash recovery (runs at worker boot): expired leases go back to queued
 * unless attempts are exhausted — those become system-error, never silent.
 */
export async function sweepStale(db) {
  const now = new Date();
  const requeued = await db.collection("runs").updateMany(
    { status: "running", leaseUntil: { $lt: now }, attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { status: "queued", workerId: null, leaseUntil: null, startedAt: null } }
  );
  const poisoned = await db.collection("runs").updateMany(
    { status: "running", leaseUntil: { $lt: now }, attempts: { $gte: MAX_ATTEMPTS } },
    {
      $set: {
        status: "system-error",
        error: "Worker lost this job repeatedly. No rating penalty was applied.",
        completedAt: now,
      },
    }
  );
  return { requeued: requeued.modifiedCount, poisoned: poisoned.modifiedCount };
}

export function sanitizeRun(doc) {
  if (!doc) return null;
  // files (user code snapshot) stay server-side — the client already has
  // them and polling shouldn't re-download up to 500KB per tick.
  const { _id, challengeId, userId, files, ...rest } = doc;
  void files;
  return {
    id: _id?.toString?.() ?? doc.id,
    challengeId: challengeId?.toString?.() ?? challengeId ?? null,
    userId: userId?.toString?.() ?? userId ?? null,
    ...rest,
  };
}
