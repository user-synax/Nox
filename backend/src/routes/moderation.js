import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { withAuth, requireRole, requireAdmin } from "../middleware/requireRole.js";
import { getSessionUser } from "../lib/session.js";
import {
  reportCreateSchema,
  reportReviewSchema,
  hideContentSchema,
  suspendUserSchema,
  rolesUpdateSchema,
} from "../validation.js";
import {
  toId,
  roleRank,
  writeAudit,
  resolveOpenReports,
} from "../lib/moderation.js";
import { createNotification, sanitizeNotification } from "../lib/notifications.js";
import { emitUser } from "../lib/realtime.js";

/**
 * Moderation + reports (PRD §23).
 *
 *   POST   /reports                     → flag a solution/comment/user (session)
 *   GET    /admin/reports               → review queue (MODERATOR+)
 *   PATCH  /admin/reports/:id           → uphold / dismiss (MODERATOR+)
 *   POST   /admin/solutions/:id/hide    → reversible takedown (MODERATOR+)
 *   POST   /admin/solutions/:id/unhide  → restore (MODERATOR+)
 *   POST   /admin/comments/:id/hide     → reversible takedown (MODERATOR+)
 *   POST   /admin/comments/:id/unhide   → restore (MODERATOR+)
 *   GET    /admin/users                 → search users (MODERATOR+)
 *   POST   /admin/users/:id/suspend     → timed/indefinite, kills sessions (MODERATOR+)
 *   POST   /admin/users/:id/unsuspend   → restore (MODERATOR+)
 *   PATCH  /admin/users/:id/roles       → role grants, never FOUNDER (ADMIN+)
 *   GET    /admin/audit                 → audit trail (MODERATOR+)
 *   GET    /admin/overview              → queue counts (MODERATOR+)
 *
 * Security notes:
 * - RBAC is enforced here on the API (requireRole), never just in the UI.
 * - Takedowns are reversible stamps (hiddenAt), never deletes — the audit
 *   trail stays meaningful and mistakes are one click to undo.
 * - Moderators can only action users strictly below their own rank
 *   (mods → users, admins → mods + users, founders → anyone but self).
 *   Peers can't touch peers, so one compromised account can't purge staff.
 * - FOUNDER can never be granted or removed via the API (scripts only).
 * - Suspending wipes every session for the target (logged out everywhere);
 *   login + live sessions re-check suspension on every touch.
 */

const REPORTABLE = new Set(["solution", "comment", "user"]);

async function requireUser(db, req, res) {
  const found = await getSessionUser(db, req, res);
  if (!found) {
    res.status(401).json({ error: "Not signed in." });
    return null;
  }
  return { id: found.user._id, doc: found.user };
}

/** Public author cards for a set of user ObjectIds. */
async function userMap(db, ids) {
  const oids = [...new Set(ids.map((v) => String(v)))].map(toId).filter(Boolean);
  if (oids.length === 0) return new Map();
  const rows = await db
    .collection("user")
    .find({ _id: { $in: oids } })
    .project({ username: 1, displayName: 1, name: 1, avatarUrl: 1, image: 1, email: 1, roles: 1 })
    .toArray()
    .catch(() => []);
  return new Map(
    rows.map((u) => [
      u._id.toString(),
      {
        id: u._id.toString(),
        username: u.username ?? null,
        displayName: u.displayName ?? u.name ?? u.username ?? null,
        avatarUrl: u.avatarUrl ?? u.image ?? null,
        email: u.email ?? null,
        roles: u.roles ?? ["USER"],
      },
    ])
  );
}

function sanitizeAdminUser(doc) {
  if (!doc) return null;
  const suspended = !!(doc.suspendedReason && (!doc.suspendedUntil || new Date(doc.suspendedUntil) > new Date()));
  return {
    id: doc._id?.toString?.() ?? doc.id,
    username: doc.username ?? null,
    displayName: doc.displayName ?? doc.name ?? doc.username ?? null,
    avatarUrl: doc.avatarUrl ?? doc.image ?? null,
    email: doc.email ?? null,
    roles: doc.roles ?? ["USER"],
    suspended,
    suspendedUntil: doc.suspendedUntil ?? null,
    suspendedReason: doc.suspendedReason ?? null,
    createdAt: doc.createdAt ?? null,
  };
}

