import { Router } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import { validate } from "../middleware/validate.js";
import { authRateLimit, strictAuthLimit } from "../middleware/rateLimit.js";
import { sanitizeUser, toWebHeaders } from "./auth.js";
import {
  profileUpdateSchema,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
} from "../validation.js";
import {
  isAvatarStorageConfigured,
  uploadAvatar,
  deleteAvatarFile,
} from "../lib/appwrite.js";
import { defaultProfileStats } from "../lib/stats.js";
import { unlockedEntries } from "./achievements.js";

/**
 * PRD §29 Users surface + profile model (§6 / §28).
 *
 *   GET   /users/me            → fresh user + stats (session)
 *   PATCH /users/me            → partial profile update (session)
 *   POST  /users/me/avatar     → avatar upload → Appwrite bucket (session)
 *   POST  /users/me/onboarding → final-step save + completion stamp (session)
 *   GET   /users/:username     → public profile + stats (no session needed)
 *
 * Username is immutable (it owns the /u/[username] URL). Everything else
 * in the PRD User model is editable here.
 */

/** Public profile shape — PRD §6 exposes no email. */
export function sanitizePublicUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id?.toString?.() ?? doc.id,
    username: doc.username,
    displayName: doc.displayName ?? doc.name ?? doc.username,
    avatarUrl: doc.avatarUrl ?? doc.image ?? null,
    bio: doc.bio ?? null,
    website: doc.website ?? null,
    githubUrl: doc.githubUrl ?? null,
    roles: doc.roles ?? ["USER"],
    interests: doc.interests ?? [],
    joinedAt: doc.createdAt,
  };
}

function sanitizeStats(doc) {
  if (!doc) return null;
  const { _id, userId, ...rest } = doc;
  return rest;
}

