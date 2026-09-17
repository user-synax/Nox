"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadCount } from "../lib/useNotifications";

/** Bell with unread badge — used in the mobile top bar. */
export function NotificationBell({ size = 20 }) {
  const { unread } = useUnreadCount();
  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="Nox-focus relative inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted no-underline transition-colors duration-[var(--duration-fast)] hover:bg-surface-1 hover:text-ink"
    >
      <Bell size={size} strokeWidth={2} aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] leading-none font-semibold text-black"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/** Count pill for sidebar / menu rows. Renders nothing when empty. */
export function UnreadPill({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-[11px] leading-none font-semibold text-black"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
