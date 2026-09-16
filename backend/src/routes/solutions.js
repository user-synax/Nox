import { Router } from "express";
import { ObjectId } from "mongodb";
import { validate } from "../middleware/validate.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { getSessionUser } from "../lib/session.js";
import {
  solutionWriteSchema,
  solutionPatchSchema,
  commentWriteSchema,
  solutionListQuerySchema,
  commentListQuerySchema,
} from "../validation.js";
import { findPublishedChallenge, findAcceptedSubmission } from "../lib/challengeFiles.js";
import { emitChallenge, emitSolution } from "../lib/realtime.js";

/**
 * Community solutions (PRD §19) — solved-only reads, live fan-out (§25).
 *
 *   POST   /challenges/:id/solutions  → share a write-up (solver/admin)
 *   GET    /challenges/:id/solutions  → list (?sort=newest|top)
 *   GET    /solutions/:id             → full post + code
 *   PATCH  /solutions/:id             → author/admin edit
 *   DELETE /solutions/:id             → author/admin remove (+comments/likes)
 *   POST   /solutions/:id/like        → toggle like
 *   GET    /solutions/:id/comments    → thread, oldest first
 *   POST   /solutions/:id/comments    → reply (solver/admin)
 *   PATCH  /comments/:id              → author/admin edit
 *   DELETE /comments/:id              → author/admin remove
 *   POST   /comments/:id/like         → toggle like
 *   GET    /users/me/solutions        → own posts
 *   GET    /users/:username/solutions → posts visible to the viewer
 *
 * Visibility: a challenge's solutions are readable only by solvers of that
 * challenge (or the post author, or admins). Like/comment writes imply read.
 */

function toId(value) {
  try {
    return new ObjectId(String(value));
  } catch {
    return null;
  }
}

function isAdmin(roles) {
  return Array.isArray(roles) && roles.some((r) => r === "ADMIN" || r === "FOUNDER");
}

async function requireUser(db, req, res) {
  const found = await getSessionUser(db, req, res);
  if (!found) {
    res.status(401).json({ error: "Not signed in." });
    return null;
  }
  return { id: found.user._id, roles: found.user.roles ?? [] };
}

/** Session when present, null when anonymous — never sends a status. */
async function optionalUser(db, req) {
  const found = await getSessionUser(db, req);
  if (!found) return null;
  return { id: found.user._id, roles: found.user.roles ?? [] };
}

/** Solved ⇔ accepted submission exists. Authors/admins bypass. */
async function canRead(db, me, challenge, authorId = null) {
  if (me && isAdmin(me.roles)) return true;
  if (me && authorId && me.id.toString() === authorId.toString()) return true;
  if (!me) return false;
  return !!(await findAcceptedSubmission(db, me.id, challenge._id));
}

function deny(res, challenge = null) {
  // Slugs/titles are public via the catalog — including them lets locked
  // UIs link straight to the challenge instead of a dead end.
  return res.status(403).json({
    error: "Solve this challenge to join the discussion.",
    challengeSlug: challenge?.slug ?? null,
    challengeTitle: challenge?.title ?? null,
  });
}

/** Public author cards for a set of author ObjectIds. */
async function authorMap(db, authorIds) {
  const oids = [...new Set(authorIds.map((a) => String(a)))].map(toId).filter(Boolean);
  if (oids.length === 0) return new Map();
  const rows = await db
    .collection("user")
    .find({ _id: { $in: oids } })
    .project({ username: 1, displayName: 1, name: 1, avatarUrl: 1, image: 1 })
    .toArray()
    .catch(() => []);
  return new Map(
    rows.map((u) => [
      u._id.toString(),
      {
        username: u.username ?? null,
        displayName: u.displayName ?? u.name ?? u.username ?? null,
        avatarUrl: u.avatarUrl ?? u.image ?? null,
      },
    ])
  );
}

/** Which of targetIds did me like? Returns a Set of id strings. */
async function likedSet(db, me, targetType, targetIds) {
  if (!me || targetIds.length === 0) return new Set();
  const rows = await db
    .collection("likes")
    .find({ targetType, targetId: { $in: targetIds }, userId: me.id })
    .project({ targetId: 1 })
    .toArray()
    .catch(() => []);
  return new Set(rows.map((r) => r.targetId.toString()));
}

