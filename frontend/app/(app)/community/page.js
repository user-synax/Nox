"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { useAppSession } from "../../../components/SessionScope";
import { SolutionCard } from "../../../components/Solutions";
import { useLiveRooms } from "../../../lib/socket";
import { auth } from "../../../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";

const PAGE_SIZE = 20;

export default function CommunityPage() {
  const { session } = useAppSession();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let alive = true;
    const first = page === 1;
    auth
      .recentSolutions(page, PAGE_SIZE)
      .then((data) => {
        if (!alive) return;
        setItems((prev) => {
          const fresh = data.items ?? [];
          if (first) return fresh;
          const ids = new Set(prev.map((s) => s.id));
          return [...prev, ...fresh.filter((s) => !ids.has(s.id))];
        });
        setTotal(data.total ?? 0);
        setError(null);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch((err) => {
        if (!alive) return;
        if (first) setError(err?.message ?? "Could not load the feed.");
        setLoading(false);
        setLoadingMore(false);
      });
    return () => {
      alive = false;
    };
  }, [page]);

  useEffect(() => {
    if (!loading) {
      const raf = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [loading]);

  const challengeIds = [...new Set(items.map((s) => s.challengeId).filter(Boolean))];

  // Live feed — same merge rules as the challenge tab: counts from echoes,
  // likedByMe stays local, dedupe on prepend/append.
  useLiveRooms({
    challengeIds,
    events: {
      "solution:new": ({ solution } = {}) => {
        if (!solution?.id) return;
        if (page === 1) {
          setItems((prev) =>
            prev.some((s) => s.id === solution.id) ? prev : [solution, ...prev]
          );
        }
        setTotal((t) => t + 1);
      },
      "solution:updated": ({ solution } = {}) => {
        if (!solution?.id) return;
        setItems((prev) =>
          prev.map((s) => (s.id === solution.id ? { ...s, ...solution, likedByMe: s.likedByMe } : s))
        );
      },
      "solution:deleted": ({ solutionId } = {}) => {
        if (!solutionId) return;
        setItems((prev) => prev.filter((s) => s.id !== solutionId));
        setTotal((t) => Math.max(0, t - 1));
      },
      "solution:like": ({ solutionId, likeCount } = {}) => {
        if (!solutionId || likeCount == null) return;
        setItems((prev) =>
          prev.map((s) => (s.id === solutionId ? { ...s, likeCount } : s))
        );
      },
    },
  });

  const toggleLike = async (solution) => {
    if (!solution?.id) return;
    const prevLiked = !!solution.likedByMe;
    const prevCount = solution.likeCount ?? 0;
    setItems((rows) =>
      rows.map((s) =>
        s.id === solution.id
          ? { ...s, likedByMe: !prevLiked, likeCount: prevCount + (prevLiked ? -1 : 1) }
          : s
      )
    );
    try {
      const { liked, likeCount } = await auth.toggleSolutionLike(solution.id);
      setItems((rows) =>
        rows.map((s) => (s.id === solution.id ? { ...s, likedByMe: liked, likeCount } : s))
      );
    } catch {
      setItems((rows) =>
        rows.map((s) =>
          s.id === solution.id ? { ...s, likedByMe: prevLiked, likeCount: prevCount } : s
        )
      );
    }
  };

  return (
    <div data-open={mounted} className="t-panel-slide Nox-auth-enter">
      <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.08em] text-ink-muted">
        <MessagesSquare size={13} aria-hidden="true" />
        COMMUNITY
      </p>
      <h1 className="Nox-display mt-2 text-[30px] leading-[1.1] font-medium tracking-[-1px] text-ink">
        Fresh write-ups{session?.user?.displayName ? `, ${session.user.displayName.split(" ")[0]}` : ""}.
      </h1>
      <p className="mt-2 text-[15px] tracking-[-0.15px] text-ink-muted">
        Root-cause notes from challenges you&apos;ve cracked — newest first.
      </p>

      <div className="mt-6 flex max-w-[760px] flex-col gap-2" aria-live="polite">
        {loading ? (
          <div className="flex flex-col gap-2" aria-hidden="true" role="status" aria-label="Loading feed">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[150px] animate-pulse rounded-xl bg-surface-1" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-surface-1 p-6 text-center text-[14px] text-danger">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-surface-1 p-8 text-center">
            <p className="text-[15px] font-medium text-ink">Quiet in here… for now</p>
            <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-[1.5] text-ink-muted">
              Solve a challenge and share the first write-up — it will show up here for
              every solver.
            </p>
            <Link
              href="/challenges"
              className={`Nox-focus mt-5 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 text-[14px] font-medium text-black no-underline ${HOVER}`}
            >
              Browse challenges
            </Link>
          </div>
        ) : (
          <>
            {items.map((s) => (
              <SolutionCard key={s.id} solution={s} onLike={toggleLike} showChallenge />
            ))}
            {items.length < total ? (
              <button
                type="button"
                onClick={() => {
                  setLoadingMore(true);
                  setPage((p) => p + 1);
                }}
                disabled={loadingMore}
                className={`Nox-focus inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-1 px-5 text-[14px] font-medium text-ink disabled:cursor-wait disabled:opacity-70 ${HOVER}`}
              >
                {loadingMore ? "Loading…" : `Show more (${items.length} of ${total})`}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
