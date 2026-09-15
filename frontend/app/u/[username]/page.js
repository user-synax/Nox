"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, GitBranch, Globe } from "lucide-react";
import { auth, rankFor } from "../../../lib/auth";
import { Avatar } from "../../../components/Avatar";
import { RankBadge } from "../../../components/Leaderboard";
import { SolutionCard } from "../../../components/Solutions";
import { StatNumber } from "../../../components/Stat";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const TABS = ["Overview", "Solutions", "Activity"];

function Skeleton() {
  return (
    <div className="w-full max-w-[760px] animate-pulse" aria-hidden="true">
      <div className="flex items-start gap-5">
        <div className="h-[88px] w-[88px] shrink-0 rounded-full bg-surface-1" />
        <div className="flex-1 pt-1">
          <div className="h-8 w-56 max-w-full rounded-md bg-surface-1" />
          <div className="mt-2 h-4 w-32 rounded bg-surface-1" />
          <div className="mt-3 h-4 w-full rounded bg-surface-1" />
          <div className="mt-2 h-4 w-2/3 rounded bg-surface-1" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-xl bg-surface-1" />
        ))}
      </div>
    </div>
  );
}

function StatCell({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-1 px-4 py-3">
      <StatNumber
        value={value}
        className="block text-[22px] leading-none font-medium tracking-[-0.5px] text-ink"
      />
      <p className="mt-1.5 text-[12px] tracking-[-0.12px] text-ink-muted">{label}</p>
    </div>
  );
}

