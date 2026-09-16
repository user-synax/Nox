import { Router } from "express";
import { ObjectId } from "mongodb";
import { validate } from "../middleware/validate.js";
import { strictAuthLimit } from "../middleware/rateLimit.js";
import { getSessionUser } from "../lib/session.js";
import { runRequestSchema, EXECUTABLE_LANGUAGES } from "../validation.js";
import { mergeChallengeFiles, findAcceptedSubmission } from "../lib/challengeFiles.js";
import { createRun, getRun, sanitizeRun } from "../../workers/queue.js";

/**
 * Visible-test execution (PRD §12 / §29 — run half of the loop).
 *
 *   POST /challenges/:id/run  → 202 { runId } (session, rate-limited)
 *   GET  /runs/:id             → run state (owner or admin only)
 *
 * Trust boundaries: the client sends CODE only. Tests, entry point, and
 * limits always come from the published challenge doc — never the body.
 * Missing files are backfilled from starters; unknown paths are rejected.
 * Hidden tests are never attached to runs (submit milestone owns those).
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

export function createRunRoutes(db) {
  const router = Router();
  const challenges = () => db.collection("challenges");

  router.post(
    "/challenges/:id/run",
    strictAuthLimit(),
    validate(runRequestSchema),
    async (req, res) => {
      const me = await requireUserId(auth, req, res);
      if (!me) return;
      try {
        // Accept ObjectId or slug in :id.
        let challenge = null;
        try {
          challenge = await challenges().findOne({ _id: new ObjectId(req.params.id) });
        } catch {
          challenge = await challenges().findOne({
            slug: String(req.params.id).toLowerCase(),
          });
        }
        if (!challenge || challenge.status !== "published") {
          return res.status(404).json({ error: "Challenge not found." });
        }
        if (!EXECUTABLE_LANGUAGES.includes(challenge.language)) {
          return res.status(422).json({
            error: `Execution for ${challenge.language} isn't available yet.`,
          });
        }
        if (!challenge.entryFile || !challenge.entryFunction) {
          console.error(`[runs] challenge ${challenge.slug} missing entry point`);
          return res.status(500).json({ error: "Challenge is misconfigured." });
        }
        // Solved challenges are locked: view-only, no more runs.
        if (await findAcceptedSubmission(db, me.id, challenge._id)) {
          return res.status(403).json({ error: "Challenge already solved." });
        }

        const starterPaths = new Set((challenge.starterFiles ?? []).map((f) => f.path));
        if (!starterPaths.has(challenge.entryFile)) {
          console.error(`[runs] challenge ${challenge.slug} entry not in starters`);
          return res.status(500).json({ error: "Challenge is misconfigured." });
        }
        const merged = mergeChallengeFiles(challenge, req.body.files);
        if (merged.error) {
          return res.status(422).json({ error: merged.error });
        }

        const runId = await createRun(db, {
          kind: "run",
          userId: me.id,
          challengeId: challenge._id,
          challengeSlug: challenge.slug,
          challengeVersion: challenge.version ?? 1,
          language: challenge.language,
          entryFile: challenge.entryFile,
          entryFunction: challenge.entryFunction,
          testContext: challenge.testContext ?? {},
          tests: challenge.visibleTests ?? [],
          files: merged.merged,
          timeLimitMs: challenge.timeLimitMs ?? 2000,
        });
        return res.status(202).json({ runId, status: "queued" });
      } catch (err) {
        console.error("[runs] enqueue failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not queue this run." });
      }
    }
  );

  router.get("/runs/:id", async (req, res) => {
    const me = await requireUserId(auth, req, res);
    if (!me) return;
    try {
      const run = await getRun(db, req.params.id);
      // Owner or admin; everyone else gets 404 (no existence leak).
      if (!run) return res.status(404).json({ error: "Run not found." });
      const owner = run.userId?.toString?.() === me.id.toString();
      if (!owner && !isAdmin(me.roles)) {
        return res.status(404).json({ error: "Run not found." });
      }
      return res.json({ run: sanitizeRun(run) });
    } catch (err) {
      console.error("[runs] fetch failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load run." });
    }
  });

  return router;
}
