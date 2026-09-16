import { Router } from "express";
import { ObjectId } from "mongodb";
import { RANKS, XP_TABLE, rankFor } from "../../workers/scoring.js";
import { getSessionUser } from "../lib/session.js";

/**
 * Leaderboards (PRD §16) — public reads, computed from durable state.
 *
 *   GET /leaderboard/global    → top users by rating (competitive ladder)
 *   GET /leaderboard/level     → top users by XP / level (progression race)
 *   GET /leaderboard/weekly    → top rating progression over the last 7 days
 *   GET /leaderboard/language?language=javascript → per-language XP race
 *   GET /leaderboard/category?category=backend   → per-category XP race
 *   GET /leaderboard/me?type=global&language=&category= → own position
 *   GET /leaderboard/ranks     → rank ladder + XP config (frontend mirrors)
 *
 * Rating is global (one Elo ladder). Language/category boards rank by the
 * per-track XP credited in workers/judge.js (xpByLanguage / xpByCategory).
 * Weekly accepts the same ?language= / ?category= filters — they scope the
 * ratingEvents window, so only solves in that track count.
 */

export const LEADERBOARD_LANGUAGES = ["javascript", "typescript", "Python"];
export const LEADERBOARD_CATEGORIES = [
  "newbies",
  "general",
  "algorithms",
  "frontend",
  "backend",
  "security",
  "database",
  "performance",
];
export const LEADERBOARD_TYPES = ["global", "level", "weekly", "language", "category"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseLimit(req, def = 20) {
  return Math.min(100, Math.max(1, Number(req.query.limit) || def));
}

function parsePage(req) {
  return Math.min(1000, Math.max(1, Number(req.query.page) || 1));
}

function publicEntry(user, stats, extra = {}) {
  return {
    username: user?.username ?? null,
    displayName: user?.displayName ?? user?.name ?? user?.username ?? null,
    avatarUrl: user?.avatarUrl ?? user?.image ?? null,
    rating: stats?.rating ?? 1000,
    rank: rankFor(stats?.rating ?? 1000),
    xp: stats?.xp ?? 0,
    level: stats?.level ?? 1,
    solvedCount: stats?.solvedCount ?? 0,
    ...extra,
  };
}

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

/** Hydrate stats rows with public user docs, preserving order. */
async function withUsers(db, statsRows, mapEntry) {
  const oids = statsRows
    .map((s) => toObjectId(String(s.userId)))
    .filter(Boolean);
  const users = await db
    .collection("user")
    .find({ _id: { $in: oids } })
    .project({ username: 1, displayName: 1, name: 1, avatarUrl: 1, image: 1 })
    .toArray();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return statsRows.map((s, i) => mapEntry(byId.get(String(s.userId)), s, i));
}

/** Best-effort session user id (null when anonymous) — never throws. */
async function sessionUserId(db, req) {
  const found = await getSessionUser(db, req);
  return found ? String(found.user._id) : null;
}

export function createLeaderboardRoutes(db) {
  const router = Router();

  // ── Global: competitive rating ladder ──────────────────────────
  router.get("/leaderboard/global", async (req, res) => {
    try {
      const limit = parseLimit(req);
      const page = parsePage(req);
      const [rows, total] = await Promise.all([
        db
          .collection("profileStats")
          .find({})
          .sort({ rating: -1, xp: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("profileStats").countDocuments({}),
      ]);
      const entries = await withUsers(db, rows, (user, s, i) => ({
        rank_position: (page - 1) * limit + i + 1,
        ...publicEntry(user, s),
      }));
      return res.json({ entries, total, page, limit, type: "global" });
    } catch (err) {
      console.error("[leaderboard] global failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load leaderboard." });
    }
  });

  // ── Level: progression race, sorted by total XP ────────────────
  router.get("/leaderboard/level", async (req, res) => {
    try {
      const limit = parseLimit(req);
      const page = parsePage(req);
      const [rows, total] = await Promise.all([
        db
          .collection("profileStats")
          .find({})
          .sort({ xp: -1, rating: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("profileStats").countDocuments({}),
      ]);
      const entries = await withUsers(db, rows, (user, s, i) => ({
        rank_position: (page - 1) * limit + i + 1,
        ...publicEntry(user, s),
      }));
      return res.json({ entries, total, page, limit, type: "level" });
    } catch (err) {
      console.error("[leaderboard] level failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load leaderboard." });
    }
  });

  // ── Weekly: rating progression over the last 7 days ────────────
  // Optional ?language= / ?category= scopes the event window to a track.
  router.get("/leaderboard/weekly", async (req, res) => {
    try {
      const limit = parseLimit(req);
      const page = parsePage(req);
      const language = String(req.query.language ?? "").toLowerCase() || null;
      const category = String(req.query.category ?? "").toLowerCase() || null;
      if (language && !LEADERBOARD_LANGUAGES.includes(language)) {
        return res.status(422).json({ error: `Unknown language “${language}”.` });
      }
      if (category && !LEADERBOARD_CATEGORIES.includes(category)) {
        return res.status(422).json({ error: `Unknown category “${category}”.` });
      }
      const since = new Date(Date.now() - WEEK_MS);
      const match = { createdAt: { $gte: since } };
      if (language) match.language = language;
      if (category) match.category = category;

      const grouped = await db
        .collection("ratingEvents")
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: "$userId",
              weeklyDelta: { $sum: "$ratingDelta" },
              xpEarned: { $sum: "$xpAwarded" },
              solves: { $sum: { $cond: ["$accepted", 1, 0] } },
            },
          },
          { $sort: { weeklyDelta: -1 } },
          {
            $facet: {
              entries: [{ $skip: (page - 1) * limit }, { $limit: limit }],
              count: [{ $count: "n" }],
            },
          },
        ])
        .toArray();
      const facet = grouped[0] ?? { entries: [], count: [] };
      const deltas = facet.entries ?? [];
      const total = facet.count?.[0]?.n ?? 0;

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
        rank_position: (page - 1) * limit + i + 1,
        ...publicEntry(userById.get(String(d._id)), statsById.get(String(d._id))),
        weeklyDelta: d.weeklyDelta,
        xpEarned: d.xpEarned,
        solves: d.solves,
      }));
      return res.json({ entries, total, page, limit, type: "weekly", language, category });
    } catch (err) {
      console.error("[leaderboard] weekly failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load leaderboard." });
    }
  });

  // ── Language: per-language XP race ─────────────────────────────
  router.get("/leaderboard/language", async (req, res) => {
    try {
      const language = String(req.query.language ?? "").toLowerCase();
      if (!LEADERBOARD_LANGUAGES.includes(language)) {
        return res
          .status(422)
          .json({ error: "Pass ?language=javascript|typescript|Python." });
      }
      const limit = parseLimit(req);
      const page = parsePage(req);
      const track = `xpByLanguage.${language}`;
      const filter = { [track]: { $gt: 0 } };
      const sort = { [track]: -1, rating: -1 };
      const [rows, total] = await Promise.all([
        db
          .collection("profileStats")
          .find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("profileStats").countDocuments(filter),
      ]);
      const entries = await withUsers(db, rows, (user, s, i) => ({
        rank_position: (page - 1) * limit + i + 1,
        ...publicEntry(user, s, {
          trackXp: s?.xpByLanguage?.[language] ?? 0,
          trackSolves: s?.solvesByLanguage?.[language] ?? 0,
        }),
      }));
      return res.json({ entries, total, page, limit, type: "language", language });
    } catch (err) {
      console.error("[leaderboard] language failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load leaderboard." });
    }
  });

  // ── Category: per-category XP race ─────────────────────────────
  router.get("/leaderboard/category", async (req, res) => {
    try {
      const category = String(req.query.category ?? "").toLowerCase();
      if (!LEADERBOARD_CATEGORIES.includes(category)) {
        return res.status(422).json({
          error: `Pass ?category= one of ${LEADERBOARD_CATEGORIES.join(", ")}.`,
        });
      }
      const limit = parseLimit(req);
      const page = parsePage(req);
      const track = `xpByCategory.${category}`;
      const filter = { [track]: { $gt: 0 } };
      const sort = { [track]: -1, rating: -1 };
      const [rows, total] = await Promise.all([
        db
          .collection("profileStats")
          .find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("profileStats").countDocuments(filter),
      ]);
      const entries = await withUsers(db, rows, (user, s, i) => ({
        rank_position: (page - 1) * limit + i + 1,
        ...publicEntry(user, s, {
          trackXp: s?.xpByCategory?.[category] ?? 0,
          trackSolves: s?.solvesByCategory?.[category] ?? 0,
        }),
      }));
      return res.json({ entries, total, page, limit, type: "category", category });
    } catch (err) {
      console.error("[leaderboard] category failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load leaderboard." });
    }
  });

  // ── Me: the caller's position on any board ─────────────────────
  router.get("/leaderboard/me", async (req, res) => {
    try {
      const meId = await sessionUserId(db, req);
      if (!meId) return res.status(401).json({ error: "Not signed in." });
      const type = String(req.query.type ?? "global").toLowerCase();
      if (!LEADERBOARD_TYPES.includes(type)) {
        return res.status(422).json({ error: `Unknown board type “${type}”.` });
      }
      const language = String(req.query.language ?? "").toLowerCase() || null;
      const category = String(req.query.category ?? "").toLowerCase() || null;

      const stats = await db.collection("profileStats").findOne({ userId: meId });
      const user = await db
        .collection("user")
        .findOne(
          { _id: toObjectId(meId) },
          { projection: { username: 1, displayName: 1, name: 1, avatarUrl: 1, image: 1 } }
        );
      if (!stats) return res.status(404).json({ error: "Stats not found." });

      if (type === "global") {
        const ahead = await db
          .collection("profileStats")
          .countDocuments({ rating: { $gt: stats.rating ?? 1000 } });
        const total = await db.collection("profileStats").countDocuments({});
        return res.json({
          type,
          position: ahead + 1,
          total,
          ranked: true,
          entry: { rank_position: ahead + 1, ...publicEntry(user, stats) },
        });
      }

      if (type === "level") {
        const ahead = await db
          .collection("profileStats")
          .countDocuments({ xp: { $gt: stats.xp ?? 0 } });
        const total = await db.collection("profileStats").countDocuments({});
        return res.json({
          type,
          position: ahead + 1,
          total,
          ranked: true,
          entry: { rank_position: ahead + 1, ...publicEntry(user, stats) },
        });
      }

      if (type === "weekly") {
        if (language && !LEADERBOARD_LANGUAGES.includes(language)) {
          return res.status(422).json({ error: `Unknown language “${language}”.` });
        }
        if (category && !LEADERBOARD_CATEGORIES.includes(category)) {
          return res.status(422).json({ error: `Unknown category “${category}”.` });
        }
        const since = new Date(Date.now() - WEEK_MS);
        const match = { createdAt: { $gte: since } };
        if (language) match.language = language;
        if (category) match.category = category;
        const all = await db
          .collection("ratingEvents")
          .aggregate([
            { $match: match },
            { $group: { _id: "$userId", weeklyDelta: { $sum: "$ratingDelta" } } },
          ])
          .toArray();
        const mine = all.find((d) => String(d._id) === meId);
        if (!mine) {
          return res.json({
            type,
            language,
            category,
            position: null,
            total: all.length,
            ranked: false,
            entry: { ...publicEntry(user, stats), weeklyDelta: 0 },
          });
        }
        const ahead = all.filter((d) => d.weeklyDelta > mine.weeklyDelta).length;
        return res.json({
          type,
          language,
          category,
          position: ahead + 1,
          total: all.length,
          ranked: true,
          entry: {
            rank_position: ahead + 1,
            ...publicEntry(user, stats),
            weeklyDelta: mine.weeklyDelta,
          },
        });
      }

      if (type === "language") {
        if (!LEADERBOARD_LANGUAGES.includes(language)) {
          return res
            .status(422)
            .json({ error: "Pass ?language=javascript|typescript|Python." });
        }
        const track = `xpByLanguage.${language}`;
        const mine = stats?.xpByLanguage?.[language] ?? 0;
        const [ahead, total] = await Promise.all([
          db.collection("profileStats").countDocuments({ [track]: { $gt: mine } }),
          db.collection("profileStats").countDocuments({ [track]: { $gt: 0 } }),
        ]);
        return res.json({
          type,
          language,
          position: mine > 0 ? ahead + 1 : null,
          total,
          ranked: mine > 0,
          entry: {
            rank_position: mine > 0 ? ahead + 1 : null,
            ...publicEntry(user, stats, {
              trackXp: mine,
              trackSolves: stats?.solvesByLanguage?.[language] ?? 0,
            }),
          },
        });
      }

      // type === "category"
      if (!LEADERBOARD_CATEGORIES.includes(category)) {
        return res.status(422).json({
          error: `Pass ?category= one of ${LEADERBOARD_CATEGORIES.join(", ")}.`,
        });
      }
      const track = `xpByCategory.${category}`;
      const mine = stats?.xpByCategory?.[category] ?? 0;
      const [ahead, total] = await Promise.all([
        db.collection("profileStats").countDocuments({ [track]: { $gt: mine } }),
        db.collection("profileStats").countDocuments({ [track]: { $gt: 0 } }),
      ]);
      return res.json({
        type,
        category,
        position: mine > 0 ? ahead + 1 : null,
        total,
        ranked: mine > 0,
        entry: {
          rank_position: mine > 0 ? ahead + 1 : null,
          ...publicEntry(user, stats, {
            trackXp: mine,
            trackSolves: stats?.solvesByCategory?.[category] ?? 0,
          }),
        },
      });
    } catch (err) {
      console.error("[leaderboard] me failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load your position." });
    }
  });

  // ── Ranks: ladder + tuning for frontend mirrors ────────────────
  router.get("/leaderboard/ranks", async (_req, res) => {
    return res.json({
      ranks: RANKS,
      xpTable: XP_TABLE,
      xpPerLevel: 250,
      startRating: 1000,
      languages: LEADERBOARD_LANGUAGES,
      categories: LEADERBOARD_CATEGORIES,
      types: LEADERBOARD_TYPES,
    });
  });

  return router;
}
