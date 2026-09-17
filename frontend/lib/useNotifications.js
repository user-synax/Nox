"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "./auth";
import { getSocket } from "./socket";

/**
 * Shared unread badge state (PRD §21).
 * Polls the light unread-count endpoint every 30s (visible tabs only),
 * refetches on window focus, and live-increments on `notification:new`
 * (authed sockets auto-join their private user:<id> room server-side).
 * REST stays the source of truth — the socket is a hint only.
 */

export function notifyInboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("Nox:notifications-changed"));
  }
}

export function useUnreadCount() {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await auth.unreadCount();
      setUnread(data.unread ?? 0);
    } catch {
      /* signed out / offline — badge stays hidden */
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    const onFocus = () => refresh();
    const onBump = () => setUnread((n) => n + 1);
    const onChanged = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("Nox:notifications-changed", onChanged);
    const s = getSocket();
    s?.on("notification:new", onBump);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("Nox:notifications-changed", onChanged);
      s?.off("notification:new", onBump);
    };
  }, [refresh]);

  return { unread, refresh };
}