function sanitizeReport(doc, { reporter = null, targetAuthor = null } = {}) {
  if (!doc) return null;
  return {
    id: doc._id?.toString?.() ?? doc.id,
    targetType: doc.targetType,
    targetId: doc.targetId?.toString?.() ?? null,
    reason: doc.reason,
    details: doc.details ?? null,
    status: doc.status,
    snapshot: doc.snapshot ?? {},
    reporter,
    targetAuthor,
    reviewNote: doc.reviewNote ?? null,
    reviewedAt: doc.reviewedAt ?? null,
    createdAt: doc.createdAt ?? null,
  };
}

/** Live inbox hint after a mod-action notification (best-effort). */
async function notifyModAction(req, db, userId, { type, title, body, data = {} }) {
  const note = await createNotification(db, {
    userId,
    type,
    title,
    body,
    data,
  });
  if (note) {
    emitUser(req, userId.toString(), "notification:new", {
      notification: sanitizeNotification(note),
    });
  }
  return note;
}

export function createModerationRoutes(db) {
  const router = Router();
  const reports = () => db.collection("reports");

  const reportLimit = () => authRateLimit({ windowMs: 3600_000, max: 30 });
  const modWriteLimit = () => authRateLimit({ windowMs: 60_000, max: 60 });

  // ── File a report ────────────────────────────────────────────
  router.post("/reports", reportLimit(), validate(reportCreateSchema), async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const { targetType, reason } = req.body;
      if (!REPORTABLE.has(targetType)) {
        return res.status(422).json({ error: "Unknown report target." });
      }
      const targetId = toId(req.body.targetId);
      if (!targetId) return res.status(404).json({ error: "Target not found." });

      // The target must exist, and we snapshot it for the queue card.
      let target = null;
      let snapshot = {};
      let authorId = null;
      if (targetType === "solution") {
        target = await db.collection("solutions").findOne({ _id: targetId });
        if (!target) return res.status(404).json({ error: "Solution not found." });
        if (target.hiddenAt) {
          return res.status(409).json({ error: "This solution is already hidden pending review." });
        }
        authorId = target.authorId;
        snapshot = {
          title: target.title ?? null,
          excerpt: String(target.body ?? "").slice(0, 200),
          challengeSlug: target.challengeSlug ?? null,
          challengeTitle: target.challengeTitle ?? null,
        };
      } else if (targetType === "comment") {
        target = await db.collection("comments").findOne({ _id: targetId });
        if (!target) return res.status(404).json({ error: "Comment not found." });
        if (target.hiddenAt) {
          return res.status(409).json({ error: "This comment is already hidden pending review." });
        }
        authorId = target.authorId;
        snapshot = {
          excerpt: String(target.body ?? "").slice(0, 200),
          solutionId: target.solutionId?.toString?.() ?? null,
        };
      } else {
        target = await db.collection("user").findOne({ _id: targetId });
        if (!target) return res.status(404).json({ error: "User not found." });
        authorId = target._id;
        snapshot = {
          username: target.username ?? null,
          displayName: target.displayName ?? target.name ?? target.username ?? null,
        };
      }

      if (authorId && authorId.toString() === me.id.toString()) {
        return res.status(422).json({ error: "You can't report your own content." });
      }

      const now = new Date();
      try {
        const { insertedId } = await reports().insertOne({
          targetType,
          targetId,
          reporterId: me.id,
          reason,
          details: (req.body.details ?? "").trim().slice(0, 500) || null,
          status: "open",
          snapshot: { ...snapshot, authorId: authorId?.toString?.() ?? null },
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          createdAt: now,
        });
        const doc = await reports().findOne({ _id: insertedId });
        return res.status(201).json({ report: sanitizeReport(doc) });
      } catch (e) {
        // Partial unique index (reporter × target × open) → already reported.
        if (e?.code === 11000) {
          return res
            .status(409)
            .json({ error: "You've already reported this. The team will review it." });
        }
        throw e;
      }
    } catch (err) {
      console.error("[reports] create failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not file this report." });
    }
  });

  // ── Everything below is staff-only (MODERATOR+) ───────────────
  // Scoped to /admin like routes/admin.js so the guard can't leak.
  router.use("/admin", withAuth(db), requireRole("MODERATOR"));

  const actor = (req) => ({ id: req.sessionUser._id, roles: req.sessionUser.roles ?? [] });

  // ── Review queue ─────────────────────────────────────────────
  router.get("/admin/reports", async (req, res) => {
    try {
      const status = String(req.query.status ?? "open");
      const filter = ["open", "upheld", "dismissed"].includes(status) ? { status } : {};
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const [rows, total, openCount] = await Promise.all([
        reports()
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        reports().countDocuments(filter),
        reports().countDocuments({ status: "open" }),
      ]);
      const people = await userMap(
        db,
        rows.flatMap((r) => [r.reporterId, r.snapshot?.authorId].filter(Boolean))
      );
      return res.json({
        items: rows.map((r) =>
          sanitizeReport(r, {
            reporter: people.get(r.reporterId?.toString?.()) ?? null,
            targetAuthor: people.get(r.snapshot?.authorId) ?? null,
          })
        ),
        total,
        openCount,
        page,
        limit,
      });
    } catch (err) {
      console.error("[moderation] queue failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load reports." });
    }
  });

  // ── Uphold / dismiss a report ────────────────────────────────
  router.patch("/admin/reports/:id", modWriteLimit(), validate(reportReviewSchema), async (req, res) => {
    try {
      const rid = toId(req.params.id);
      if (!rid) return res.status(404).json({ error: "Report not found." });
      const doc = await reports().findOne({ _id: rid });
      if (!doc) return res.status(404).json({ error: "Report not found." });
      if (doc.status !== "open") {
        return res.status(409).json({ error: `This report is already ${doc.status}.` });
      }
      const me = actor(req);
      await reports().updateOne(
        { _id: rid },
        {
          $set: {
            status: req.body.status,
            reviewedBy: me.id,
            reviewedAt: new Date(),
            ...(req.body.note ? { reviewNote: req.body.note } : {}),
          },
        }
      );
      await writeAudit(db, {
        actorId: me.id,
        action: `report.${req.body.status}`,
        targetType: "report",
        targetId: rid,
        metadata: { targetType: doc.targetType, targetId: doc.targetId.toString(), note: req.body.note ?? null },
      });
      const fresh = await reports().findOne({ _id: rid });
      return res.json({ report: sanitizeReport(fresh) });
    } catch (err) {
      console.error("[moderation] review failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not review this report." });
    }
  });

  /** Shared reversible takedown for solutions + comments. */
  async function setHidden(req, res, { col, targetType, hide }) {
    const me = actor(req);
    try {
      const id = toId(req.params.id);
      if (!id) return res.status(404).json({ error: "Not found." });
      const doc = await db.collection(col).findOne({ _id: id });
      if (!doc) return res.status(404).json({ error: "Not found." });
      const already = !!doc.hiddenAt;
      if (hide && already) return res.status(409).json({ error: "Already hidden." });
      if (!hide && !already) return res.status(409).json({ error: "Not hidden." });

      const now = new Date();
      const reason = req.body?.reason ?? null;
      if (hide) {
        await db.collection(col).updateOne(
          { _id: id },
          { $set: { hiddenAt: now, hiddenBy: me.id, hiddenReason: reason } }
        );
      } else {
        await db
          .collection(col)
          .updateOne({ _id: id }, { $unset: { hiddenAt: "", hiddenBy: "", hiddenReason: "" } });
      }

      // One click settles the queue: hiding upholds linked reports,
      // restoring dismisses them.
      const resolved = await resolveOpenReports(db, {
        targetType,
        targetId: id,
        status: hide ? "upheld" : "dismissed",
        reviewedBy: me.id,
        note: hide ? reason : "Content restored",
      });

      const authorId = doc.authorId;
      if (authorId) {
        if (hide) {
          await notifyModAction(req, db, authorId, {
            type: "content_moderated",
            title: `Your ${targetType} was hidden`,
            body: `Reason: ${reason ?? "violates community standards"}`,
            data: { targetType, targetId: id.toString() },
          });
        } else {
          await notifyModAction(req, db, authorId, {
            type: "content_moderated",
            title: `Your ${targetType} was restored`,
            body: "A moderator reviewed it and put it back.",
            data: { targetType, targetId: id.toString() },
          });
        }
      }

      await writeAudit(db, {
        actorId: me.id,
        action: `${targetType}.${hide ? "hide" : "unhide"}`,
        targetType,
        targetId: id,
        metadata: { reason, reportsResolved: resolved },
      });
      const fresh = await db.collection(col).findOne({ _id: id });
      return res.json({
        id: id.toString(),
        hidden: hide,
        hiddenReason: fresh?.hiddenReason ?? null,
        reportsResolved: resolved,
      });
    } catch (err) {
      console.error(`[moderation] ${targetType} ${hide ? "hide" : "unhide"} failed:`, err?.message ?? err);
      return res.status(500).json({ error: "Could not update this content." });
    }
  }

  router.post("/admin/solutions/:id/hide", modWriteLimit(), validate(hideContentSchema), (req, res) =>
    setHidden(req, res, { col: "solutions", targetType: "solution", hide: true })
  );
  router.post("/admin/solutions/:id/unhide", modWriteLimit(), (req, res) =>
    setHidden(req, res, { col: "solutions", targetType: "solution", hide: false })
  );
  router.post("/admin/comments/:id/hide", modWriteLimit(), validate(hideContentSchema), (req, res) =>
    setHidden(req, res, { col: "comments", targetType: "comment", hide: true })
  );
  router.post("/admin/comments/:id/unhide", modWriteLimit(), (req, res) =>
    setHidden(req, res, { col: "comments", targetType: "comment", hide: false })
  );

  // ── User search ──────────────────────────────────────────────
  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  router.get("/admin/users", async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim();
      const filter = q
        ? {
            $or: [
              { username: { $regex: escapeRegex(q.toLowerCase()), $options: "i" } },
              { email: { $regex: escapeRegex(q), $options: "i" } },
              { displayName: { $regex: escapeRegex(q), $options: "i" } },
            ],
          }
        : {};
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const [rows, total] = await Promise.all([
        db
          .collection("user")
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("user").countDocuments(filter),
      ]);
      return res.json({ items: rows.map(sanitizeAdminUser), total, page, limit });
    } catch (err) {
      console.error("[moderation] user search failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not search users." });
    }
  });

  /**
   * Rank rule: you can only suspend/unsuspend users strictly below your
   * rank. MODERATOR → USER, ADMIN → USER/MODERATOR, FOUNDER → anyone
   * except self. Peers can never touch peers.
   */
  function rankGuard(me, target, res) {
    if (target._id.toString() === me.id.toString()) {
      res.status(403).json({ error: "You can't moderate yourself." });
      return false;
    }
    if (roleRank(target.roles) >= roleRank(me.roles)) {
      res.status(403).json({ error: "You can only moderate users below your role." });
      return false;
    }
    return true;
  }

  // ── Suspend (timed or indefinite) ────────────────────────────
  router.post("/admin/users/:id/suspend", modWriteLimit(), validate(suspendUserSchema), async (req, res) => {
    const me = actor(req);
    try {
      const uid = toId(req.params.id);
      if (!uid) return res.status(404).json({ error: "User not found." });
      const target = await db.collection("user").findOne({ _id: uid });
      if (!target) return res.status(404).json({ error: "User not found." });
      if (!rankGuard(me, target, res)) return;

      const now = new Date();
      const until = req.body.days ? new Date(now.getTime() + req.body.days * 24 * 60 * 60 * 1000) : null;
      await db.collection("user").updateOne(
        { _id: uid },
        {
          $set: {
            suspendedUntil: until,
            suspendedReason: req.body.reason,
            suspendedBy: me.id,
            suspendedAt: now,
            updatedAt: now,
          },
        }
      );
      // Logged out everywhere, immediately — a suspension must bite now,
      // not when the 7-day cookie happens to expire.
      await db.collection("sessions").deleteMany({ userId: uid }).catch(() => {});
      const resolved = await resolveOpenReports(db, {
        targetType: "user",
        targetId: uid,
        status: "upheld",
        reviewedBy: me.id,
        note: req.body.reason,
      });
      await notifyModAction(req, db, uid, {
        type: "account_suspended",
        title: "Your account is suspended",
        body: until
          ? `Reason: ${req.body.reason} — until ${until.toLocaleDateString()}.`
          : `Reason: ${req.body.reason} — no expiry set. Reply via support to appeal.`,
        data: {},
      });
      await writeAudit(db, {
        actorId: me.id,
        action: "user.suspend",
        targetType: "user",
        targetId: uid,
        metadata: { reason: req.body.reason, days: req.body.days ?? null, reportsResolved: resolved },
      });
      const fresh = await db.collection("user").findOne({ _id: uid });
      return res.json({ user: sanitizeAdminUser(fresh), reportsResolved: resolved });
    } catch (err) {
      console.error("[moderation] suspend failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not suspend this user." });
    }
  });

  // ── Unsuspend ────────────────────────────────────────────────
  router.post("/admin/users/:id/unsuspend", modWriteLimit(), async (req, res) => {
    const me = actor(req);
    try {
      const uid = toId(req.params.id);
      if (!uid) return res.status(404).json({ error: "User not found." });
      const target = await db.collection("user").findOne({ _id: uid });
      if (!target) return res.status(404).json({ error: "User not found." });
      if (!rankGuard(me, target, res)) return;
      if (!target.suspendedReason && !target.suspendedUntil) {
        return res.status(409).json({ error: "This account isn't suspended." });
      }
      await db.collection("user").updateOne(
        { _id: uid },
        {
          $unset: { suspendedUntil: "", suspendedReason: "", suspendedBy: "", suspendedAt: "" },
          $set: { updatedAt: new Date() },
        }
      );
      await notifyModAction(req, db, uid, {
        type: "account_restored",
        title: "Your account is restored",
        body: "A moderator lifted the suspension. Welcome back.",
        data: {},
      });
      await writeAudit(db, { actorId: me.id, action: "user.unsuspend", targetType: "user", targetId: uid });
      const fresh = await db.collection("user").findOne({ _id: uid });
      return res.json({ user: sanitizeAdminUser(fresh) });
    } catch (err) {
      console.error("[moderation] unsuspend failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not restore this user." });
    }
  });

  // ── Role grants (ADMIN+ only — extra guard on top of the MODERATOR floor) ──
  router.patch("/admin/users/:id/roles", requireAdmin(), validate(rolesUpdateSchema), async (req, res) => {
    const me = actor(req);
    try {
      const uid = toId(req.params.id);
      if (!uid) return res.status(404).json({ error: "User not found." });
      const target = await db.collection("user").findOne({ _id: uid });
      if (!target) return res.status(404).json({ error: "User not found." });
      if (target._id.toString() === me.id.toString()) {
        return res.status(403).json({ error: "You can't change your own roles." });
      }
      // FOUNDER is script-only: the API can neither crown nor dethrone one.
      if ((target.roles ?? []).includes("FOUNDER")) {
        return res.status(403).json({ error: "Founder roles are managed outside the API." });
      }
      const before = target.roles ?? ["USER"];
      const after = [...new Set(req.body.roles)];
      await db
        .collection("user")
        .updateOne({ _id: uid }, { $set: { roles: after, updatedAt: new Date() } });
      await writeAudit(db, {
        actorId: me.id,
        action: "user.roles",
        targetType: "user",
        targetId: uid,
        metadata: { before, after },
      });
      const fresh = await db.collection("user").findOne({ _id: uid });
      return res.json({ user: sanitizeAdminUser(fresh) });
    } catch (err) {
      console.error("[moderation] roles failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not update roles." });
    }
  });

  // ── Audit trail ──────────────────────────────────────────────
  router.get("/admin/audit", async (req, res) => {
    try {
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const [rows, total] = await Promise.all([
        db
          .collection("auditLog")
          .find({})
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("auditLog").countDocuments({}),
      ]);
      const people = await userMap(db, rows.map((r) => r.actorId).filter(Boolean));
      return res.json({
        items: rows.map((r) => ({
          id: r._id?.toString?.() ?? null,
          action: r.action,
          targetType: r.targetType ?? null,
          targetId: r.targetId?.toString?.() ?? null,
          metadata: r.metadata ?? {},
          actor: people.get(r.actorId?.toString?.()) ?? null,
          createdAt: r.createdAt ?? null,
        })),
        total,
        page,
        limit,
      });
    } catch (err) {
      console.error("[moderation] audit failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load audit trail." });
    }
  });

  // ── Overview counts (admin header cards) ─────────────────────
  router.get("/admin/overview", async (_req, res) => {
    try {
      const now = new Date();
      const hiddenFilter = { hiddenAt: { $exists: true, $ne: null } };
      const suspendedFilter = {
        suspendedReason: { $exists: true, $ne: null },
        $or: [{ suspendedUntil: null }, { suspendedUntil: { $gt: now } }],
      };
      const [openReports, hiddenSolutions, hiddenComments, suspendedUsers, totalUsers] =
        await Promise.all([
          db.collection("reports").countDocuments({ status: "open" }),
          db.collection("solutions").countDocuments(hiddenFilter),
          db.collection("comments").countDocuments(hiddenFilter),
          db.collection("user").countDocuments(suspendedFilter),
          db.collection("user").estimatedDocumentCount(),
        ]);
      return res.json({ openReports, hiddenSolutions, hiddenComments, suspendedUsers, totalUsers });
    } catch (err) {
      console.error("[moderation] overview failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load overview." });
    }
  });

  return router;
}
