import { Router } from "express";
import { ACHIEVEMENTS, ACHIEVEMENT_XP } from "../../workers/achievements.js";
import { toWebHeaders } from "./auth.js";

/**
 * Achievement catalog (PRD §6) — backend-owned definitions.
 *
 *   GET /achievements → { achievements: [{ key, name, description, xp }],
 *                         unlocked: [keys] (best-effort for the viewer) }
 *
 * Unlocks are awarded in workers/judge.js; per-user lists also ride on
 * GET /users/me and GET /users/:username as `achievements`.
 */

export async function unlockedKeys(db, userId) {
  try {
    const rows = await db
      .collection("userAchievements")
      .find({ userId: String(userId) }, { projection: { key: 1 } })
      .toArray();
    return rows.map((r) => r.key);
  } catch {
    return [];
  }
}

export async function unlockedEntries(db, userId) {
  try {
    const rows = await db
      .collection("userAchievements")
      .find({ userId: String(userId) })
      .sort({ unlockedAt: -1 })
      .toArray();
    return rows.map((r) => ({ key: r.key, unlockedAt: r.unlockedAt ?? null }));
  } catch {
    return [];
  }
}

export function createAchievementRoutes(auth, db) {
  const router = Router();

  router.get("/achievements", async (req, res) => {
    try {
      let unlocked = [];
      try {
        const session = await auth.api.getSession({ headers: toWebHeaders(req) });
        if (session?.user?.id) unlocked = await unlockedKeys(db, session.user.id);
      } catch {
        /* anonymous: catalog only */
      }
      return res.json({
        achievements: ACHIEVEMENTS.map((a) => ({ ...a, xp: ACHIEVEMENT_XP })),
        unlocked,
      });
    } catch (err) {
      console.error("[achievements] catalog failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load achievements." });
    }
  });

  return router;
}