/** Last accepted solves (public-safe: names + deltas, no code). */
async function recentSolves(db, userId, limit = 5) {
  try {
    const rows = await db
      .collection("ratingEvents")
      .find({ userId: new ObjectId(String(userId)), accepted: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return rows.map((r) => ({
      challengeSlug: r.challengeSlug,
      challengeTitle: r.challengeTitle,
      difficulty: r.difficulty ?? null,
      score: r.score ?? null,
      xpAwarded: r.xpAwarded ?? 0,
      ratingDelta: r.ratingDelta ?? 0,
      solvedAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

function normalizeUrl(value) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeText(value) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Applies a validated profile payload. Returns fresh { userDoc, statsDoc }. */
async function applyProfileUpdate(db, userId, data) {
  const now = new Date();
  const userSet = { updatedAt: now };
  if (data.displayName !== undefined) {
    userSet.displayName = data.displayName;
    userSet.name = data.displayName; // keep session-facing name in sync
  }
  if (data.bio !== undefined) userSet.bio = normalizeText(data.bio);
  if (data.website !== undefined) userSet.website = normalizeUrl(data.website);
  if (data.githubUrl !== undefined) userSet.githubUrl = normalizeUrl(data.githubUrl);
  if (data.interests !== undefined) userSet.interests = data.interests;

  await db.collection("user").updateOne({ _id: userId }, { $set: userSet });

  let statsDoc = null;
  if (data.preferredLanguages !== undefined) {
    // $setOnInsert must not repeat $set paths — Mongo rejects the conflict.
    const { createdAt, updatedAt, preferredLanguages, ...statsDefaults } =
      defaultProfileStats(userId.toString());
    await db.collection("profileStats").updateOne(
      { userId: userId.toString() },
      {
        $set: { preferredLanguages: data.preferredLanguages, updatedAt: now },
        $setOnInsert: statsDefaults,
      },
      { upsert: true }
    );
  }
  statsDoc = await db
    .collection("profileStats")
    .findOne({ userId: userId.toString() });

  const userDoc = await db.collection("user").findOne({ _id: userId });
  return { userDoc, statsDoc };
}

export function createUserRoutes(auth, db) {
  const router = Router();

  /** Session → user ObjectId, or null after a 401. */
  async function requireUserId(req, res) {
    try {
      const session = await auth.api.getSession({ headers: toWebHeaders(req) });
      if (!session?.user?.id) {
        res.status(401).json({ error: "Not signed in." });
        return null;
      }
      return new ObjectId(session.user.id);
    } catch {
      res.status(401).json({ error: "Not signed in." });
      return null;
    }
  }

  router.get("/users/me", async (req, res) => {
    const userId = await requireUserId(req, res);
    if (!userId) return;
    const [userDoc, statsDoc, solves, achievements] = await Promise.all([
      db.collection("user").findOne({ _id: userId }),
      db.collection("profileStats").findOne({ userId: userId.toString() }),
      recentSolves(db, userId),
      unlockedEntries(db, userId.toString()),
    ]);
    if (!userDoc) return res.status(404).json({ error: "User not found." });
    return res.json({ user: sanitizeUser(userDoc), stats: sanitizeStats(statsDoc), recentSolves: solves, achievements });
  });

  router.patch("/users/me", strictAuthLimit(), validate(profileUpdateSchema), async (req, res) => {
    const userId = await requireUserId(req, res);
    if (!userId) return;
    try {
      const { userDoc, statsDoc } = await applyProfileUpdate(db, userId, req.body);
      if (!userDoc) return res.status(404).json({ error: "User not found." });
      return res.json({ user: sanitizeUser(userDoc), stats: sanitizeStats(statsDoc) });
    } catch (err) {
      console.error("[users] patch failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not save profile." });
    }
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  });

  router.post("/users/me/avatar", authRateLimit({ windowMs: 60_000, max: 10 }), (req, res) => {
    upload.single("avatar")(req, res, async (err) => {
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(422).json({ error: "Avatar must be under 2 MB." });
      }
      if (err) {
        return res.status(422).json({ error: "Could not read that upload." });
      }
      const userId = await requireUserId(req, res);
      if (!userId) return;
      if (!req.file) {
        return res.status(422).json({ error: "Attach an image as “avatar”." });
      }
      if (!AVATAR_MIME_TYPES.includes(req.file.mimetype)) {
        return res.status(422).json({ error: "Avatar must be a JPEG, PNG or WebP image." });
      }
      if (!isAvatarStorageConfigured()) {
        return res.status(503).json({ error: "Avatar uploads are not configured yet." });
      }
      try {
        const previous = await db
          .collection("user")
          .findOne({ _id: userId }, { projection: { avatarFileId: 1 } });
        const { fileId, url } = await uploadAvatar(
          req.file.buffer,
          req.file.mimetype,
          userId.toString()
        );
        await db.collection("user").updateOne(
          { _id: userId },
          { $set: { avatarUrl: url, avatarFileId: fileId, image: url, updatedAt: new Date() } }
        );
        // Best-effort: drop the replaced file so buckets don't fill with orphans.
        if (previous?.avatarFileId && previous.avatarFileId !== fileId) {
          deleteAvatarFile(previous.avatarFileId);
        }
        return res.json({ avatarUrl: url });
      } catch (uploadErr) {
        console.error("[users] avatar upload failed:", uploadErr?.message ?? uploadErr);
        return res.status(502).json({ error: "Could not store that avatar. Try again." });
      }
    });
  });

  router.post(
    "/users/me/onboarding",
    strictAuthLimit(),
    validate(profileUpdateSchema),
    async (req, res) => {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      try {
        const { userDoc, statsDoc } = await applyProfileUpdate(db, userId, req.body);
        if (!userDoc) return res.status(404).json({ error: "User not found." });
        // First completion stamps the date; re-submits keep the original.
        if (!userDoc.onboardingCompletedAt) {
          await db.collection("user").updateOne(
            { _id: userId },
            { $set: { onboardingCompletedAt: new Date(), updatedAt: new Date() } }
          );
        }
        const fresh = await db.collection("user").findOne({ _id: userId });
        return res.json({ user: sanitizeUser(fresh), stats: sanitizeStats(statsDoc) });
      } catch (err) {
        console.error("[users] onboarding failed:", err?.message ?? err);
        return res.status(500).json({ error: "Could not complete onboarding." });
      }
    }
  );

  // Public profile — registered AFTER /users/me so “me” never hits this.
  router.get("/users/:username", async (req, res) => {
    const username = String(req.params.username ?? "").toLowerCase();
    if (!username) return res.status(404).json({ error: "User not found." });
    const userDoc = await db.collection("user").findOne({ username });
    if (!userDoc) return res.status(404).json({ error: "User not found." });
    const [statsDoc, solves, achievements] = await Promise.all([
      db.collection("profileStats").findOne({ userId: userDoc._id.toString() }),
      recentSolves(db, userDoc._id),
      unlockedEntries(db, userDoc._id.toString()),
    ]);
    return res.json({
      user: sanitizePublicUser(userDoc),
      stats: sanitizeStats(statsDoc),
      recentSolves: solves,
      achievements,
    });
  });

  return router;
}
