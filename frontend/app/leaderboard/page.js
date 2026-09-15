"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { auth, LANGUAGES, INTERESTS } from "../../lib/auth";
import {
  BOARDS,
  BoardLoading,
  LeaderboardRows,
  RankBadge,
} from "../../components/Leaderboard";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const PAGE_SIZE = 50;

function Chip({ active, children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label ?? (typeof children === "string" ? children : undefined)}
      className={`Nox-focus min-h-[36px] cursor-pointer rounded-pill border-0 px-3.5 py-1.5 text-[13px] font-medium ${HOVER} ${
        active ? "bg-white text-black" : "bg-surface-2 text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export default function LeaderboardPage() {
  const [board, setBoard] = useState("global");
  const [language, setLanguage] = useState("javascript");
  const [category, setCategory] = useState("backend");
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [me, setMe] = useState(null);
  const [myUsername, setMyUsername] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [ranks, setRanks] = useState([]);
  const [mounted, setMounted] = useState(false);
  const pillRef = useRef(null);
  const tabRefs = useRef([]);

  const needsLanguage = board === "language";
  const needsCategory = board === "category";

  // Session (best-effort — page stays public when signed out).
  useEffect(() => {
    let alive = true;
    auth
      .meFull()
      .then((data) => {
        if (!alive) return;
        setLoggedIn(true);
        setMyUsername(data?.user?.username ?? null);
      })
      .catch(() => {
        if (alive) setLoggedIn(false);
      });
    auth
      .ranksConfig()
      .then((r) => {
        if (alive) setRanks(r?.ranks ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Board fetch — resets on board/filter change, appends on page change.
  // Loading flags flip in the click handlers below; this effect only
  // settles state inside fetch callbacks.
  useEffect(() => {
    let alive = true;
    const isFirst = page === 1;
    const params = { limit: PAGE_SIZE, page };
    if (needsLanguage) params.language = language;
    if (needsCategory) params.category = category;
    auth
      .listLeaderboard(board, params)
      .then((data) => {
        if (!alive) return;
        setEntries((prev) => (isFirst ? (data.entries ?? []) : [...prev, ...(data.entries ?? [])]));
        setTotal(data.total ?? 0);
        setFailed(false);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch(() => {
        if (!alive) return;
        if (isFirst) setEntries([]);
        setFailed(true);
        setLoading(false);
        setLoadingMore(false);
      });
    return () => {
      alive = false;
    };
  }, [board, language, category, page, needsLanguage, needsCategory]);

  // Own position for the current board (silent when signed out).
  // Keyed to the board so a stale banner never flashes after switching.
  const meKey = `${board}|${needsLanguage ? language : ""}|${needsCategory ? category : ""}`;
  useEffect(() => {
    let alive = true;
    if (!loggedIn) return undefined;
    const params = {};
    if (needsLanguage) params.language = language;
    if (needsCategory) params.category = category;
    auth
      .myBoardPosition(board, params)
      .then((data) => {
        if (alive) setMe({ ...data, _k: `${board}|${needsLanguage ? language : ""}|${needsCategory ? category : ""}` });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [board, language, category, loggedIn, needsLanguage, needsCategory]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const pill = pillRef.current;
    const el = tabRefs.current[BOARDS.findIndex((b) => b.slug === board)];
    if (!pill || !el) return;
    const prev = pill.style.transition;
    pill.style.transition = "none";
    pill.style.transform = `translateX(${el.offsetLeft}px)`;
    pill.style.width = `${el.offsetWidth}px`;
    void pill.offsetWidth;
    pill.style.transition = prev;
  }, [board, mounted]);

  const selectBoard = (slug) => {
    if (slug === board) return;
    setLoading(true);
    setFailed(false);
    setBoard(slug);
    setPage(1);
  };

  const selectTrack = (setter, value) => {
    setLoading(true);
    setFailed(false);
    setter(value);
    setPage(1);
  };

  const activeMeta = BOARDS.find((b) => b.slug === board);
  const hasMore = entries.length < total;

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      <main className="mx-auto w-full max-w-[1199px] flex-1 px-5 py-8 sm:px-[30px]">
        <div className="mx-auto w-full max-w-[760px]">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" aria-label="Nox home" className="Nox-focus block rounded-[14px]">
              <span className="block h-10 w-10 overflow-hidden rounded-[12px]">
                <Image
                  src="/Nox-logo.png"
                  alt=""
                  aria-hidden="true"
                  width={40}
                  height={40}
                  sizes="40px"
                  className="h-10 w-10 object-cover"
                />
              </span>
            </Link>
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              className={`Nox-focus inline-flex min-h-[40px] items-center rounded-pill bg-surface-1 px-[15px] py-2 text-[14px] font-medium text-ink no-underline hover:bg-surface-2 ${HOVER}`}
            >
              {loggedIn ? "Dashboard" : "Log in"}
            </Link>
          </div>

          <div data-open={mounted} className="t-panel-slide Nox-auth-enter">
            <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.08em] text-ink-muted">
              <Trophy size={13} aria-hidden="true" />
              LEADERBOARDS
            </p>
            <h1 className="Nox-display mt-2 text-[30px] leading-[1.1] font-medium tracking-[-1px]">
              Who&apos;s debugging best.
            </h1>
            <p className="mt-2 text-[15px] tracking-[-0.15px] text-ink-muted">
              {activeMeta?.hint} —{" "}
              {board === "global"
                ? "one competitive rating ladder."
                : board === "level"
                  ? "total XP, level by level."
                  : board === "weekly"
                    ? "rating gained in the last 7 days."
                    : board === "language"
                      ? `XP earned solving ${language} challenges.`
                      : `XP earned in ${category} challenges.`}
            </p>

            {/* Board tabs */}
            <div className="t-tabs mt-6" role="tablist" aria-label="Leaderboard types">
              <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" />
              {BOARDS.map((b, i) => (
                <button
                  key={b.slug}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={board === b.slug}
                  onClick={() => selectBoard(b.slug)}
                  className="t-tab Nox-focus px-4 text-[14px] font-medium"
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Track selectors */}
            {needsLanguage ? (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Language">
                {LANGUAGES.map((l) => (
                  <Chip
                    key={l.slug}
                    active={language === l.slug}
                    onClick={() => selectTrack(setLanguage, l.slug)}
                  >
                    {l.label}
                  </Chip>
                ))}
              </div>
            ) : null}
            {needsCategory ? (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Category">
                {INTERESTS.map((t) => (
                  <Chip
                    key={t.slug}
                    active={category === t.slug}
                    onClick={() => selectTrack(setCategory, t.slug)}
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            ) : null}

            {/* Own position banner */}
            {loggedIn && me?.ranked && me?._k === meKey ? (
              <div
                role="status"
                className="mt-4 flex items-center gap-3 rounded-xl bg-accent-blue/10 px-4 py-3"
              >
                <span className="Nox-mono text-[14px] font-medium text-ink">
                  #{me.position}
                </span>
                <p className="text-[13.5px] text-ink-muted">
                  You&apos;re ranked{" "}
                  <span className="font-medium text-ink">
                    #{me.position} of {me.total}
                  </span>{" "}
                  on this board.
                  {me.entry?.rank ? (
                    <>
                      {" "}
                      <RankBadge rank={me.entry.rank} className="ml-1 bg-canvas" />
                    </>
                  ) : null}
                </p>
              </div>
            ) : loggedIn && me && !me.ranked && me?._k === meKey ? (
              <div role="status" className="mt-4 rounded-xl bg-surface-1 px-4 py-3">
                <p className="text-[13.5px] text-ink-muted">
                  You&apos;re unranked here — solve a{" "}
                  {needsLanguage ? `${language} ` : needsCategory ? `${category} ` : ""}
                  challenge to join this board.
                </p>
              </div>
            ) : null}

            {/* Board */}
            <section
              aria-label={`${activeMeta?.label} leaderboard`}
              className="mt-4 rounded-xl bg-surface-1 p-3 sm:p-4"
            >
              {loading ? (
                <BoardLoading />
              ) : failed ? (
                <p role="alert" className="px-2 py-8 text-center text-[14px] text-danger">
                  Couldn&apos;t load this board. Try again.
                </p>
              ) : (
                <>
                  <LeaderboardRows entries={entries} type={board} highlight={myUsername} />
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLoadingMore(true);
                        setPage((p) => p + 1);
                      }}
                      disabled={loadingMore}
                      className={`Nox-focus mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-2 px-5 text-[14px] font-medium text-ink disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
                    >
                      {loadingMore ? "Loading…" : `Show more (${entries.length} of ${total})`}
                    </button>
                  ) : entries.length > 0 ? (
                    <p className="Nox-mono py-3 text-center text-[12px] text-ink-muted">
                      {total} ranked debugger{total === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </>
              )}
            </section>

            {/* Rank ladder legend */}
            {ranks.length > 0 ? (
              <section aria-label="Rank ladder" className="mt-2 rounded-xl bg-surface-1 p-5">
                <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                  Ranks — rating thresholds
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...ranks].reverse().map((r) => (
                    <span
                      key={r.name}
                      className="Nox-mono inline-flex items-center gap-2 rounded-pill bg-surface-2 px-3 py-1.5 text-[12px] text-ink"
                      title={`Rating ${r.min === -Infinity ? "any" : `≥ ${r.min}`}`}
                    >
                      <RankBadge rank={r.name} className="bg-transparent p-0" />
                      <span className="text-ink-muted">
                        {r.min === -Infinity ? "start" : `${r.min}+`}
                      </span>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
