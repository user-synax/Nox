import { Router } from "express";
import { ObjectId } from "mongodb";
import { validate } from "../middleware/validate.js";
import { withAuth, requireAdmin } from "../middleware/requireRole.js";
import { challengeWriteSchema } from "../validation.js";

/**
 * Challenge admin surface (PRD §22): CRUD + publish/unpublish + hidden
 * test management. Every route requires ADMIN+. Hidden tests are ONLY
 * ever returned here — public routes strip them (routes/challenges.js).
 *
 *   GET    /admin/challenges          → all statuses, full docs
 *   POST   /admin/challenges          → create (draft unless specified)
 *   PATCH  /admin/challenges/:id      → partial update (version bump on content change)
 *   POST   /admin/challenges/:id/publish
 *   POST   /admin/challenges/:id/unpublish
 *   DELETE /admin/challenges/:id      → hard delete (drafts typically)
 */

function slugify(title) {
  return (
    String(title ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `challenge-${Date.now().toString(36)}`
  );
}

function shape(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id?.toString?.() ?? doc.id, ...rest };
}

/** entryFile must exist in the effective starter set (else workers 500). */
function checkEntry(res, entryFile, starterFiles) {
  if (entryFile === undefined) return true;
  const paths = new Set((starterFiles ?? []).map((f) => f.path));
  if (!paths.has(entryFile)) {
    res.status(422).json({ error: `entryFile "${entryFile}" is not a starter file.` });
    return false;
  }
  return true;
}

/** Content edits invalidate old submissions → bump the version. */
const VERSIONED_KEYS = new Set([
  "title",
  "description",
  "starterFiles",
  "visibleTests",
  "hiddenTests",
  "constraints",
  "timeLimitMs",
  "memoryLimitMb",
  "entryFile",
  "entryFunction",
  "testContext",
]);

export function createAdminRoutes(db) {
  const router = Router();
  const challenges = () => db.collection("challenges");

  // Scoped to /admin: a bare router.use() would run the guard for every
  // request falling through this router (including /api/health below).
  router.use("/admin", withAuth(db), requireAdmin());

  router.get("/admin/challenges", async (_req, res) => {
    try {
      const docs = await challenges().find({}).sort({ updatedAt: -1 }).limit(200).toArray();
      return res.json({ items: docs.map(shape) });
    } catch (err) {
      console.error("[admin] list failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not load challenges." });
    }
  });

  router.post("/admin/challenges", validate(challengeWriteSchema), async (req, res) => {
    try {
      const data = req.body;
      const slug = data.slug ?? slugify(data.title);
      const conflict = await challenges().findOne({ slug }, { projection: { _id: 1 } });
      if (conflict) {
        return res.status(422).json({ error: "That slug is taken." });
      }
      const now = new Date();
      if (!checkEntry(res, data.entryFile, data.starterFiles)) return;
      const { insertedId } = await challenges().insertOne({
        ...data,
        slug,
        tags: [...new Set(data.tags)],
        authorId: req.sessionUser._id,
        version: 1,
        solveCount: 0,
        attemptCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      const doc = await challenges().findOne({ _id: insertedId });
      return res.status(201).json({ challenge: shape(doc) });
    } catch (err) {
      console.error("[admin] create failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not create challenge." });
    }
  });

  function parseId(res, raw) {
    try {
      return new ObjectId(String(raw));
    } catch {
      res.status(404).json({ error: "Challenge not found." });
      return null;
    }
  }

  router.patch(
    "/admin/challenges/:id",
    validate(challengeWriteSchema.partial()),
    async (req, res) => {
      const id = parseId(res, req.params.id);
      if (!id) return;
      try {
        const existing = await challenges().findOne({ _id: id });
        if (!existing) return res.status(404).json({ error: "Challenge not found." });

        if (req.body.slug && req.body.slug !== existing.slug) {
          const clash = await challenges().findOne(
            { slug: req.body.slug, _id: { $ne: id } },
            { projection: { _id: 1 } }
          );
          if (clash) return res.status(422).json({ error: "That slug is taken." });
        }

        const set = { ...req.body, updatedAt: new Date() };
        if (set.tags) set.tags = [...new Set(set.tags)];
        const effectiveFiles = set.starterFiles ?? existing.starterFiles ?? [];
        const effectiveEntry = set.entryFile ?? existing.entryFile;
        if (!checkEntry(res, effectiveEntry, effectiveFiles)) return;
        if (Object.keys(req.body).some((k) => VERSIONED_KEYS.has(k))) {
          set.version = (existing.version ?? 1) + 1;
        }
        await challenges().updateOne({ _id: id }, { $set: set });
        const doc = await challenges().findOne({ _id: id });
        return res.json({ challenge: shape(doc) });
      } catch (err) {
        console.error("[admin] update failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not update challenge." });
      }
    }
  );

  async function setStatus(req, res, status) {
    const id = parseId(res, req.params.id);
    if (!id) return;
    try {
      const result = await challenges().updateOne(
        { _id: id },
        { $set: { status, updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Challenge not found." });
      }
      const doc = await challenges().findOne({ _id: id });
      return res.json({ challenge: shape(doc) });
    } catch (err) {
      console.error("[admin] status failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not update status." });
    }
  }

  router.post("/admin/challenges/:id/publish", (req, res) => setStatus(req, res, "published"));
  router.post("/admin/challenges/:id/unpublish", (req, res) => setStatus(req, res, "draft"));

  router.delete("/admin/challenges/:id", async (req, res) => {
    const id = parseId(res, req.params.id);
    if (!id) return;
    try {
      const result = await challenges().deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Challenge not found." });
      }
      return res.json({ deleted: true });
    } catch (err) {
      console.error("[admin] delete failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not delete challenge." });
    }
  });

  return router;
}
