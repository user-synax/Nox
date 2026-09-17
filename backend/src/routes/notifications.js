import { Router } from "express";
import { ObjectId } from "mongodb";
import { getSessionUser } from "../lib/session.js";
import {
  sanitizeNotification,
  unreadCountFor,
} from "../lib/notifications.js";

/**
 * Notifications inbox (PRD §21 / §29).
 *
 *   GET  /notifications             → newest first + unread count
 *   GET  /notifications/unread-count → light bell poll { unread }
 *   POST /notifications/read        → { ids[] } and/or { all: true }
 *
 * REST is the source of truth; `notification:new` socket events are
 * hints only (clients refetch authoritative state on reconnect).
 */

const ID_RX = /^[a-f0-9]{24}$/i;

async function requireUser(db, req, res) {
  const found = await getSessionUser(db, req, res);
  if (!found) {
    res.status(401).json({ error: "Not signed in." });
    return null;
  }
  return found.user._id;
}

export function createNotificationRoutes(db) {
  const router = Router();
  const col = () => db.collection("notifications");

  // Registered BEFORE /notifications/:id-style routes (none today, but
  // cheapest to keep literal paths first by convention).
  router.get("/notifications/unread-count", async (req, res) => {
    const userId = await requireUser(db, req, res);
    if (!userId) return;
    return res.json({ unread: await unreadCountFor(db, userId) });
  });

  router.get("/notifications", async (req, res) => {
    const userId = await requireUser(db, req, res);
    if (!userId) return;
    try {
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const filter = { userId };
      const [rows, total, unread] = await Promise.all([
        col()
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        col().countDocuments(filter),
        unreadCountFor(db, userId),
      ]);
      return res.json({
        items: rows.map(sanitizeNotification),
        total,
        unread,
        page,
        limit,
      });
    } catch (err) {
      console.error("[notifications] list failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load notifications." });
    }
  });

  router.post("/notifications/read", async (req, res) => {
    const userId = await requireUser(db, req, res);
    if (!userId) return;
    try {
      const { ids, all } = req.body ?? {};
      const oidIds = Array.isArray(ids)
        ? [...new Set(ids.map(String))].filter((s) => ID_RX.test(s)).map((s) => new ObjectId(s)).slice(0, 100)
        : [];
      if (oidIds.length === 0 && all !== true) {
        return res.status(422).json({ error: "Pass { ids[] } and/or { all: true }." });
      }
      const or = [];
      if (oidIds.length > 0) or.push({ _id: { $in: oidIds } });
      if (all === true) or.push({ readAt: null });
      // When ids are given WITHOUT all:true, allow re-stamping (harmless,
      // idempotent); all:true only touches currently-unread rows.
      const filter =
        oidIds.length > 0 && all !== true
          ? { userId, _id: { $in: oidIds } }
          : { userId, $or: or };
      const r = await col().updateMany(filter, { $set: { readAt: new Date() } });
      return res.json({ read: r.modifiedCount ?? 0, unread: await unreadCountFor(db, userId) });
    } catch (err) {
      console.error("[notifications] read failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not update notifications." });
    }
  });

  return router;
}
