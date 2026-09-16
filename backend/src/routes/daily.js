import { Router } from "express";
import { ObjectId } from "mongodb";
import { toWebHeaders } from "./auth.js";

/**
 * Daily challenge — one canonical challenge per day (PRD §18).
 *
 *   GET /daily-challenge[?date=YYYY-MM-DD] → { date, challenge }
 *
 * Pure auto-rotation over published challenges: no admin step, no new
 * collection. The catalog is ordered by slug (stable, unique) and the day
 * picks index (days-since-epoch mod count). Days are UTC boundaries so
 * every user sees the same challenge and streak accounting (judge.js,
 * which also keys on UTC date strings) stays consistent.
 *
 * `?date=` selects a historic day with the same function — past dailies
 * link to normal challenge pages, so they stay solvable forever and
 * contribute to normal progression (no bonus XP/rating).
 * Hidden tests are stripped exactly like routes/challenges.js.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Days since Unix epoch (UTC) for a YYYY-MM-DD date, or null if invalid. */
function dayIndexFor(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? ""));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return Math.floor(ms / DAY_MS);
}

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
async function sessionUserId(auth, req) {
  try {
    const session = await auth.api.getSession({ headers: toWebHeaders(req) });
    return session?.user?.id ? new ObjectId(session.user.id) : null;
  } catch {
    return null;
  }
}

export function createDailyRoutes(auth, db) {
  const router = Router();
  const challenges = () => db.collection("challenges");

  router.get("/daily-challenge", async (req, res) => {
    try {
      const rawDate = req.query.date;
      let date;
      let dayIndex;
      if (rawDate === undefined) {
        date = todayStr();
        dayIndex = Math.floor(Date.now() / DAY_MS);
      } else {
        dayIndex = dayIndexFor(rawDate);
        if (dayIndex === null) {
          return res
            .status(422)
            .json({ error: "Pass ?date= as YYYY-MM-DD." });
        }
        date = String(rawDate);
      }

      const total = await challenges().countDocuments({ status: "published" });
      if (total === 0) {
        return res.status(404).json({ error: "No challenges published yet." });
      }
      const index = ((dayIndex % total) + total) % total;
      // Stable rotation order: slug is unique, so skip(index) is
      // deterministic for a fixed catalog. Covered by the
      // challenges_status_slug index (src/db.js).
      const docs = await challenges()
        .find({ status: "published" })
        .sort({ slug: 1 })
        .skip(index)
        .limit(1)
        .toArray();
      const doc = docs[0];
      if (!doc) return res.status(404).json({ error: "No challenges published yet." });

      const userId = await sessionUserId(auth, req);
      let solved = null;
      if (userId) {
        const accepted = await db.collection("submissions").findOne(
          { userId, challengeId: doc._id, status: "accepted" },
          { projection: { completedAt: 1 } }
        );
        if (accepted) solved = { solvedAt: accepted.completedAt ?? null };
      }
      const challenge = withRate(stripHidden(doc), solved);
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

      // Briefly cacheable: the answer only changes at UTC midnight.
      res.set("Cache-Control", "public, max-age=60");
      return res.json({ date, challenge });
    } catch (err) {
      console.error("[daily] fetch failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load today's challenge." });
    }
  });

  return router;
}
