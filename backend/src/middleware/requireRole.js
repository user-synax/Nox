import { getSessionUser } from "../lib/session.js";

/**
 * RBAC for privileged API routes (PRD §22 — enforced on the API, never
 * just in the frontend). Hierarchy: USER < MODERATOR < ADMIN < FOUNDER.
 *
 * Attaches the database per-router via `app.use(withAuth(db))`
 * (see routes/admin.js), then guards with requireRole("ADMIN").
 */
const ROLE_RANK = { USER: 0, MODERATOR: 1, ADMIN: 2, FOUNDER: 3 };

function highestRank(roles) {
  if (!Array.isArray(roles)) return -1;
  return Math.max(-1, ...roles.map((r) => ROLE_RANK[r] ?? -1));
}

/** Makes the database available to role guards. */
export function withAuth(db) {
  return (req, _res, next) => {
    req.db = db;
    next();
  };
}

export function requireRole(minimumRole) {
  const floor = ROLE_RANK[minimumRole] ?? 0;
  return async (req, res, next) => {
    try {
      const found = await getSessionUser(req.db, req);
      if (!found) {
        return res.status(401).json({ error: "Not signed in." });
      }
      if (highestRank(found.user.roles) < floor) {
        return res.status(403).json({ error: "Insufficient permissions." });
      }
      req.sessionUser = {
        id: found.user._id.toString(),
        _id: found.user._id,
        roles: found.user.roles ?? [],
      };
      next();
    } catch (err) {
      console.error("[rbac] session check failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not verify permissions." });
    }
  };
}

/** Challenge admin floor: ADMIN and FOUNDER (PRD §22 roles). */
export const requireAdmin = () => requireRole("ADMIN");
