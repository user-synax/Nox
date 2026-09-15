"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, LoaderCircle, Medal, Trophy } from "lucide-react";
import { auth } from "../lib/auth";
import { Avatar } from "./Avatar";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";

/** Board definitions shared by /leaderboard and the dashboard widget. */
export const BOARDS = [
  { slug: "global", label: "Rating", hint: "Competitive ladder" },
  { slug: "level", label: "Level", hint: "XP race" },
  { slug: "weekly", label: "Weekly", hint: "Last 7 days" },
  { slug: "language", label: "Language", hint: "Per-language XP" },
  { slug: "category", label: "Category", hint: "Per-category XP" },
];

const RANK_DOT = {
  Bronze: "bg-[#b07a4f]",
  Silver: "bg-[#9aa3ad]",
  Gold: "bg-[#e3b341]",
  Platinum: "bg-[#7dd3d8]",
  Diamond: "bg-accent-blue",
  Master: "bg-gradient-violet",
  Grandmaster: "bg-gradient-orange",
};

export function RankBadge({ rank, className = "" }) {
  if (!rank) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-ink ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${RANK_DOT[rank] ?? "bg-ink-muted"}`}
      />
      {rank}
    </span>
  );
}

/** XP progress toward the next level (250 XP per level, backend scoring). */
export function LevelProgress({ xp = 0, className = "" }) {
  const into = Math.max(0, xp) % 250;
  const pct = Math.round((into / 250) * 100);
  return (
    <span className={`block ${className}`}>
      <span
        className="block h-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={into}
        aria-valuemin={0}
        aria-valuemax={250}
        aria-label={`${pct}% to next level`}
      >
        <span
          className="block h-full rounded-full bg-accent-blue"
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

function positionStyle(position) {
  if (position === 1)
    return "inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e3b341]/15 text-[#e3b341]";
  if (position === 2)
    return "inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-ink";
  if (position === 3)
    return "inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#b07a4f]/15 text-[#b07a4f]";
  return "Nox-mono inline-flex h-6 w-6 items-center justify-center text-[13px] text-ink-muted";
}

function PositionMark({ position }) {
  const cls = positionStyle(position);
  if (position === 1)
    return (
      <span className={cls} aria-hidden="true">
        <Crown size={13} strokeWidth={2.5} />
      </span>
    );
  if (position === 2 || position === 3)
    return (
      <span className={cls} aria-hidden="true">
        <Medal size={13} strokeWidth={2.5} />
      </span>
    );
  return (
    <span className={cls} aria-hidden="true">
      {position}
    </span>
  );
}

/** Right-side metric per board type. */
function Metric({ entry, type }) {
  if (type === "weekly") {
    const d = entry.weeklyDelta ?? 0;
    return (
      <span className="shrink-0 text-right">
        <span
          className={`Nox-mono block text-[13px] font-medium ${d >= 0 ? "text-success" : "text-danger"}`}
        >
          {`${d >= 0 ? "+" : ""}${d}`}
        </span>
        <span className="Nox-mono block text-[11px] text-ink-muted">
          {entry.solves ?? 0} solve{(entry.solves ?? 0) === 1 ? "" : "s"}
        </span>
      </span>
    );
  }
  if (type === "language" || type === "category") {
    return (
      <span className="shrink-0 text-right">
        <span className="Nox-mono block text-[13px] font-medium text-ink">
          {(entry.trackXp ?? 0).toLocaleString()} XP
        </span>
        <span className="Nox-mono block text-[11px] text-ink-muted">
          {entry.trackSolves ?? 0} solve{(entry.trackSolves ?? 0) === 1 ? "" : "s"}
        </span>
      </span>
    );
  }
  if (type === "level") {
    return (
      <span className="shrink-0 text-right">
        <span className="Nox-mono block text-[13px] font-medium text-ink">
          {(entry.xp ?? 0).toLocaleString()} XP
        </span>
        <span className="Nox-mono block text-[11px] text-ink-muted">
          Lv {entry.level ?? 1}
        </span>
      </span>
    );
  }
  // global
  return (
    <span className="shrink-0 text-right">
      <span className="Nox-mono block text-[13px] font-medium text-ink">
        {(entry.rating ?? 1000).toLocaleString()}
      </span>
      <span className="block text-[11px] text-ink-muted">{entry.rank}</span>
    </span>
  );
}

export function LeaderboardRows({ entries = [], type = "global", highlight = null }) {
  if (entries.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-[14px] text-ink-muted">
        No ranked debuggers here yet — solve a challenge to claim the top spot.
      </p>
    );
  }
  return (
    <ol className="flex flex-col">
      {entries.map((e) => {
        const isMe = highlight && e.username && e.username === highlight;
        const body = (
          <>
            <PositionMark position={e.rank_position} />
            <Avatar user={e} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-ink">
                {e.displayName ?? e.username}
              </span>
              <span className="block truncate text-[12px] text-ink-muted">
                @{e.username} · {e.solvedCount ?? 0} solved
              </span>
            </span>
            <Metric entry={e} type={type} />
          </>
        );
        const cls = `flex items-center gap-3 rounded-md px-2 py-2.5 ${isMe ? "bg-accent-blue/10" : ""}`;
        return (
          <li key={`${e.rank_position}-${e.username ?? "?"}`}>
            {e.username ? (
              <Link
                href={`/u/${e.username}`}
                aria-label={`${e.displayName ?? e.username} — rank ${e.rank_position}`}
                className={`Nox-focus no-underline hover:bg-surface-2 ${HOVER} ${cls}`}
              >
                {body}
              </Link>
            ) : (
              <span className={cls}>{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function boardParams(type, { language, category, limit, page }) {
  const p = { limit, page };
  if (type === "language" || (type === "weekly" && language)) p.language = language;
  if (type === "category" || (type === "weekly" && category)) p.category = category;
  return p;
}

/**
 * Dashboard rail widget — compact top-N with tab switching and a
 * sticky "your position" footer. Self-sufficient: fetches board + me.
 */
export function LeaderboardMini({
  username = null,
  defaultBoard = "global",
  limit = 5,
  language = null,
  category = null,
}) {
  const [board, setBoard] = useState(defaultBoard);
  const [entries, setEntries] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // Loading flips on here (event handler), the effect below only settles
  // state inside fetch callbacks.
  const switchBoard = (slug) => {
    if (slug === board) return;
    setLoading(true);
    setBoard(slug);
  };

  useEffect(() => {
    let alive = true;
    const params = boardParams(board, { language, category, limit });
    Promise.allSettled([
      auth.listLeaderboard(board, params),
      username
        ? auth.myBoardPosition(board, { language, category }).catch(() => null)
        : Promise.resolve(null),
    ]).then(([top, mine]) => {
      if (!alive) return;
      if (top.status === "fulfilled") setEntries(top.value.entries ?? []);
      else setEntries([]);
      if (mine.status === "fulfilled" && mine.value) setMe(mine.value);
      else setMe(null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [board, limit, username, language, category]);

  const tabs = BOARDS.slice(0, 3);
  return (
    <section
      aria-label="Leaderboard preview"
      className="flex flex-col rounded-xl bg-surface-1 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.15px] text-ink">
          <Trophy size={15} aria-hidden="true" className="text-ink-muted" />
          Leaderboard
        </h2>
        <Link
          href="/leaderboard"
          className="Nox-focus rounded text-[13px] font-medium text-accent-blue no-underline hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="mt-3 flex gap-1 rounded-md bg-canvas p-1" role="tablist" aria-label="Board">
        {tabs.map((t) => (
          <button
            key={t.slug}
            type="button"
            role="tab"
            aria-selected={board === t.slug}
            onClick={() => switchBoard(t.slug)}
            className={`Nox-focus flex-1 cursor-pointer rounded border-0 px-2 py-1.5 text-[13px] font-medium ${HOVER} ${
              board === t.slug ? "bg-surface-2 text-ink" : "bg-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-[220px]">
        {loading ? (
          <div className="flex flex-col gap-2 py-2" aria-hidden="true">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 px-2 py-2">
                <div className="h-6 w-6 rounded-full bg-surface-2" />
                <div className="h-7 w-7 rounded-full bg-surface-2" />
                <div className="h-4 flex-1 rounded bg-surface-2" />
              </div>
            ))}
          </div>
        ) : (
          <LeaderboardRows entries={entries} type={board} highlight={username} />
        )}
      </div>

      <div className="mt-2 border-t border-hairline-soft pt-3">
        {username && me?.ranked ? (
          <p className="Nox-mono text-[12.5px] text-ink-muted" role="status">
            You are{" "}
            <span className="font-medium text-ink">
              #{me.position} of {me.total}
            </span>{" "}
            on {board}
            {board === "weekly" && (language || category)
              ? ` · ${language ?? category}`
              : ""}
            .
          </p>
        ) : username ? (
          <p className="text-[12.5px] text-ink-muted" role="status">
            Solve a challenge to join this board.
          </p>
        ) : (
          <p className="text-[12.5px] text-ink-muted">
            <Link href="/login" className="font-medium text-accent-blue no-underline hover:underline">
              Log in
            </Link>{" "}
            to see your position.
          </p>
        )}
      </div>
    </section>
  );
}

export function BoardLoading() {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-[14px] text-ink-muted"
      role="status"
    >
      <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
      Loading board…
    </div>
  );
}
