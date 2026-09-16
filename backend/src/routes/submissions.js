import { Router } from "express";
import { ObjectId } from "mongodb";
import { validate } from "../middleware/validate.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { getSessionUser } from "../lib/session.js";
import { runRequestSchema, EXECUTABLE_LANGUAGES } from "../validation.js";
import { mergeChallengeFiles, findPublishedChallenge, findAcceptedSubmission } from "../lib/challengeFiles.js";
import { createRun } from "../../workers/queue.js";

/**
 * Submissions — the immutable judging record (PRD §12 / §29).
 *
 *   POST /challenges/:id/submit → 202 { submissionId } (hidden judging)
 *   GET  /submissions/:id        → verdict + breakdown (owner/admin)
 *   GET  /users/me/submissions   → own history, newest first
 *
 * Like runs, the client sends CODE only; hidden tests, entry, and limits
 * come from the published doc. The worker transitions pending → terminal
 * exactly once; submissions are never mutated afterwards.
 */

async function requireUserId(db, req, res) {
  const found = await getSessionUser(db, req, res);
  if (!found) {
    res.status(401).json({ error: "Not signed in." });
    return null;
  }
  return { id: found.user._id, roles: found.user.roles ?? [] };
}

function isAdmin(roles) {
  return Array.isArray(roles) && roles.some((r) => r === "ADMIN" || r === "FOUNDER");
}

export function sanitizeSubmission(doc) {
  if (!doc) return null;
  const { _id, challengeId, userId, ...rest } = doc;
  return {
    id: _id?.toString?.() ?? doc.id,
    challengeId: challengeId?.toString?.() ?? challengeId ?? null,
    userId: userId?.toString?.() ?? userId ?? null,
    ...rest,
  };
}

export function createSubmissionRoutes(db) {
  const router = Router();
  const submissions = () => db.collection("submissions");

  // Submissions are expensive (hidden-suite execution) — tighter than runs.
  const submitLimit = () => authRateLimit({ windowMs: 60_000, max: 10 });

  router.post(
    "/challenges/:id/submit",
    submitLimit(),
    validate(runRequestSchema),
    async (req, res) => {
      const me = await requireUserId(db, req, res);
      if (!me) return;
      try {
        const challenge = await findPublishedChallenge(db, req.params.id);
        if (!challenge) {
          return res.status(404).json({ error: "Challenge not found." });
        }
        if (!EXECUTABLE_LANGUAGES.includes(challenge.language)) {
          return res.status(422).json({
            error: `Execution for ${challenge.language} isn't available yet.`,
          });
        }
        if (!challenge.entryFile || !challenge.entryFunction) {
          console.error(`[submit] challenge ${challenge.slug} missing entry point`);
          return res.status(500).json({ error: "Challenge is misconfigured." });
        }
        // Solved challenges are locked: view-only, no re-submits.
        if (await findAcceptedSubmission(db, me.id, challenge._id)) {
          return res.status(403).json({ error: "Challenge already solved." });
        }

        const merged = mergeChallengeFiles(challenge, req.body.files);
        if (merged.error) {
          return res.status(422).json({ error: merged.error });
        }

        const now = new Date();
        const { insertedId: submissionId } = await submissions().insertOne({
          userId: me.id,
          challengeId: challenge._id,
          challengeSlug: challenge.slug,
          challengeTitle: challenge.title,
          challengeVersion: challenge.version ?? 1,
          difficulty: challenge.difficulty,
          language: challenge.language,
          category: challenge.category ?? null,
          files: merged.merged,
          status: "pending",
          testsPassed: 0,
          testsTotal: (challenge.hiddenTests ?? []).length,
          results: [],
          score: 0,
          scoreBreakdown: null,
          xpAwarded: 0,
          ratingDelta: 0,
          executionTimeMs: null,
          error: null,
          createdAt: now,
          completedAt: null,
        });

        await createRun(db, {
          kind: "submit",
          submissionId,
          userId: me.id,
          challengeId: challenge._id,
          challengeSlug: challenge.slug,
          challengeTitle: challenge.title,
          challengeVersion: challenge.version ?? 1,
          difficulty: challenge.difficulty,
          language: challenge.language,
          category: challenge.category ?? null,
          entryFile: challenge.entryFile,
          entryFunction: challenge.entryFunction,
          testContext: challenge.testContext ?? {},
          tests: challenge.hiddenTests ?? [],
          files: merged.merged,
          timeLimitMs: challenge.timeLimitMs ?? 2000,
        });
        return res.status(202).json({ submissionId: submissionId.toString(), status: "pending" });
      } catch (err) {
        console.error("[submit] enqueue failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not queue this submission." });
      }
    }
  );

  router.get("/submissions/:id", async (req, res) => {
    const me = await requireUserId(db, req, res);
    if (!me) return;
    try {
      let doc = null;
      try {
        doc = await submissions().findOne({ _id: new ObjectId(req.params.id) });
      } catch {
        doc = null;
      }
      if (!doc) return res.status(404).json({ error: "Submission not found." });
      const owner = doc.userId?.toString?.() === me.id.toString();
      if (!owner && !isAdmin(me.roles)) {
        return res.status(404).json({ error: "Submission not found." });
      }
      return res.json({ submission: sanitizeSubmission(doc) });
    } catch (err) {
      console.error("[submissions] fetch failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load submission." });
    }
  });

  router.get("/users/me/submissions", async (req, res) => {
    const me = await requireUserId(db, req, res);
    if (!me) return;
    try {
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const [items, total] = await Promise.all([
        submissions()
          .find({ userId: me.id })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        submissions().countDocuments({ userId: me.id }),
      ]);
      // History stays light — full snapshots live on the detail route.
      const light = items.map((d) => {
        const s = sanitizeSubmission(d);
        return { ...s, files: (s.files ?? []).map((f) => f.path) };
      });
      return res.json({ items: light, total, page, limit });
    } catch (err) {
      console.error("[submissions] history failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load submissions." });
    }
  });

  return router;
}
