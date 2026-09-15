import { Router } from "express";
import { ObjectId } from "mongodb";
import { rankFor } from "../../workers/scoring.js";

/**
 * Leaderboards (PRD §16) — public reads, computed from durable state.
 *
 *   GET /leaderboard/global  → top users by rating
 *   GET /leaderboard/weekly  → top rating progression over the last 7 days
 */

function publicEntry(user, stats) {
  return {
    username: user?.username ?? null,
    displayName: user?.displayName ?? user?.name ?? user?.username ?? null,
    avatarUrl: user?.avatarUrl ?? user?.image ?? null,
    rating: stats?.rating ?? 1000,
    rank: rankFor(stats?.rating ?? 1000),
    xp: stats?.xp ?? 0,
    level: stats?.level ?? 1,
    solvedCount: stats?.solvedCount ?? 0,
  };
}

export function createLeaderboardRoutes(_auth, db) {
  const router = Router();

  router.get("/leaderboard/global", async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const top = await db
        .collection("profileStats")
        .find({})
        .sort({ rating: -1 })
        .limit(limit)
        .toArray();
      const userIds = top.map((s) => s.userId);
      const users = await db
        .collection("user")
        .find({ _id: { $in: userIds.map((id) => toObjectId(id)).filter(Boolean) } })
        .project({ username: 1, displayName: 1, name: 1, avatarUrl: 1, image: 1 })
        .toArray();
      // profileStats.userId is the string form; match loosely.
      const byId = new Map();
      for (const u of users) byId.set(u._id.toString(), u);
      const entries = top.map((s, i) => ({
        rank_position: i + 1,
        ...publicEntry(byId.get(String(s.userId)), s),
      }));
      return res.json({ entries, total: entries.length });
    } catch (err) {
      console.error("[leaderboard] global failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load leaderboard." });
    }
  });

  router.get("/leaderboard/weekly", async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const deltas = await db
        .collection("ratingEvents")
        .aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: "$userId",
              weeklyDelta: { $sum: "$ratingDelta" },
              xpEarned: { $sum: "$xpAwarded" },
              solves: { $sum: { $cond: ["$accepted", 1, 0] } },
            },
          },
          { $sort: { weeklyDelta: -1 } },
          { $limit: limit },
        ])
        .toArray();
      const oids = deltas.map((d) => toObjectId(String(d._id))).filter(Boolean);
      const [users, stats] = await Promise.all([
        db
          .collection("user")
          .find({ _id: { $in: oids } })
          .project({ username: 1, displayName: 1, name: 1, avatarUrl: 1, image: 1 })
          .toArray(),
        db
          .collection("profileStats")
          .find({ userId: { $in: deltas.map((d) => String(d._id)) } })
          .toArray(),
      ]);
      const userById = new Map(users.map((u) => [u._id.toString(), u]));
      const statsById = new Map(stats.map((s) => [String(s.userId), s]));
      const entries = deltas.map((d, i) => ({
        rank_position: i + 1,
        ...publicEntry(userById.get(String(d._id)), statsById.get(String(d._id))),
        weeklyDelta: d.weeklyDelta,
        xpEarned: d.xpEarned,
        solves: d.solves,
      }));
      return res.json({ entries, total: entries.length });
    } catch (err) {
      console.error("[leaderboard] weekly failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load leaderboard." });
    }
  });

  return router;
}

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}
