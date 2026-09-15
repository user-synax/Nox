"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "./auth";

/**
 * Session hook — fresh user + stats from GET /users/me.
 * { session: { user, stats } | null, loading, refresh }
 * 401 (signed out) resolves to null, not an error.
 */
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await auth.meFull();
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await auth.meFull();
        if (alive) setSession(data);
      } catch {
        if (alive) setSession(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { session, loading, refresh };
}
