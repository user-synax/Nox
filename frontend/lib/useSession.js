"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "./auth";

/**
 * Session hook — fresh user + stats from GET /users/me.
 * { session: { user, stats } | null, loading, error, refresh }
 * 401 (signed out) resolves to null + error.status 401.
 * Network/CORS failures keep error without status — caller must NOT
 * treat them as signed out (see (app)/layout.js).
 */
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auth.meFull();
      setSession(data);
      setError(null);
    } catch (e) {
      setSession(null);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await auth.meFull();
        if (alive) {
          setSession(data);
          setError(null);
        }
      } catch (e) {
        if (alive) {
          setSession(null);
          setError(e);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { session, loading, error, refresh };
}