export default function PublicProfilePage({ params }) {
  const { username } = use(params);
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [isOwn, setIsOwn] = useState(false);
  const [tab, setTab] = useState(0);
  const [solItems, setSolItems] = useState([]);
  const [solTotal, setSolTotal] = useState(0);
  const [mounted, setMounted] = useState(false);
  const pillRef = useRef(null);
  const tabRefs = useRef([]);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      auth.publicProfile(username),
      auth.meFull().catch(() => null),
      auth.authorSolutions(username, 1, 20).catch(() => null),
    ]).then(([pub, me, sols]) => {
      if (!alive) return;
      if (pub.status === "fulfilled") {
        setData(pub.value);
        const meUser = me.status === "fulfilled" ? me.value?.user : null;
        if (meUser?.username === pub.value.user.username) setIsOwn(true);
      } else {
        setMissing(true);
      }
      if (sols.status === "fulfilled" && sols.value) {
        setSolItems(sols.value.items ?? []);
        setSolTotal(sols.value.total ?? 0);
      }
    });
    return () => {
      alive = false;
    };
  }, [username]);

  useEffect(() => {
    if (!data) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [data]);

  /* Tabs pill position (transitions-dev 16 orchestration). */
  useEffect(() => {
    const pill = pillRef.current;
    const el = tabRefs.current[tab];
    if (!pill || !el) return;
    const prev = pill.style.transition;
    pill.style.transition = "none";
    pill.style.transform = `translateX(${el.offsetLeft}px)`;
    pill.style.width = `${el.offsetWidth}px`;
    void pill.offsetWidth;
    pill.style.transition = prev;
  }, [tab, mounted]);

  // Optimistic like for profile cards — reconcile, revert on failure.
  const toggleProfileLike = async (solution) => {
    if (!solution?.id) return;
    const prevLiked = !!solution.likedByMe;
    const prevCount = solution.likeCount ?? 0;
    setSolItems((rows) =>
      rows.map((s) =>
        s.id === solution.id
          ? { ...s, likedByMe: !prevLiked, likeCount: prevCount + (prevLiked ? -1 : 1) }
          : s
      )
    );
    try {
      const { liked, likeCount } = await auth.toggleSolutionLike(solution.id);
      setSolItems((rows) =>
        rows.map((s) => (s.id === solution.id ? { ...s, likedByMe: liked, likeCount } : s))
      );
    } catch {
      setSolItems((rows) =>
        rows.map((s) =>
          s.id === solution.id ? { ...s, likedByMe: prevLiked, likeCount: prevCount } : s
        )
      );
    }
  };

  const movePill = (index, animate) => {    const pill = pillRef.current;
    const el = tabRefs.current[index];
    if (!pill || !el) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.width = `${el.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.width = `${el.offsetWidth}px`;
    }
  };

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
            {isOwn ? (
              <Link
                href="/settings"
                className={`Nox-focus inline-flex min-h-[40px] items-center rounded-pill bg-surface-1 px-[15px] py-2 text-[14px] font-medium text-ink no-underline hover:bg-surface-2 ${HOVER}`}
              >
                Edit profile
              </Link>
            ) : null}
          </div>

          {missing ? (
            <div className="rounded-xl bg-surface-1 p-8 text-center">
              <h1 className="Nox-display text-[24px] font-medium tracking-[-0.5px]">
                No debugger by that name.
              </h1>
              <p className="mt-2 text-[14px] text-ink-muted">
                “{username}” hasn’t claimed this handle — yet.
              </p>
              <Link
                href="/"
                className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER} ${PRESS}`}
              >
                Back home
              </Link>
            </div>
          ) : !data ? (
            <Skeleton />
          ) : (
            <div
              data-open={mounted}
              className="t-panel-slide Nox-auth-enter"
              style={{ "--panel-translate-y": "16px" }}
            >
              {/* Header */}
              <div className="flex items-start gap-5">
                <Avatar user={data.user} size={88} />
                <div className="min-w-0 flex-1 pt-1">
                  <h1 className="Nox-display truncate text-[30px] leading-[1.1] font-medium tracking-[-1px]">
                    {data.user.displayName}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-muted">
                    <span>@{data.user.username}</span>
                    <RankBadge rank={rankFor(data.stats?.rating ?? 1000)} />
                    {data.user.joinedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={13} aria-hidden="true" />
                        Joined{" "}
                        {new Date(data.user.joinedAt).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : null}
                  </p>
                  {data.user.bio ? (
                    <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.45] tracking-[-0.15px] text-ink">
                      {data.user.bio}
                    </p>
                  ) : null}
                  {data.user.website || data.user.githubUrl ? (
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
                      {data.user.website ? (
                        <a
                          href={data.user.website}
                          target="_blank"
                          rel="noreferrer"
                          className="Nox-focus inline-flex items-center gap-1 rounded font-medium text-accent-blue no-underline hover:underline"
                        >
                          <Globe size={14} aria-hidden="true" />
                          {data.user.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : null}
                      {data.user.githubUrl ? (
                        <a
                          href={data.user.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="Nox-focus inline-flex items-center gap-1 rounded font-medium text-accent-blue no-underline hover:underline"
                        >
                          <GitBranch size={14} aria-hidden="true" />
                          GitHub
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6">
                <StatCell label="Rating" value={data.stats?.rating ?? 1000} />
                <StatCell label="XP" value={data.stats?.xp ?? 0} />
                <StatCell label="Solved" value={data.stats?.solvedCount ?? 0} />
                <StatCell
                  label="Success"
                  value={(() => {
                    const sr = data.stats?.successRate ?? 0;
                    return `${Math.round(sr <= 1 ? sr * 100 : sr)}%`;
                  })()}
                />
                <StatCell label="Day streak" value={data.stats?.currentStreak ?? 0} />
                <StatCell label="Level" value={data.stats?.level ?? 1} />
              </div>

              {/* Tabs */}
              <div className="t-tabs mt-8" role="tablist" aria-label="Profile sections">
                <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" />
                {TABS.map((label, i) => (
                  <button
                    key={label}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={tab === i ? "true" : "false"}
                    onClick={() => {
                      setTab(i);
                      movePill(i, true);
                    }}
                    className="t-tab Nox-focus px-4 text-[14px] font-medium"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {tab === 0 ? (
                  <div className="flex flex-col gap-4">
                    {(data.stats?.preferredLanguages?.length ?? 0) > 0 ? (
                      <section className="rounded-xl bg-surface-1 p-5">
                        <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                          Languages
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {data.stats.preferredLanguages.map((l) => (
                            <span
                              key={l}
                              className="Nox-mono rounded-pill bg-surface-2 px-3 py-1.5 text-[13px] text-ink"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {(data.user.interests?.length ?? 0) > 0 ? (
                      <section className="rounded-xl bg-surface-1 p-5">
                        <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                          Interests
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {data.user.interests.map((t) => (
                            <span
                              key={t}
                              className="rounded-pill bg-surface-2 px-3 py-1.5 text-[13px] text-ink"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {(data.stats?.preferredLanguages?.length ?? 0) === 0 &&
                    (data.user.interests?.length ?? 0) === 0 ? (
                      <section className="rounded-xl bg-surface-1 p-5 text-[14px] text-ink-muted">
                        {isOwn ? (
                          <>
                            Tell people what you debug in —{" "}
                            <Link
                              href="/settings"
                              className="font-medium text-accent-blue no-underline hover:underline"
                            >
                              complete your profile
                            </Link>
                            .
                          </>
                        ) : (
                          "This debugger hasn't shared their focus yet."
                        )}
                      </section>
                    ) : null}
                  </div>
                ) : tab === 1 ? (
                  solItems.length === 0 ? (
                  <section className="rounded-xl bg-surface-1 p-8 text-center">
                    <p className="text-[15px] font-medium text-ink">No shared solutions yet</p>
                    <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-[1.45] text-ink-muted">
                      {isOwn
                        ? "Solve a challenge and publish your write-up — it will live here."
                        : "Once they solve challenges and publish write-ups, they'll live here."}
                    </p>
                  </section>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {solItems.map((s) => (
                        <SolutionCard key={s.id} solution={s} onLike={toggleProfileLike} />
                      ))}
                      {solTotal > solItems.length ? (
                        <p className="Nox-mono py-2 text-center text-[12px] text-ink-muted">
                          Showing {solItems.length} of {solTotal}
                        </p>
                      ) : null}
                    </div>
                  )
                ) : (
                  <section className="rounded-xl bg-surface-1 p-5" aria-label="Recent activity">
                    {(data.recentSolves?.length ?? 0) === 0 ? (
                      <div className="p-3 text-center">
                        <p className="text-[15px] font-medium text-ink">Quiet… for now</p>
                        <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-[1.45] text-ink-muted">
                          {isOwn
                            ? "Accept your first challenge and it will show up here."
                            : "Their accepted solves will appear here."}
                        </p>
                      </div>
                    ) : (
                      <ul className="flex flex-col">
                        {data.recentSolves.map((s, i) => (
                          <li key={`${s.challengeSlug}-${i}`}>
                            <Link
                              href={`/challenges/${s.challengeSlug}`}
                              className={`Nox-focus group flex items-center gap-3 rounded-md px-2 py-2.5 no-underline hover:bg-surface-2 ${HOVER}`}
                            >
                              <span
                                aria-hidden="true"
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                              >
                                <Check size={13} strokeWidth={3} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-medium text-ink">
                                  {s.challengeTitle ?? s.challengeSlug}
                                </span>
                                <span className="Nox-mono block text-[12px] text-ink-muted">
                                  {s.solvedAt
                                    ? new Date(s.solvedAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : ""}
                                  {s.solvedAt ? " · " : ""}+{s.xpAwarded ?? 0} XP · +
                                  {s.ratingDelta ?? 0}
                                </span>
                              </span>
                              {s.score != null ? (
                                <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                                  {s.score}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
