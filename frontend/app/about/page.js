import Link from "next/link";

export const metadata = {
  title: "About — Nox",
  description:
    "Nox is a developer practice and competitive platform focused on real-world debugging. Find the bug. Fix the code. Prove the fix.",
};

const LOOP = [
  {
    num: "01",
    title: "Discover a broken build",
    body: "Pick a challenge by language, category, and difficulty. Every challenge ships with real starter code — not a blank file.",
  },
  {
    num: "02",
    title: "Read the failure",
    body: "Inspect the implementation, run the visible tests, and trace the root cause from actual output — the way on-call work feels.",
  },
  {
    num: "03",
    title: "Fix and iterate",
    body: "Edit in Monaco, re-run tests instantly, and watch failures turn green. Reset to starter code any time without penalty.",
  },
  {
    num: "04",
    title: "Submit and prove it",
    body: "Hidden tests judge the fix. Pass them all to earn score, XP, and rating — correctness first, always.",
  },
];

const AUDIENCE = [
  {
    title: "Students & beginners",
    body: "Learn debugging as a skill — not just algorithms. Read existing code, understand failures, and build confidence fixing real mistakes.",
  },
  {
    title: "Junior developers",
    body: "Get realistic reps with bugs, failing tests, APIs, and implementation mistakes before production teaches them the hard way.",
  },
  {
    title: "Intermediate developers",
    body: "Take on harder debugging: performance, security, concurrency, and production-style scenarios that stay sharp with practice.",
  },
];

const PRINCIPLES = [
  {
    num: "01",
    title: "Correctness first",
    body: "A submission that does not satisfy all required hidden tests is not accepted — however high the score. Hidden tests are the source of truth.",
  },
  {
    num: "02",
    title: "Rating ≠ XP",
    body: "Rating measures competitive debugging skill (Elo-like, from 1000). XP measures momentum — solves, streaks, daily challenges. One never substitutes for the other.",
  },
  {
    num: "03",
    title: "Evidence over claims",
    body: "Profiles, ranks, streaks, and leaderboards only move on verified solves. No partial credit, no inflated stats.",
  },
];

export default function AboutPage() {
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
            <Link
              href="/challenges"
              className="Nox-focus hidden rounded-pill bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] sm:inline-flex"
            >
              Explore Challenges
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-10">
          <p className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
            Company
          </p>
          <h1 className="Nox-display mt-3 text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
            Practice the skill developers use every day: debugging.
          </h1>
          <p className="mt-3 text-[18px] leading-[1.3] tracking-[-0.18px] text-ink-muted">
            Nox hands you intentionally broken code and asks you to do the
            everyday engineering job — understand it, find the root cause, fix
            it, and prove the fix with automated tests.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="Nox-focus inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] active:scale-[0.97]"
            >
              Start Noxing
            </Link>
            <Link
              href="/challenges"
              className="Nox-focus inline-flex min-h-[44px] items-center justify-center rounded-pill bg-surface-1 px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:bg-surface-2 active:scale-[0.97]"
            >
              Explore Challenges
            </Link>
          </div>
        </div>

        {/* What is Nox */}
        <section className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
          <div className="flex items-baseline gap-3">
            <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
              01
            </span>
            <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
              What is Nox?
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
              Most coding platforms test greenfield problem solving: write a
              solution from scratch against a blank file. Developers rarely
              work that way. They enter existing codebases, understand what is
              wrong, fix it, and validate the result.
            </p>
            <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
              Nox is built around that loop: discover a challenge, read broken
              code, understand the failure, edit, run tests, iterate, submit
              for hidden-test judging, and build a profile around what you can
              actually debug.
            </p>
          </div>
          <div className="mt-5 rounded-md bg-canvas px-4 py-3">
            <p className="Nox-mono text-[13px] leading-[1.6] text-ink-muted">
              Find the bug. Fix the code. Prove the fix.
            </p>
          </div>
        </section>

        {/* How it works */}
        <div className="mt-10">
          <h2 className="Nox-display text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
            How Nox works
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {LOOP.map((s) => (
              <section
                key={s.num}
                className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                    {s.num}
                  </span>
                  <h3 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-3 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </div>

        {/* Principles */}
        <div className="mt-10">
          <h2 className="Nox-display text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
            What we optimize for
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {PRINCIPLES.map((p) => (
              <section
                key={p.num}
                className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                    {p.num}
                  </span>
                  <h3 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                    {p.title}
                  </h3>
                </div>
                <p className="mt-3 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                  {p.body}
                </p>
              </section>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div className="mt-10">
          <h2 className="Nox-display text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
            Who Nox is for
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {AUDIENCE.map((a) => (
              <section
                key={a.title}
                className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6"
              >
                <h3 className="text-[16px] font-medium tracking-[-0.16px] text-ink">
                  {a.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                  {a.body}
                </p>
              </section>
            ))}
          </div>
        </div>

        {/* Languages */}
        <section className="Nox-card mt-10 rounded-xl border border-hairline-soft bg-surface-1 p-6">
          <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
            Languages today, more tomorrow
          </h2>
          <p className="mt-2 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
            JavaScript and Python run today; TypeScript metadata is present
            with execution on the way. Language execution is modular — new
            runtimes arrive without rewriting the platform.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["JavaScript", "Python", "TypeScript"].map((l) => (
              <span
                key={l}
                className="Nox-mono rounded-pill bg-surface-2 px-3 py-1.5 text-[12px] text-ink"
              >
                {l}
              </span>
            ))}
            {["Go", "Rust", "Java", "C++"].map((l) => (
              <span
                key={l}
                className="Nox-mono rounded-pill border border-hairline-soft px-3 py-1.5 text-[12px] text-ink-muted"
              >
                {l}
              </span>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-3 text-[13px] tracking-[-0.13px] text-ink-muted">
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
            href="/status"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Status
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
