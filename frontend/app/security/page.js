import Link from "next/link";

export const metadata = {
  title: "Security — Nox",
  description:
    "How Nox protects accounts, isolates untrusted code execution, preserves challenge integrity, and handles vulnerability reports.",
};

const APP_SECURITY = [
  "Secure HTTP-only sessions with short-lived signed cookie cache, 7-day DB sessions, and logout that clears everywhere.",
  "Email verification enforced on signup, password reset over emailed links, domain allowlist and per-IP rate limits on auth.",
  "Role-based access control (USER / MODERATOR / ADMIN / FOUNDER) enforced on the API — never only in the frontend.",
  "Input validation, output encoding, secure headers, and least-privilege secrets handling.",
];

const EXEC_SECURITY = [
  "Never executes user code inside the Next.js app, API process, or database environment.",
  "Workers run in separate processes with throwaway temp directories, wall-clock timeouts, and output caps.",
  "Stripped environment — no app secrets reach the runner. Network disabled by default.",
  "Queue-level concurrency limits plus per-minute run/submit quotas to contain abuse and cost.",
];

const INTEGRITY = [
  "Hidden tests never leave the server except on admin routes; submissions store only pass/fail per hidden test.",
  "Submissions are immutable and lock the judged challenge version, so later edits cannot rewrite history.",
  "Solved-only solution visibility (403 until you pass) protects challenge integrity.",
  "Rate-limited runs and submissions plus version locking blunt hardcoding and brute-force probing.",
];

export default function SecurityPage() {
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
              href="/status"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Status
            </Link>
            <Link
              href="/contact"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Contact
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
            Security
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
            Nox intentionally executes untrusted code, so security is a core
            product requirement — not a follow-up. This page summarizes how
            the platform is protected today and how to report issues.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface-1 px-3 py-1.5 text-[12px] text-ink-muted">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-success"
            />
            Isolated execution · Hidden tests server-side · RBAC on the API
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <section className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
            <div className="flex items-baseline gap-3">
              <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                01
              </span>
              <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                Application security
              </h2>
            </div>
            <ul className="mt-4 space-y-2">
              {APP_SECURITY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-md border border-hairline-soft bg-canvas px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 8.5L7 10.5L11 6.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
            <div className="flex items-baseline gap-3">
              <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                02
              </span>
              <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                Execution security
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                User code never runs in the web or API tier. A MongoDB-backed
                queue hands jobs to separate worker processes, which execute
                JavaScript and Python in throwaway directories today —
                container isolation is the hardening milestone on the roadmap.
              </p>
            </div>
            <ul className="mt-4 space-y-2">
              {EXEC_SECURITY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-md border border-hairline-soft bg-canvas px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 8.5L7 10.5L11 6.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
            <div className="flex items-baseline gap-3">
              <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                03
              </span>
              <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                Challenge integrity
              </h2>
            </div>
            <ul className="mt-4 space-y-2">
              {INTEGRITY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-md border border-hairline-soft bg-canvas px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 8.5L7 10.5L11 6.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
            <div className="flex items-baseline gap-3">
              <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                04
              </span>
              <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                Responsible disclosure
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                Found a vulnerability? Email{" "}
                <Link
                  href="mailto:security@nox.synax.me"
                  className="Nox-focus underline text-accent-blue hover:text-white"
                >
                  security@nox.synax.me
                </Link>{" "}
                with steps to reproduce, impact, and any logs. We triage
                security reports first and will keep you updated as we fix.
              </p>
              <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                Please limit testing to your own account, avoid degrading the
                service for others, and do not exfiltrate other users&apos;
                data beyond what is needed to demonstrate the issue. Do not
                probe the execution sandbox for escape beyond a safe proof of
                concept.
              </p>
            </div>
            <div className="mt-4 rounded-md bg-canvas px-4 py-3">
              <p className="Nox-mono text-[13px] leading-[1.6] text-ink-muted">
                Scope: Nox.synax.me web app, API, workers, and execution
                sandbox. Out of scope: third-party providers and social
                engineering.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 text-[13px] tracking-[-0.13px] text-ink-muted">
          <Link
            href="/contact"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Contact
          </Link>
          <Link
            href="/status"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Status
          </Link>
          <Link
            href="/privacy"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Privacy Policy
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
