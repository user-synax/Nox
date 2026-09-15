import { idbGet, idbSet, idbDel, idbAll } from "./idb";

/**
 * Workspace persistence — code drafts, recently-viewed challenges, and a
 * stale-while-revalidate GET cache. IDB is checked FIRST so repeat visits
 * render instantly; the network then refreshes silently underneath.
 */

export const draftKey = (username, slug, path) =>
  `draft:${username}:${slug}:${path}`;

/** Persist a draft (caller debounces). Never throws. */
export async function saveDraft(username, slug, path, content) {
  try {
    await idbSet("drafts", {
      key: draftKey(username, slug, path),
      username,
      slug,
      path,
      content,
      updatedAt: Date.now(),
    });
  } catch {
    /* storage unavailable — the editor keeps working in memory */
  }
}

/** Draft content or null (no draft). Never throws. */
export async function loadDraft(username, slug, path) {
  try {
    const row = await idbGet("drafts", draftKey(username, slug, path));
    return typeof row?.content === "string" ? row.content : null;
  } catch {
    return null;
  }
}

export async function clearDraft(username, slug, path) {
  try {
    await idbDel("drafts", draftKey(username, slug, path));
  } catch {
    /* ignore */
  }
}

/** All draft paths for a challenge (for badges / reset-all). Never throws. */
export async function challengeDraftPaths(username, slug) {
  try {
    const rows = await idbAll("drafts");
    const prefix = `draft:${username}:${slug}:`;
    return rows.filter((r) => r.key?.startsWith(prefix)).map((r) => r.path);
  } catch {
    return [];
  }
}

/** Log a challenge view for fast "continue" lookup. Capped at 10. */
export async function recordRecent(slug, title) {
  if (!slug) return;
  try {
    await idbSet("recent", { slug, title: title ?? slug, viewedAt: Date.now() });
    const rows = await idbAll("recent");
    rows.sort((a, b) => b.viewedAt - a.viewedAt);
    await Promise.all(rows.slice(10).map((r) => idbDel("recent", r.slug)));
  } catch {
    /* ignore */
  }
}

export async function getRecent(limit = 4) {
  try {
    const rows = await idbAll("recent");
    rows.sort((a, b) => b.viewedAt - a.viewedAt);
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Stale-while-revalidate GET: cached data hits `onData` instantly (when a
 * fresh-enough entry exists), then the network refreshes underneath and
 * calls `onData` again. Rejects ONLY when there is no cache to fall back
 * on (true offline-first failure).
 */
export async function swrGet(key, fetcher, onData, { ttlMs = 5 * 60 * 1000 } = {}) {
  let cached = null;
  try {
    cached = await idbGet("api", key);
  } catch {
    cached = null;
  }
  const age = cached ? Date.now() - (cached.cachedAt ?? 0) : Infinity;
  if (cached) onData(cached.data, false);

  const refresh = async () => {
    const data = await fetcher();
    try {
      await idbSet("api", { key, data, cachedAt: Date.now() });
    } catch {
      /* serve anyway */
    }
    return data;
  };

  if (cached && age < ttlMs) return; // fresh enough — skip the network
  try {
    onData(await refresh(), true);
  } catch (err) {
    if (!cached) throw err; // nothing to show — surface it
  }
}
