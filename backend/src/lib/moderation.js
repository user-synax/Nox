import { ObjectId } from "mongodb";

/**
 * Moderation shared helpers (PRD §23).
 *
 * Role model: USER < MODERATOR < ADMIN < FOUNDER (see requireRole.js).
 * Moderators review reports and hide content; role grants stay ADMIN+.
 *
 * Suspension model (flat fields on `user`):
 *   suspendedUntil: Date | null  — null = indefinite, past = expired
 *   suspendedReason / suspendedBy / suspendedAt
 * Enforcement lives in session.js (live sessions) + auth.js (login).
 */

const ROLE_RANK = { USER: 0, MODERATOR: 1, ADMIN: 2, FOUNDER: 3 };

export function roleRank(roles) {
  if (!Array.isArray(roles)) return -1;
  return Math.max(-1, ...roles.map((r) => ROLE_RANK[r] ?? -1));
}

/** MODERATOR and above — can review reports + hide content. */
export function isModerator(roles) {
  return roleRank(roles) >= ROLE_RANK.MODERATOR;
}

/** ADMIN and above — can manage roles. Mirrors requireAdmin(). */
export function isAdminRole(roles) {
  return roleRank(roles) >= ROLE_RANK.ADMIN;
}

/**
 * Suspension state for a user doc.
 * Returns { suspended, until, reason } — expired suspensions read as clear
 * (session.js lazily strips them on next touch).
 */
export function suspensionOf(userDoc) {
  const reason = userDoc?.suspendedReason ?? null;
  const until = userDoc?.suspendedUntil ?? null;
  // No stamp at all → never suspended.
  if (!reason && !until) return { suspended: false, until: null, reason: null };
  // Reason with no expiry → indefinite suspension, still active.
  if (!until) return { suspended: true, until: null, reason, indefinite: true };
  const untilDate = new Date(until);
  // Past expiry → reads as clear (session.js lazily strips the stamp).
  if (Number.isNaN(untilDate.getTime()) || untilDate <= new Date()) {
    return { suspended: false, until: untilDate, reason, expired: true };
  }
  return { suspended: true, until: untilDate, reason };
}

/** Every privileged moderation action writes one of these (PRD §23 audit). */
export async function writeAudit(db, { actorId, action, targetType = null, targetId = null, metadata = {} }) {
  try {
    let target = null;
    if (targetId !== null && targetId !== undefined) {
      try {
        target = new ObjectId(String(targetId));
      } catch {
        target = String(targetId);
      }
    }
    const { insertedId } = await db.collection("auditLog").insertOne({
      actorId: actorId ? new ObjectId(String(actorId)) : null,
      action,
      targetType,
      targetId: target,
      metadata: metadata ?? {},
      createdAt: new Date(),
    });
    return insertedId;
  } catch {
    return null;
  }
}

/**
 * Resolve every open report on a target (called after hide/unhide so the
 * queue can't go stale — one moderator click settles both).
 * Returns the count resolved.
 */
export async function resolveOpenReports(db, { targetType, targetId, status, reviewedBy, note = null }) {
  try {
    const result = await db.collection("reports").updateMany(
      { targetType, targetId: new ObjectId(String(targetId)), status: "open" },
      {
        $set: {
          status,
          reviewedBy: reviewedBy ? new ObjectId(String(reviewedBy)) : null,
          reviewedAt: new Date(),
          ...(note ? { reviewNote: String(note).slice(0, 300) } : {}),
        },
      }
    );
    return result.modifiedCount ?? 0;
  } catch {
    return 0;
  }
}

export function toId(value) {
  try {
    return new ObjectId(String(value));
  } catch {
    return null;
  }
}
