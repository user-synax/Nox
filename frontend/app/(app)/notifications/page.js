"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Bell, Heart, MessagesSquare, Trophy } from "lucide-react";
import { auth } from "../../../lib/auth";
import { notifyInboxChanged } from "../../../lib/useNotifications";

const PAGE_SIZE = 20;

const TYPE_META = {
  solution_comment: { Icon: MessagesSquare, label: "Comment" },
  solution_like: { Icon: Heart, label: "Like" },
  comment_like: { Icon: Heart, label: "Like" },
  achievement: { Icon: Award, label: "Achievement" },
  rank_up: { Icon: Trophy, label: "Rank up" },
};

/** Deep link per notification — solutions open the thread, progression opens boards. */
function linkFor(n) {
  const d = n?.data ?? {};
  if (d.solutionId) return `/solutions/${d.solutionId}`;
  if (n?.type === "rank_up") return "/leaderboard";
  if (n?.type === "achievement") return "/dashboard";
  return "/dashboard";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const append = page > 1;
    auth
      .listNotifications(page, PAGE_SIZE)
      .then((data) => {
        if (!alive) return;
        const fresh = data.items ?? [];
        setItems((prev) => {
          if (!append) return fresh;
          const ids = new Set(prev.map((n) => n.id));
          return [...prev, ...fresh.filter((n) => !ids.has(n.id))];
        });
        setTotal(data.total ?? 0);
        setUnread(data.unread ?? 0);
        setError(null);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch((err) => {
        if (!alive) return;
        if (!append) setError(err?.message ?? "Could not load notifications.");
        setLoading(false);
        setLoadingMore(false);
      });
    return () => {
      alive = false;
    };
  }, [page]);

  const markAllRead = async () => {
    try {
      const data = await auth.markNotificationsRead({ all: true });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnread(data.unread ?? 0);
      notifyInboxChanged();
    } catch {
      /* best-effort — list state is unchanged */
    }
  };

  const openNotification = async (n) => {
    if (!n?.readAt) {
      try {
        const data = await auth.markNotificationsRead({ ids: [n.id] });
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
        setUnread(data.unread ?? 0);
      } catch {
        /* still navigate — read state syncs on next poll */
      }
      notifyInboxChanged();
    }
    router.push(linkFor(n));
  };

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="Nox-display text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Notifications
          </h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="Nox-focus inline-flex min-h-[36px] shrink-0 cursor-pointer items-center rounded-pill border border-hairline bg-surface-1 px-4 text-[14px] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-2" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-xl bg-surface-1" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-6 rounded-xl border border-hairline-soft bg-surface-1 p-5 text-[14px] text-danger">
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-hairline-soft bg-surface-1 p-10 text-center">
          <Bell size={28} aria-hidden="true" className="mx-auto text-ink-muted" />
          <p className="mt-3 text-[15px] font-medium text-ink">Nothing here yet</p>
          <p className="mt-1 text-[14px] text-ink-muted">
            Comments, likes, achievements, and rank-ups will show up here.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 flex list-none flex-col gap-2 p-0">
            {items.map((n) => {
              const meta = TYPE_META[n.type] ?? { Icon: Bell, label: "Update" };
              const { Icon } = meta;
              const isUnread = !n.readAt;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`Nox-focus flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                      isUnread
                        ? "border-hairline bg-surface-1 hover:bg-surface-2"
                        : "border-hairline-soft bg-transparent hover:bg-surface-1"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink"
                    >
                      <Icon size={17} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium tracking-[-0.14px] text-ink">
                          {n.title}
                        </span>
                        {isUnread && (
                          <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-accent-blue" />
                        )}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-ink-muted">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[12px] text-ink-muted">
                        {meta.label}
                        {n.createdAt ? ` · ${new Date(n.createdAt).toLocaleString()}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {items.length < total && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => {
                setLoadingMore(true);
                setPage((p) => p + 1);
              }}
              className="Nox-focus mt-4 inline-flex min-h-[40px] w-full cursor-pointer items-center justify-center rounded-xl border border-hairline-soft bg-surface-1 text-[14px] font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : `Load more (${total - items.length} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
