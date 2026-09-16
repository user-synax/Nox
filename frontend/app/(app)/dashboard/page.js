"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  History,
  Lock,
  Trophy,
  Zap,
} from "lucide-react";
import { useAppSession } from "../../../components/SessionScope";
import { StatNumber } from "../../../components/Stat";
import {
  LeaderboardMini,
  LevelProgress,
  RankBadge,
} from "../../../components/Leaderboard";
import { auth, rankFor, rankProgress } from "../../../lib/auth";
import { getRecent } from "../../../lib/workspace";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatCard({ icon: Icon, label, value, meta, foot }) {
  return (
    <div className="rounded-xl bg-surface-1 px-4 py-4">
      <div className="flex items-center gap-1.5 text-ink-muted">
        <Icon size={14} aria-hidden="true" className="shrink-0" />
        <p className="text-[11px] font-medium tracking-[0.08em] uppercase">{label}</p>
      </div>
      <StatNumber
        value={value}
        className="mt-2.5 block text-[28px] leading-none font-medium tracking-[-0.5px] text-ink"
      />
      {meta ? <p className="mt-1.5 text-[12px] text-ink-muted">{meta}</p> : null}
      {foot ? <div className="mt-2.5">{foot}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAppSession();
  const [mounted, setMounted] = useState(false);
  const [recent, setRecent] = useState([]);
  const [daily, setDaily] = useState(null);
  const [dailyState, setDailyState] = useState("loading");
  const [activity, setActivity] = useState([]);
  const [activityState, setActivityState] = useState("loading");
  const user = session?.user;
  const stats = session?.stats;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Instant local lookup — no API round-trip for recent views.
  useEffect(() => {
    let alive = true;
    getRecent(4).then((rows) => {
      if (alive) setRecent(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Recent accepted solves — own submission history, newest first.
  useEffect(() => {
    let alive = true;
    auth
      .mySubmissions(1, 10)
      .then((data) => {
        if (!alive) return;
        const solves = (data?.items ?? [])
          .filter((s) => s?.status === "accepted" && s?.challengeSlug)
          .slice(0, 5);
        setActivity(solves);
        setActivityState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setActivityState("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Daily challenge — one canonical pick per UTC day (GET /daily-challenge).
  // Solves go through the normal submit flow, so no bonus handling here.
  useEffect(() => {
    let alive = true;
    auth
      .getDailyChallenge()
      .then((data) => {
        if (!alive) return;
        setDaily(data);
        setDailyState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setDailyState("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const streak = stats?.currentStreak ?? 0;
  const checklist = [
    { done: true, label: "Create your account" },
    {
      done: !!user?.onboardingCompleted,
      label: "Finish onboarding",
      href: "/onboarding",
    },
    { done: !!user?.avatarUrl, label: "Add an avatar", href: "/settings" },
    {
      done: (stats?.preferredLanguages?.length ?? 0) > 0,
      label: "Pick your focus",
      href: "/settings",
    },
    { done: (stats?.solvedCount ?? 0) > 0, label: "Solve your first challenge", href: "/challenges" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  // Onboarding done → the setup checklist has served its purpose.
  const showGettingStarted = !user?.onboardingCompleted;
  const rating = stats?.rating ?? 1000;
  const xp = stats?.xp ?? 0;
  const prog = rankProgress(rating);

  return (
    <div data-open={mounted} className="t-panel-slide Nox-auth-enter">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="Nox-display text-[30px] leading-[1.1] font-medium tracking-[-1px] text-ink">
            {greeting()}, {user?.displayName ?? user?.username ?? "debugger"}.
          </h1>
          <p className="mt-2 text-[15px] tracking-[-0.15px] text-ink-muted">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {" · "}Here&apos;s where you stand.
          </p>
        </div>
        <span
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-pill px-[15px] py-2 text-[14px] font-medium ${
            streak > 0 ? "bg-surface-1 text-ink" : "bg-surface-1 text-ink-muted"
          }`}
          role="status"
          aria-label={streak > 0 ? `${streak} day streak` : "No streak yet"}
        >
          <Flame
            size={16}
            aria-hidden="true"
            className={streak > 0 ? "text-gradient-orange" : ""}
          />
          {streak > 0 ? `${streak}-day streak` : "Start your streak"}
        </span>
      </div>  

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Rating"
          value={rating}
          meta={`Rank ${rankFor(rating)}`}
        />
        <StatCard
          icon={Zap}
          label="XP"
          value={xp}
          meta={`Level ${stats?.level ?? 1}`}
          foot={<LevelProgress xp={xp} />}
        />
        <StatCard
          icon={CheckCircle2}
          label="Solved"
          value={stats?.solvedCount ?? 0}
          meta={
            (stats?.submissionCount ?? stats?.attemptCount ?? 0) > 0 &&
            stats?.successRate != null
              ? `${Math.round(stats.successRate * 100)}% success`
              : "Accept your first fix"
          }
        />
        <StatCard
          icon={Flame}
          label="Day streak"
          value={streak}
          meta={
            (stats?.longestStreak ?? 0) > 0
              ? `Best ${stats.longestStreak} day${stats.longestStreak === 1 ? "" : "s"}`
              : "Solve daily to start one"
          }
        />
      </div>

      {/* Main column + leaderboard rail */}
      <div className="mt-2 grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-2">
      {/* Recently viewed — local IDB lookup, renders instantly */}
      {recent.length > 0 ? (
        <section aria-label="Recently viewed" className="rounded-xl bg-surface-1 p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.15px] text-ink">
            <History size={15} aria-hidden="true" className="text-ink-muted" />
            Pick up where you left off
          </h2>
          <div className="mt-3 flex flex-col">
            {recent.map((r) => (
              <Link
                key={r.slug}
                href={`/challenges/${r.slug}`}
                className={`Nox-focus group flex items-center gap-3 rounded-md px-1 py-2.5 text-[14px] font-medium text-ink no-underline hover:bg-surface-2 ${HOVER}`}
              >
                <span className="truncate">{r.title}</span>
                <ChevronRight
                  size={15}
                  aria-hidden="true"
                  className="ml-auto shrink-0 text-ink-muted transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Checklist + daily spotlight */}
      <div className={`grid gap-2 ${showGettingStarted ? "lg:grid-cols-5" : ""}`}>
        {showGettingStarted ? (
        <section
          aria-label="Getting started"
          className="rounded-xl bg-surface-1 p-5 lg:col-span-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
              Getting started
            </h2>
            <span className="Nox-mono text-[12px] text-ink-muted">
              {doneCount}/{checklist.length}
            </span>
          </div>
          <div
            className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={checklist.length}
            aria-label="Setup progress"
          >
            <div
              className="h-full rounded-full bg-success"
              style={{
                width: `${(doneCount / checklist.length) * 100}%`,
                transition: "width var(--duration-fast) var(--ease-smooth-out)",
              }}
            />
          </div>
          <ul className="mt-2 flex flex-col">
            {checklist.map((item) => (
              <li key={item.label}>
                {item.done || !item.href || item.soon ? (
                  <span
                    className={`flex items-center gap-3 rounded-md px-1 py-2.5 text-[14px] ${
                      item.done ? "text-ink-muted" : "text-ink-muted"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        item.done ? "bg-success/15 text-success" : "bg-surface-2 text-ink-muted"
                      }`}
                    >
                      {item.done ? (
                        <Check size={12} strokeWidth={3} />
                      ) : item.soon ? (
                        <Lock size={11} strokeWidth={2.5} />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className={item.done ? "line-through opacity-70" : ""}>
                      {item.label}
                    </span>
                    {item.soon && !item.done ? (
                      <span className="ml-auto rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                        Soon
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={`Nox-focus group flex items-center gap-3 rounded-md px-1 py-2.5 text-[14px] font-medium text-ink no-underline hover:bg-surface-2 ${HOVER}`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted transition-colors duration-[var(--duration-fast)] group-hover:bg-accent-blue group-hover:text-black"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                    {item.label}
                    <ChevronRight
                      size={15}
                      aria-hidden="true"
                      className="ml-auto text-ink-muted transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-ink"
                    />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
        ) : null}

        {/* The one atmospheric card on this page (DESIGN.md: scarce by design). */}
        <section
          aria-label="Daily challenge"
          className={`flex flex-col justify-between overflow-hidden rounded-xl bg-gradient-violet p-5 text-white ${showGettingStarted ? "lg:col-span-2" : ""}`}
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.08em] opacity-80">
              DAILY DEBUG{daily?.date ? ` · ${daily.date}` : ""}
            </p>
            {dailyState === "loading" ? (
              <div className="mt-2 animate-pulse" aria-label="Loading today's challenge">
                <div className="h-7 w-3/4 rounded-md bg-white/20" />
                <div className="mt-2 h-4 w-full rounded bg-white/15" />
                <div className="mt-1 h-4 w-2/3 rounded bg-white/15" />
              </div>
            ) : dailyState === "ready" && daily?.challenge ? (
              <>
                <h2 className="Nox-display mt-2 line-clamp-2 text-[24px] leading-[1.1] font-medium tracking-[-0.5px]">
                  {daily.challenge.title}
                </h2>
                <p className="mt-2 text-[14px] leading-[1.45] opacity-85">
                  {daily.challenge.solved ? (
                    <>Solved — nice. Review the fix or browse the catalog.</>
                  ) : (
                    <>One buggy codebase. Hidden tests. Fresh every day.</>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {daily.challenge.solved ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-white/20 px-2.5 py-1 text-[12px] font-medium">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                      Completed
                    </span>
                  ) : null}
                  <span className="rounded-pill bg-white/15 px-2.5 py-1 text-[12px] font-medium capitalize">
                    {daily.challenge.difficulty}
                  </span>
                  <span className="rounded-pill bg-white/15 px-2.5 py-1 text-[12px] font-medium capitalize">
                    {daily.challenge.language}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="Nox-display mt-2 text-[24px] leading-[1.1] font-medium tracking-[-0.5px]">
                  Today&apos;s broken code drops soon.
                </h2>
                <p className="mt-2 text-[14px] leading-[1.45] opacity-85">
                  One buggy codebase. Hidden tests. Beat the clock — fresh every day.
                </p>
              </>
            )}
          </div>
          {dailyState === "ready" && daily?.challenge ? (
            <Link
              href={`/challenges/${daily.challenge.slug}`}
              className={`Nox-focus mt-6 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-pill bg-white px-5 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER} ${PRESS}`}
            >
              {daily.challenge.solved ? "Review today's fix" : "Fix today's bug"}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : dailyState === "loading" ? (
            <span
              aria-hidden="true"
              className="mt-6 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-pill bg-white/15 px-5 py-[10px] text-[14px] font-medium opacity-70"
            >
              Finding today&apos;s bug…
            </span>
          ) : (
            <Link
              href="/challenges"
              className={`Nox-focus mt-6 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-pill bg-white px-5 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER} ${PRESS}`}
            >
              Browse challenges
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
        </section>
      </div>

      {/* Activity */}
      <section aria-label="Recent activity" className="rounded-xl bg-surface-1 p-5">
        <h2 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
          Recent activity
        </h2>
        {activityState === "loading" ? (
          <div className="mt-3 animate-pulse" aria-label="Loading recent activity">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-2.5">
                <div className="h-6 w-6 shrink-0 rounded-full bg-surface-2" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-2/3 rounded bg-surface-2" />
                  <div className="mt-1.5 h-3 w-1/3 rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        ) : activityState === "error" ? (
          <p className="mt-2 text-[14px] leading-[1.45] text-ink-muted">
            Couldn&apos;t load activity right now.
          </p>
        ) : activity.length === 0 ? (
          <div className="mt-2">
            <p className="text-[14px] leading-[1.45] text-ink-muted">
              No solves yet — accept a challenge and it will show up here.
            </p>
            <Link
              href="/challenges"
              className={`Nox-focus group mt-1 inline-flex items-center gap-1 text-[14px] font-medium text-accent-blue no-underline hover:underline`}
            >
              Browse challenges
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        ) : (
          <ul className="mt-1 flex flex-col">
            {activity.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/challenges/${s.challengeSlug}`}
                  className={`Nox-focus group flex items-center gap-3 rounded-md px-1 py-2.5 no-underline hover:bg-surface-2 ${HOVER}`}
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
                      {timeAgo(s.completedAt ?? s.createdAt)}
                      {` · +${s.xpAwarded ?? 0} XP · +${s.ratingDelta ?? 0}`}
                    </span>
                  </span>
                  {s.score != null ? (
                    <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                      {s.score}
                    </span>
                  ) : null}
                  <ChevronRight
                    size={15}
                    aria-hidden="true"
                    className="shrink-0 text-ink-muted transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
        </div>

        {/* Right rail — rank progress + mini leaderboard */}
        <aside className="flex min-w-0 flex-col gap-2 xl:sticky xl:top-6">
          <section aria-label="Your rank" className="rounded-xl bg-surface-1 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
                Your rank
              </h2>
              <RankBadge rank={prog.current} />
            </div>
            <p className="Nox-mono mt-3 text-[13px] text-ink-muted" role="status">
              {prog.next ? (
                <>
                  <span className="font-medium text-ink">{prog.remaining}</span> rating
                  to {prog.next} ({prog.nextMin}+)
                </>
              ) : (
                <>Top rank — Grandmaster. Defend it.</>
              )}
            </p>
            <span
              className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={prog.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress to ${prog.next ?? "max rank"}`}
            >
              <span
                className="block h-full rounded-full bg-success"
                style={{ width: `${prog.pct}%` }}
              />
            </span>
          </section>
          <LeaderboardMini username={user?.username ?? null} />
        </aside>
      </div>
    </div>
  );
}
