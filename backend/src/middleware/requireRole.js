import { toWebHeaders } from "../routes/auth.js";

/**
 * RBAC for privileged API routes (PRD §22 — enforced on the API, never
 * just in the frontend). Hierarchy: USER < MODERATOR < ADMIN < FOUNDER.
 *
 * Attaches the auth instance per-router via `app.use(withAuth(auth))`
 * (see routes/admin.js), then guards with requireRole("ADMIN").
 */
const ROLE_RANK = { USER: 0, MODERATOR: 1, ADMIN: 2, FOUNDER: 3 };

function highestRank(roles) {
  if (!Array.isArray(roles)) return -1;
  return Math.max(-1, ...roles.map((r) => ROLE_RANK[r] ?? -1));
}

/** Makes the Better Auth instance available to role guards. */
export function withAuth(auth) {
  return (req, _res, next) => {
    req.auth = auth;
    next();
  };
}

export function requireRole(minimumRole) {
  const floor = ROLE_RANK[minimumRole] ?? 0;
  return async (req, res, next) => {
    try {
      const session = await req.auth.api.getSession({
        headers: toWebHeaders(req),
      });
      if (!session?.user) {
        return res.status(401).json({ error: "Not signed in." });
      }
      if (highestRank(session.user.roles) < floor) {
        return res.status(403).json({ error: "Insufficient permissions." });
      }
      req.sessionUser = session.user;
      next();
    } catch (err) {
      console.error("[rbac] session check failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not verify permissions." });
    }
  };
}

/** Challenge admin floor: ADMIN and FOUNDER (PRD §22 roles). */
export const requireAdmin = () => requireRole("ADMIN");
