"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "../../lib/auth";

const COMPONENTS = [
  { key: "web", name: "Web", note: "Marketing site, catalog, and workspace" },
  { key: "api", name: "API", note: "Auth, challenges, submissions, boards" },
  {
    key: "queue",
    name: "Execution queue",
    note: "Queued and running run/submit jobs",
  },
  {
    key: "workers",
    name: "Workers",
    note: "Separate runner processes with heartbeats",
  },
];

function Dot({ ok }) {
  return (
    <span
      aria-hidden="true"
      className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-success" : "bg-danger"}`}
    />
  );
}

export default function StatusPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setError(null);
      setCheckedAt(new Date());
    } catch (e) {
      setError(e?.message ?? "Unreachable");
      setCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [check]);

  const ok = !error && health?.ok !== false;
  const queued = health?.queue?.queued;
  const running = health?.queue?.running;
  const workersOnline = health?.workersOnline;

  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
      {/* Top nav — same wordmark pattern as legal pages */}
      <header className="sticky top-0 z-50 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1199px] items-center justify-between px-5 sm:px-[30px]">
          <Link
            href="/"
            aria-label="Nox home"
            className="Nox-focus flex items-center gap-2.5 rounded-full"
          >
            <span className="block h-10 w-10 overflow-hidden rounded-full bg-transparent">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                className="h-10 w-10"
                aria-hidden="true"
              >
                <rect
                  x="6"
                  y="6"
                  width="36"
                  height="36"
                  rx="10"
                  fill="currentColor"
                  className="text-ink"
                />
                <path
                  d="M16 18h16M16 24h12M16 30h8"
                  stroke="var(--color-canvas)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="Nox-display text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink">
              Nox
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Contact
            </Link>
            <button
              type="button"
              onClick={check}
              className="Nox-focus cursor-pointer rounded-pill bg-surface-1 px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-ink transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:bg-surface-2"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-10">
          <p className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
            Company
          </p>
          <h1 className="Nox-display mt-3 text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
            Status
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
            Live operational status for Nox. This page polls the API health
            endpoint every 30 seconds.
          </p>
        </div>

        {/* Overall */}
        <section
          aria-live="polite"
          className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Dot ok={ok} />
              <h2 className="text-[16px] font-medium tracking-[-0.16px] text-ink">
                {ok ? "All systems nominal" : "Degraded — checking"}
              </h2>
            </div>
            <span className="Nox-mono shrink-0 text-[12px] text-ink-muted">
              {checkedAt
                ? checkedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "···"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ["Queued", queued ?? "—"],
              ["Running", running ?? "—"],
              ["Workers", workersOnline ?? "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="min-w-0 rounded-md bg-canvas px-2 py-3 text-center sm:px-3"
              >
                <dt className="truncate text-[12px] tracking-[-0.12px] text-ink-muted">
                  {k}
                </dt>
                <dd className="Nox-mono mt-1 truncate text-[15px] text-ink">
                  {String(v)}
                </dd>
              </div>
            ))}
          </div>
          {error ? (
            <p className="mt-4 rounded-md border border-hairline-soft bg-canvas px-4 py-3 text-[14px] leading-[1.5] tracking-[-0.14px] text-ink-muted">
              Could not reach the API ({error}). The marketing site is static
              and stays up; solving and submissions may be affected. Try again
              or email{" "}
              <Link
                href="mailto:support@nox.synax.me"
                className="Nox-focus underline text-accent-blue hover:text-white"
              >
                support@nox.synax.me
              </Link>
              .
            </p>
          ) : null}
        </section>

        {/* Components */}
        <div className="mt-8 flex flex-col gap-4">
          <h2 className="Nox-display text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
            Components
          </h2>
          {COMPONENTS.map((c) => (
            <section
              key={c.key}
              className="Nox-card flex items-center justify-between gap-4 rounded-xl border border-hairline-soft bg-surface-1 p-6"
            >
              <div className="min-w-0">
                <h3 className="text-[16px] font-medium tracking-[-0.16px] text-ink">
                  {c.name}
                </h3>
                <p className="mt-1 text-[14px] leading-[1.5] tracking-[-0.14px] text-ink-muted">
                  {c.note}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-surface-2 px-3 py-1.5 text-[12px] font-medium tracking-[-0.12px] text-ink">
                <Dot ok={ok} />
                {ok ? "Operational" : "Checking"}
              </span>
            </section>
          ))}
        </div>

        {/* History */}
        <section className="Nox-card mt-8 rounded-xl border border-hairline-soft bg-surface-1 p-6">
          <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
            Recent history
          </h2>
          <ul className="mt-4 space-y-2">
            {[
              ["September 2026", "Nox MVP in active development. No major incidents to report."],
              ["Execution", "Workers run in separate processes with temp-dir isolation; container hardening is on the roadmap."],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-md border border-hairline-soft bg-canvas px-4 py-3"
              >
                <p className="text-[14px] font-medium tracking-[-0.14px] text-ink">
                  {title}
                </p>
                <p className="mt-1 text-[14px] leading-[1.5] tracking-[-0.14px] text-ink-muted">
                  {body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] leading-[1.5] tracking-[-0.14px] text-ink-muted">
            Seeing something wrong? Email{" "}
            <Link
              href="mailto:support@nox.synax.me"
              className="Nox-focus underline text-accent-blue hover:text-white"
            >
              support@nox.synax.me
            </Link>{" "}
            with what you expected, what you saw, and any run or submission
            ID.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-3 text-[13px] tracking-[-0.13px] text-ink-muted">
          <Link
            href="/about"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Contact
          </Link>
          <Link
            href="/security"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Security
          </Link>
          <Link
            href="/"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Back to Nox
          </Link>
        </div>
      </main>
    </div>
  );
}
