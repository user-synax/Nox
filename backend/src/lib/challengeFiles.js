/**
 * Merges user-supplied files over challenge starters. Shared by the run
 * and submit routes so both trust boundaries behave identically:
 * unknown paths rejected, missing files backfilled, total size capped.
 */
import { ObjectId } from "mongodb";

const MAX_TOTAL_BYTES = 500 * 1024;

/** Published challenge by ObjectId or slug — null when missing/draft. */
export async function findPublishedChallenge(db, idParam) {
  let doc = null;
  try {
    doc = await db.collection("challenges").findOne({ _id: new ObjectId(idParam) });
  } catch {
    doc = await db
      .collection("challenges")
      .findOne({ slug: String(idParam ?? "").toLowerCase() });
  }
  return doc && doc.status === "published" ? doc : null;
}

export function mergeChallengeFiles(challenge, files) {
  const starters = new Map(
    (challenge?.starterFiles ?? []).map((f) => [f.path, f.content ?? ""])
  );
  for (const f of files ?? []) {
    if (!starters.has(f.path)) {
      return { error: `Unknown file: ${f.path}.` };
    }
  }
  const merged = [...starters.entries()].map(([path, starter]) => {
    const override = (files ?? []).find((f) => f.path === path);
    return { path, content: override ? override.content : starter };
  });
  const totalBytes = merged.reduce(
    (n, f) => n + Buffer.byteLength(f.content ?? "", "utf8"),
    0
  );
  if (totalBytes > MAX_TOTAL_BYTES) {
    return { error: "Submission is too large." };
  }
  return { merged };
}
