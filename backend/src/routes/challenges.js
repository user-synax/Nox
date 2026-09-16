import { Router } from "express";
import { ObjectId } from "mongodb";
import { validate } from "../middleware/validate.js";
import { getSessionUser } from "../lib/session.js";
import { challengeListQuerySchema } from "../validation.js";

/**
 * Public challenge catalog (PRD §7 / §20 / §29).
 *
 *   GET /challenges        → published only, filterable, paginated
 *   GET /challenges/:slug  → full public detail (hidden tests stripped)
 *
 * Hidden tests never leave the server on these routes — admin reads live
 * in routes/admin.js behind requireAdmin. `solved` is real per-user state
 * (accepted submission); solved details also carry the accepted `solution`
 * snapshot so the workspace can render it read-only.
 */

function stripHidden(doc) {
  if (!doc) return null;
  const { _id, hiddenTests, authorId, ...rest } = doc;
  return { id: _id?.toString?.() ?? doc.id, ...rest };
}

function withRate(doc, solved) {
  if (!doc) return null;
  const attempts = doc.attemptCount ?? 0;
  const solves = doc.solveCount ?? 0;
  return {
    ...doc,
    successRate: attempts > 0 ? solves / attempts : null,
    solved: !!solved,
    solvedAt: solved?.solvedAt ?? null,
  };
}

/** Session user id (null when anonymous) — best-effort, never throws. */
async function sessionUserId(db, req) {
  const found = await getSessionUser(db, req);
  return found ? found.user._id : null;
}

/** Accepted submissions for (user × challenges) → solved lookup map. */
async function acceptedMap(db, userId, challengeIds) {
  const map = new Map();
  if (!userId || challengeIds.length === 0) return map;
  const rows = await db
    .collection("submissions")
    .find(
      { userId, challengeId: { $in: challengeIds }, status: "accepted" },
      { projection: { challengeId: 1, completedAt: 1 } }
    )
    .toArray()
    .catch(() => []);
  for (const r of rows) {
    map.set(r.challengeId.toString(), { solvedAt: r.completedAt ?? null, submissionId: r._id.toString() });
  }
  return map;
}

function buildFilter(q) {
  const filter = { status: "published" };
  if (q.difficulty) filter.difficulty = q.difficulty;
  if (q.language) filter.language = q.language;
  if (q.category) filter.category = q.category;
  if (q.tag) filter.tags = q.tag;
  if (q.q) {
    const rx = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }
  return filter;
}

/** Personal score for `recommended` — prefs first, popularity second. */
function recommendScore(doc, prefs) {
  let score = 0;
  if (prefs.languages?.includes(doc.language)) score += 2;
  if (prefs.interests?.includes(doc.category)) score += 1;
  score += Math.log10((doc.solveCount ?? 0) + 1) * 0.5;
  return score;
}

export function createChallengeRoutes(db) {
  const router = Router();
  const challenges = () => db.collection("challenges");

  router.get("/challenges", validate(challengeListQuerySchema, "query"), async (req, res) => {
    try {
      const q = req.query;
      const filter = buildFilter(q);
      const total = await challenges().countDocuments(filter);

      // Pull a bounded window, then sort in memory: sorts mix personal
      // signals (recommended) with counters, none of which index cleanly
      // together at catalog scale. Cap keeps it cheap until search grows up.
      const docs = await challenges()
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();

      let prefs = { languages: [], interests: [] };
      let userId = null;
      {
        // Best-effort: anonymous users get trending-flavored recommendations.
        const found = await getSessionUser(db, req);
        if (found) {
          userId = found.user._id;
          if (q.sort === "recommended") {
            const stats = await db
              .collection("profileStats")
              .findOne({ userId: found.user._id.toString() });
            prefs = {
              languages: stats?.preferredLanguages ?? [],
              interests: found.user.interests ?? [],
            };
          }
        }
      }

      const scored = docs.map((d) => ({ doc: d, score: 0 }));
      if (q.sort === "recommended") {
        for (const s of scored) s.score = recommendScore(s.doc, prefs);
        scored.sort((a, b) => b.score - a.score);
      } else if (q.sort === "trending" || q.sort === "popular") {
        scored.sort(
          (a, b) =>
            (b.doc.solveCount ?? 0) + (b.doc.attemptCount ?? 0) * 0.3 -
            ((a.doc.solveCount ?? 0) + (a.doc.attemptCount ?? 0) * 0.3)
        );
      } // newest: already createdAt-desc from the query

      const start = (q.page - 1) * q.limit;
      const pageDocs = scored.slice(start, start + q.limit).map((s) => s.doc);
      const solvedBy = await acceptedMap(
        db,
        userId,
        pageDocs.map((d) => d._id)
      );
      const items = pageDocs
        .map((doc) => withRate(stripHidden(doc), solvedBy.get(doc._id.toString())))
        // List payload stays light: detail route serves files + tests.
        .map(({ starterFiles, visibleTests, description, ...rest }) => ({
          ...rest,
          excerpt: (description ?? "").slice(0, 160),
        }));

      return res.json({ items, total, page: q.page, limit: q.limit });
    } catch (err) {
      console.error("[challenges] list failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load challenges." });
    }
  });

  router.get("/challenges/:slug", async (req, res) => {
    const slug = String(req.params.slug ?? "").toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      return res.status(404).json({ error: "Challenge not found." });
    }
    try {
      const doc = await challenges().findOne({ slug, status: "published" });
      if (!doc) return res.status(404).json({ error: "Challenge not found." });
      const userId = await sessionUserId(db, req);
      const solvedBy = await acceptedMap(db, userId, [doc._id]);
      const solved = solvedBy.get(doc._id.toString()) ?? null;
      const challenge = withRate(stripHidden(doc), solved);
      // Solved → attach the accepted snapshot so clients can render it
      // read-only. Never attached otherwise (no solution to show).
      if (solved) {
        const accepted = await db.collection("submissions").findOne(
          { userId, challengeId: doc._id, status: "accepted" },
          { sort: { completedAt: 1 } }
        );
        if (accepted) {
          challenge.solution = {
            submissionId: accepted._id.toString(),
            files: accepted.files ?? [],
            score: accepted.score ?? null,
            solvedAt: accepted.completedAt ?? null,
          };
        }
      }
      return res.json({ challenge });
    } catch (err) {
      console.error("[challenges] detail failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load challenge." });
    }
  });

  return router;
}
