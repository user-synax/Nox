import { ObjectId } from "mongodb";

/**
 * Notifications (PRD §21) — persisted inbox + realtime hint (§25).
 *
 * REST is the source of truth (`GET /notifications`); Socket.IO
 * `notification:new` on the recipient's `user:<id>` room is a hint only.
 * The judge worker writes directly (it has no access to Express `io`),
 * so worker-created rows (achievements, rank-ups) arrive via polling.
 */

export const NOTIFICATION_TYPES = [
  "solution_comment",
  "solution_like",
  "comment_like",
  "achievement",
  "rank_up",
];

function toOid(value) {
  try {
    return new ObjectId(String(value));
  } catch {
    return null;
  }
}

export function sanitizeNotification(doc) {
  if (!doc) return null;
  return {
    id: doc._id?.toString?.() ?? doc.id,
    type: doc.type,
    actor: doc.actorUsername
      ? {
          id: doc.actorId?.toString?.() ?? null,
          username: doc.actorUsername ?? null,
          displayName: doc.actorDisplayName ?? doc.actorUsername ?? null,
        }
      : null,
    title: doc.title ?? "",
    body: doc.body ?? "",
    data: doc.data ?? {},
    readAt: doc.readAt ?? null,
    createdAt: doc.createdAt ?? null,
  };
}

/**
 * Insert a notification. Self-actions are silently skipped (liking your
 * own solution must not notify you). Returns the inserted doc or null.
 */
export async function createNotification(
  db,
  { userId, type, actorId = null, actorUsername = null, actorDisplayName = null, title = "", body = "", data = {} }
) {
  if (!NOTIFICATION_TYPES.includes(type)) return null;
  const recipient = toOid(userId);
  if (!recipient) return null;
  const actor = actorId ? toOid(actorId) : null;
  if (actor && recipient.toString() === actor.toString()) return null;
  const now = new Date();
  const doc = {
    userId: recipient,
    type,
    actorId: actor,
    actorUsername,
    actorDisplayName: actorDisplayName ?? actorUsername,
    title: String(title).slice(0, 140),
    body: String(body).slice(0, 300),
    data,
    readAt: null,
    createdAt: now,
  };
  try {
    const { insertedId } = await db.collection("notifications").insertOne(doc);
    return { _id: insertedId, ...doc };
  } catch {
    return null;
  }
}

export async function unreadCountFor(db, userId) {
  try {
    return await db
      .collection("notifications")
      .countDocuments({ userId: toOid(userId) ?? userId, readAt: null });
  } catch {
    return 0;
  }
}