function sanitizeSolution(doc, { author = null, liked = false, detail = false } = {}) {
  if (!doc) return null;
  const base = {
    id: doc._id?.toString?.() ?? doc.id,
    challengeId: doc.challengeId?.toString?.() ?? null,
    challengeSlug: doc.challengeSlug ?? null,
    challengeTitle: doc.challengeTitle ?? null,
    title: doc.title,
    language: doc.language,
    tags: doc.tags ?? [],
    likeCount: doc.likeCount ?? 0,
    commentCount: doc.commentCount ?? 0,
    likedByMe: !!liked,
    author,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
  if (detail) {
    return { ...base, body: doc.body ?? "", code: doc.code ?? "" };
  }
  return { ...base, excerpt: String(doc.body ?? "").slice(0, 200) };
}

function sanitizeComment(doc, { author = null, liked = false } = {}) {
  if (!doc) return null;
  return {
    id: doc._id?.toString?.() ?? doc.id,
    solutionId: doc.solutionId?.toString?.() ?? null,
    body: doc.body ?? "",
    likeCount: doc.likeCount ?? 0,
    likedByMe: !!liked,
    author,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}

async function recount(db, targetType, targetId, col, field) {
  const likeCount = await db
    .collection("likes")
    .countDocuments({ targetType, targetId })
    .catch(() => 0);
  await db.collection(col).updateOne({ _id: targetId }, { $set: { [field]: likeCount } });
  return likeCount;
}

export function createSolutionRoutes(db) {
  const router = Router();
  const solutions = () => db.collection("solutions");
  const comments = () => db.collection("comments");

  const solutionLimit = () => authRateLimit({ windowMs: 3600_000, max: 20 });
  const commentLimit = () => authRateLimit({ windowMs: 60_000, max: 30 });
  const likeLimit = () => authRateLimit({ windowMs: 60_000, max: 60 });

  // ── Share a write-up ─────────────────────────────────────────
  router.post(
    "/challenges/:id/solutions",
    solutionLimit(),
    validate(solutionWriteSchema),
    async (req, res) => {
      const me = await requireUser(db, req, res);
      if (!me) return;
      try {
        const challenge = await findPublishedChallenge(db, req.params.id);
        if (!challenge) return res.status(404).json({ error: "Challenge not found." });
        if (!(await canRead(db, me, challenge))) return deny(res, challenge);
        const now = new Date();
        const { insertedId } = await solutions().insertOne({
          challengeId: challenge._id,
          challengeSlug: challenge.slug,
          challengeTitle: challenge.title,
          authorId: me.id,
          title: req.body.title,
          body: req.body.body,
          code: req.body.code,
          language: req.body.language,
          tags: req.body.tags ?? [],
          likeCount: 0,
          commentCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        const doc = await solutions().findOne({ _id: insertedId });
        const authors = await authorMap(db, [me.id]);
        const payload = sanitizeSolution(doc, {
          author: authors.get(me.id.toString()) ?? null,
          detail: true,
        });
        emitChallenge(req, challenge._id.toString(), "solution:new", {
          solution: sanitizeSolution(doc, {
            author: authors.get(me.id.toString()) ?? null,
          }),
        });
        return res.status(201).json({ solution: payload });
      } catch (err) {
        console.error("[solutions] create failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not publish this solution." });
      }
    }
  );

  // ── List a challenge's solutions ─────────────────────────────
  router.get(
    "/challenges/:id/solutions",
    validate(solutionListQuerySchema, "query"),
    async (req, res) => {
      const me = await optionalUser(db, req);
      try {
        const challenge = await findPublishedChallenge(db, req.params.id);
        if (!challenge) return res.status(404).json({ error: "Challenge not found." });
        if (!(await canRead(db, me, challenge))) return deny(res, challenge);
        const q = req.query;
        const sort =
          q.sort === "top"
            ? { likeCount: -1, createdAt: -1 }
            : { createdAt: -1 };
        const filter = { challengeId: challenge._id };
        const [rows, total] = await Promise.all([
          solutions()
            .find(filter)
            .sort(sort)
            .skip((q.page - 1) * q.limit)
            .limit(q.limit)
            .toArray(),
          solutions().countDocuments(filter),
        ]);
        const [authors, liked] = await Promise.all([
          authorMap(db, rows.map((r) => r.authorId)),
          likedSet(db, me, "solution", rows.map((r) => r._id)),
        ]);
        const items = rows.map((r) =>
          sanitizeSolution(r, {
            author: authors.get(r.authorId?.toString?.()) ?? null,
            liked: liked.has(r._id.toString()),
          })
        );
        return res.json({ items, total, page: q.page, limit: q.limit });
      } catch (err) {
        console.error("[solutions] list failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not load solutions." });
      }
    }
  );

  // ── Community feed: newest write-ups the viewer unlocked ────
  // Registered BEFORE /solutions/:id so “recent” never hits the param route.
  router.get("/solutions/recent", async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const filter = {};
      if (!isAdmin(me.roles)) {
        // Solved-only: feed covers exactly the challenges I cracked.
        const accepted = await db
          .collection("submissions")
          .find({ userId: me.id, status: "accepted" })
          .project({ challengeId: 1 })
          .toArray()
          .catch(() => []);
        const cids = [...new Set(accepted.map((a) => a.challengeId.toString()))]
          .map(toId)
          .filter(Boolean);
        if (cids.length === 0) return res.json({ items: [], total: 0, page, limit });
        filter.challengeId = { $in: cids };
      }
      const [rows, total] = await Promise.all([
        solutions()
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        solutions().countDocuments(filter),
      ]);
      const [authors, liked] = await Promise.all([
        authorMap(db, rows.map((r) => r.authorId)),
        likedSet(db, me, "solution", rows.map((r) => r._id)),
      ]);
      return res.json({
        items: rows.map((r) =>
          sanitizeSolution(r, {
            author: authors.get(r.authorId?.toString?.()) ?? null,
            liked: liked.has(r._id.toString()),
          })
        ),
        total,
        page,
        limit,
      });
    } catch (err) {
      console.error("[solutions] recent failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load community feed." });
    }
  });

  // ── Full post ────────────────────────────────────────────────
  router.get("/solutions/:id", async (req, res) => {
    const me = await optionalUser(db, req);
    try {
      const sid = toId(req.params.id);
      if (!sid) return res.status(404).json({ error: "Solution not found." });
      const doc = await solutions().findOne({ _id: sid });
      if (!doc) return res.status(404).json({ error: "Solution not found." });
      const challenge = await db.collection("challenges").findOne({ _id: doc.challengeId });
      if (!challenge || !(await canRead(db, me, challenge, doc.authorId))) return deny(res, challenge);
      const [authors, liked] = await Promise.all([
        authorMap(db, [doc.authorId]),
        likedSet(db, me, "solution", [doc._id]),
      ]);
      return res.json({
        solution: sanitizeSolution(doc, {
          author: authors.get(doc.authorId?.toString?.()) ?? null,
          liked: liked.has(doc._id.toString()),
          detail: true,
        }),
      });
    } catch (err) {
      console.error("[solutions] detail failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load solution." });
    }
  });

  // ── Edit own post ────────────────────────────────────────────
  router.patch("/solutions/:id", validate(solutionPatchSchema), async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const sid = toId(req.params.id);
      if (!sid) return res.status(404).json({ error: "Solution not found." });
      const doc = await solutions().findOne({ _id: sid });
      if (!doc) return res.status(404).json({ error: "Solution not found." });
      const owner = doc.authorId?.toString?.() === me.id.toString();
      if (!owner && !isAdmin(me.roles)) {
        return res.status(404).json({ error: "Solution not found." });
      }
      await solutions().updateOne(
        { _id: sid },
        { $set: { ...req.body, updatedAt: new Date() } }
      );
      const fresh = await solutions().findOne({ _id: sid });
      const authors = await authorMap(db, [fresh.authorId]);
      const payload = sanitizeSolution(fresh, {
        author: authors.get(fresh.authorId?.toString?.()) ?? null,
        liked: (await likedSet(db, me, "solution", [fresh._id])).has(fresh._id.toString()),
        detail: true,
      });
      emitSolution(req, sid.toString(), "solution:updated", { solution: payload });
      emitChallenge(req, fresh.challengeId.toString(), "solution:updated", {
        solution: sanitizeSolution(fresh, {
          author: authors.get(fresh.authorId?.toString?.()) ?? null,
        }),
      });
      return res.json({ solution: payload });
    } catch (err) {
      console.error("[solutions] edit failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not save solution." });
    }
  });

  // ── Delete own post (+ thread + likes) ───────────────────────
  router.delete("/solutions/:id", async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const sid = toId(req.params.id);
      if (!sid) return res.status(404).json({ error: "Solution not found." });
      const doc = await solutions().findOne({ _id: sid });
      if (!doc) return res.status(404).json({ error: "Solution not found." });
      const owner = doc.authorId?.toString?.() === me.id.toString();
      if (!owner && !isAdmin(me.roles)) {
        return res.status(404).json({ error: "Solution not found." });
      }
      const doomed = await comments()
        .find({ solutionId: sid })
        .project({ _id: 1 })
        .toArray()
        .catch(() => []);
      const doomedIds = doomed.map((c) => c._id);
      await Promise.all([
        solutions().deleteOne({ _id: sid }),
        comments().deleteMany({ solutionId: sid }),
        db.collection("likes").deleteMany({ targetType: "solution", targetId: sid }),
        ...(doomedIds.length > 0
          ? [
              db
                .collection("likes")
                .deleteMany({ targetType: "comment", targetId: { $in: doomedIds } }),
            ]
          : []),
      ]);
      emitSolution(req, sid.toString(), "solution:deleted", { solutionId: sid.toString() });
      emitChallenge(req, doc.challengeId.toString(), "solution:deleted", {
        solutionId: sid.toString(),
      });
      return res.json({ deleted: true });
    } catch (err) {
      console.error("[solutions] delete failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not delete solution." });
    }
  });

  // ── Toggle solution like ─────────────────────────────────────
  router.post("/solutions/:id/like", likeLimit(), async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const sid = toId(req.params.id);
      if (!sid) return res.status(404).json({ error: "Solution not found." });
      const doc = await solutions().findOne({ _id: sid });
      if (!doc) return res.status(404).json({ error: "Solution not found." });
      const challenge = await db.collection("challenges").findOne({ _id: doc.challengeId });
      if (!challenge || !(await canRead(db, me, challenge, doc.authorId))) return deny(res, challenge);
      let liked;
      try {
        await db.collection("likes").insertOne({
          targetType: "solution",
          targetId: sid,
          userId: me.id,
          createdAt: new Date(),
        });
        liked = true;
      } catch (e) {
        if (e?.code !== 11000) throw e;
        await db
          .collection("likes")
          .deleteOne({ targetType: "solution", targetId: sid, userId: me.id });
        liked = false;
      }
      const likeCount = await recount(db, "solution", sid, "solutions", "likeCount");
      const payload = {
        solutionId: sid.toString(),
        likeCount,
        liked,
        actorId: me.id.toString(),
      };
      emitSolution(req, sid.toString(), "solution:like", payload);
      emitChallenge(req, doc.challengeId.toString(), "solution:like", payload);
      return res.json({ liked, likeCount });
    } catch (err) {
      console.error("[solutions] like failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not like this solution." });
    }
  });

  // ── Thread ───────────────────────────────────────────────────
  router.get(
    "/solutions/:id/comments",
    validate(commentListQuerySchema, "query"),
    async (req, res) => {
      const me = await optionalUser(db, req);
      try {
        const sid = toId(req.params.id);
        if (!sid) return res.status(404).json({ error: "Solution not found." });
        const doc = await solutions().findOne({ _id: sid });
        if (!doc) return res.status(404).json({ error: "Solution not found." });
        const challenge = await db.collection("challenges").findOne({ _id: doc.challengeId });
        if (!challenge || !(await canRead(db, me, challenge, doc.authorId))) return deny(res, challenge);
        const q = req.query;
        const [rows, total] = await Promise.all([
          comments()
            .find({ solutionId: sid })
            .sort({ createdAt: 1 })
            .skip((q.page - 1) * q.limit)
            .limit(q.limit)
            .toArray(),
          comments().countDocuments({ solutionId: sid }),
        ]);
        const [authors, liked] = await Promise.all([
          authorMap(db, rows.map((r) => r.authorId)),
          likedSet(db, me, "comment", rows.map((r) => r._id)),
        ]);
        const items = rows.map((r) =>
          sanitizeComment(r, {
            author: authors.get(r.authorId?.toString?.()) ?? null,
            liked: liked.has(r._id.toString()),
          })
        );
        return res.json({ items, total, page: q.page, limit: q.limit });
      } catch (err) {
        console.error("[comments] list failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not load comments." });
      }
    }
  );

  router.post(
    "/solutions/:id/comments",
    commentLimit(),
    validate(commentWriteSchema),
    async (req, res) => {
      const me = await requireUser(db, req, res);
      if (!me) return;
      try {
        const sid = toId(req.params.id);
        if (!sid) return res.status(404).json({ error: "Solution not found." });
        const doc = await solutions().findOne({ _id: sid });
        if (!doc) return res.status(404).json({ error: "Solution not found." });
        const challenge = await db.collection("challenges").findOne({ _id: doc.challengeId });
        if (!challenge || !(await canRead(db, me, challenge, doc.authorId))) return deny(res, challenge);
        const now = new Date();
        const { insertedId } = await comments().insertOne({
          solutionId: sid,
          challengeId: doc.challengeId,
          authorId: me.id,
          body: req.body.body,
          likeCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        const commentCount = await comments().countDocuments({ solutionId: sid }).catch(() => 1);
        await solutions().updateOne({ _id: sid }, { $set: { commentCount } });
        const row = await comments().findOne({ _id: insertedId });
        const authors = await authorMap(db, [me.id]);
        const payload = sanitizeComment(row, {
          author: authors.get(me.id.toString()) ?? null,
        });
        emitSolution(req, sid.toString(), "comment:new", { comment: payload });
        emitChallenge(req, doc.challengeId.toString(), "solution:updated", {
          solution: { id: sid.toString(), commentCount },
        });
        return res.status(201).json({ comment: payload, commentCount });
      } catch (err) {
        console.error("[comments] create failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not post comment." });
      }
    }
  );

  router.patch("/comments/:id", validate(commentWriteSchema), async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const cid = toId(req.params.id);
      if (!cid) return res.status(404).json({ error: "Comment not found." });
      const doc = await comments().findOne({ _id: cid });
      if (!doc) return res.status(404).json({ error: "Comment not found." });
      const owner = doc.authorId?.toString?.() === me.id.toString();
      if (!owner && !isAdmin(me.roles)) {
        return res.status(404).json({ error: "Comment not found." });
      }
      await comments().updateOne(
        { _id: cid },
        { $set: { body: req.body.body, updatedAt: new Date() } }
      );
      const fresh = await comments().findOne({ _id: cid });
      const authors = await authorMap(db, [fresh.authorId]);
      const payload = sanitizeComment(fresh, {
        author: authors.get(fresh.authorId?.toString?.()) ?? null,
        liked: (await likedSet(db, me, "comment", [fresh._id])).has(fresh._id.toString()),
      });
      emitSolution(req, fresh.solutionId.toString(), "comment:updated", { comment: payload });
      return res.json({ comment: payload });
    } catch (err) {
      console.error("[comments] edit failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not save comment." });
    }
  });

  router.delete("/comments/:id", async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const cid = toId(req.params.id);
      if (!cid) return res.status(404).json({ error: "Comment not found." });
      const doc = await comments().findOne({ _id: cid });
      if (!doc) return res.status(404).json({ error: "Comment not found." });
      const owner = doc.authorId?.toString?.() === me.id.toString();
      if (!owner && !isAdmin(me.roles)) {
        return res.status(404).json({ error: "Comment not found." });
      }
      await Promise.all([
        comments().deleteOne({ _id: cid }),
        db.collection("likes").deleteMany({ targetType: "comment", targetId: cid }),
      ]);
      const commentCount = await comments()
        .countDocuments({ solutionId: doc.solutionId })
        .catch(() => 0);
      await solutions().updateOne({ _id: doc.solutionId }, { $set: { commentCount } });
      emitSolution(req, doc.solutionId.toString(), "comment:deleted", {
        commentId: cid.toString(),
        solutionId: doc.solutionId.toString(),
      });
      emitChallenge(req, doc.challengeId.toString(), "solution:updated", {
        solution: { id: doc.solutionId.toString(), commentCount },
      });
      return res.json({ deleted: true, commentCount });
    } catch (err) {
      console.error("[comments] delete failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not delete comment." });
    }
  });

  router.post("/comments/:id/like", likeLimit(), async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const cid = toId(req.params.id);
      if (!cid) return res.status(404).json({ error: "Comment not found." });
      const doc = await comments().findOne({ _id: cid });
      if (!doc) return res.status(404).json({ error: "Comment not found." });
      const solution = await solutions().findOne({ _id: doc.solutionId });
      if (!solution) return res.status(404).json({ error: "Comment not found." });
      const challenge = await db.collection("challenges").findOne({ _id: solution.challengeId });
      if (!challenge || !(await canRead(db, me, challenge, solution.authorId)))
        return deny(res, challenge);
      let liked;
      try {
        await db.collection("likes").insertOne({
          targetType: "comment",
          targetId: cid,
          userId: me.id,
          createdAt: new Date(),
        });
        liked = true;
      } catch (e) {
        if (e?.code !== 11000) throw e;
        await db
          .collection("likes")
          .deleteOne({ targetType: "comment", targetId: cid, userId: me.id });
        liked = false;
      }
      const likeCount = await recount(db, "comment", cid, "comments", "likeCount");
      emitSolution(req, doc.solutionId.toString(), "comment:like", {
        commentId: cid.toString(),
        solutionId: doc.solutionId.toString(),
        likeCount,
        liked,
        actorId: me.id.toString(),
      });
      return res.json({ liked, likeCount });
    } catch (err) {
      console.error("[comments] like failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not like this comment." });
    }
  });

  // ── Own posts ────────────────────────────────────────────────
  router.get("/users/me/solutions", async (req, res) => {
    const me = await requireUser(db, req, res);
    if (!me) return;
    try {
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const filter = { authorId: me.id };
      const [rows, total] = await Promise.all([
        solutions()
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        solutions().countDocuments(filter),
      ]);
      const [authors, liked] = await Promise.all([
        authorMap(db, [me.id]),
        likedSet(db, me, "solution", rows.map((r) => r._id)),
      ]);
      const author = authors.get(me.id.toString()) ?? null;
      return res.json({
        items: rows.map((r) =>
          sanitizeSolution(r, { author, liked: liked.has(r._id.toString()) })
        ),
        total,
        page,
        limit,
      });
    } catch (err) {
      console.error("[solutions] mine failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load solutions." });
    }
  });

  // ── Public author posts (viewer sees only unlocked challenges) ──
  // Registered AFTER /users/me/solutions so “me” never hits the param route.
  router.get("/users/:username/solutions", async (req, res) => {
    try {
      const username = String(req.params.username ?? "").toLowerCase();
      const author = await db.collection("user").findOne({ username });
      if (!author) return res.status(404).json({ error: "User not found." });
      const me = await optionalUser(db, req);
      const page = Math.min(100, Math.max(1, Number(req.query.page) || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const rows = await solutions()
        .find({ authorId: author._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      const totalAll = await solutions().countDocuments({ authorId: author._id });

      // Owner/admin see everything; others only challenges they solved.
      let visible = rows;
      let unlocked = true;
      if (!me || (me.id.toString() !== author._id.toString() && !isAdmin(me.roles))) {
        unlocked = false;
        if (me && rows.length > 0) {
          const cids = [...new Set(rows.map((r) => r.challengeId.toString()))].map(toId).filter(Boolean);
          const accepted = await db
            .collection("submissions")
            .find({ userId: me.id, challengeId: { $in: cids }, status: "accepted" })
            .project({ challengeId: 1 })
            .toArray()
            .catch(() => []);
          const solved = new Set(accepted.map((a) => a.challengeId.toString()));
          visible = rows.filter((r) => solved.has(r.challengeId.toString()));
        } else {
          visible = [];
        }
      }
      const [authors, liked] = await Promise.all([
        authorMap(db, [author._id]),
        likedSet(db, me, "solution", visible.map((r) => r._id)),
      ]);
      const card = authors.get(author._id.toString()) ?? null;
      return res.json({
        items: visible.map((r) =>
          sanitizeSolution(r, { author: card, liked: liked.has(r._id.toString()) })
        ),
        total: unlocked ? totalAll : visible.length,
        page,
        limit,
      });
    } catch (err) {
      console.error("[solutions] author failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load solutions." });
    }
  });

  return router;
}
