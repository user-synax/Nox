"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Flame, Lock } from "lucide-react";
import { useAppSession } from "../../../components/SessionScope";
import { StatNumber } from "../../../components/Stat";

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

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-surface-1 px-4 py-4">
      <StatNumber
        value={value}
        className="block text-[26px] leading-none font-medium tracking-[-0.5px] text-ink"
      />
      <p className="mt-2 text-[13px] font-medium tracking-[-0.13px] text-ink">{label}</p>
      {sub ? <p className="mt-0.5 text-[12px] text-ink-muted">{sub}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAppSession();
  const [mounted, setMounted] = useState(false);
  const user = session?.user;
  const stats = session?.stats;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
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
        <StatCard label="Rating" value={stats?.rating ?? 1000} />
        <StatCard label="XP" value={stats?.xp ?? 0} sub={`Level ${stats?.level ?? 1}`} />
        <StatCard label="Solved" value={stats?.solvedCount ?? 0} />
        <StatCard label="Day streak" value={streak} />
      </div>

      {/* Checklist + daily spotlight */}
      <div className="mt-2 grid gap-2 pt-2 lg:grid-cols-5">
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

        {/* The one atmospheric card on this page (DESIGN.md: scarce by design). */}
        <section
          aria-label="Daily challenge"
          className="flex flex-col justify-between overflow-hidden rounded-xl bg-gradient-violet p-5 text-white lg:col-span-2"
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.08em] opacity-80">
              DAILY DEBUG
            </p>
            <h2 className="Nox-display mt-2 text-[24px] leading-[1.1] font-medium tracking-[-0.5px]">
              Today&apos;s broken code drops soon.
            </h2>
            <p className="mt-2 text-[14px] leading-[1.45] opacity-85">
              One buggy codebase. Hidden tests. Beat the clock — fresh every day.
            </p>
          </div>
          <span
            aria-disabled="true"
            className="mt-6 inline-flex min-h-[44px] w-fit cursor-not-allowed items-center gap-2 rounded-pill bg-white/15 px-5 py-[10px] text-[14px] font-medium opacity-90"
          >
            <Lock size={15} aria-hidden="true" />
            Coming soon
          </span>
        </section>
      </div>

      {/* Activity */}
      <section aria-label="Recent activity" className="mt-2 rounded-xl bg-surface-1 p-5">
        <h2 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
          Recent activity
        </h2>
        <p className="mt-2 text-[14px] leading-[1.45] text-ink-muted">
          No solves yet — your debugging history will live here once challenges go live.
        </p>
      </section>
    </div>
  );
}
