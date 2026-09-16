import Link from "next/link";

export const metadata = {
  title: "Contact — Nox",
  description:
    "Contact the Nox team for support, security reports, privacy requests, and general questions.",
};

const CHANNELS = [
  {
    name: "General",
    email: "hello@nox.synax.me",
    href: "mailto:hello@nox.synax.me",
    description:
      "Questions about Nox, feedback on challenges, partnerships, and anything that does not fit below.",
    response: "Replies within a few business days",
  },
  {
    name: "Support",
    email: "support@nox.synax.me",
    href: "mailto:support@nox.synax.me",
    description:
      "Account access, stuck submissions, scoring or rating questions, and bug reports for the platform itself.",
    response: "Fastest for account and solving issues",
  },
  {
    name: "Security",
    email: "security@nox.synax.me",
    href: "mailto:security@nox.synax.me",
    description:
      "Vulnerability reports and abuse of the execution environment. Please include steps to reproduce — see our Security page first.",
    response: "Triaged first, acknowledged promptly",
  },
  {
    name: "Privacy & Legal",
    email: "privacy@nox.synax.me",
    href: "mailto:privacy@nox.synax.me",
    description:
      "Data access, correction, or deletion requests, plus questions about the Privacy Policy and Terms.",
    response: "Handled under our Privacy Policy",
  },
];

export default function ContactPage() {
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
              href="/about"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              About
            </Link>
            <Link
              href="/status"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Status
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
            Contact
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
            Email is the fastest way to reach us. Pick the channel that fits —
            we route everything else from there. Before reporting an outage,
            check the{" "}
            <Link
              href="/status"
              className="Nox-focus underline text-accent-blue hover:text-white"
            >
              Status
            </Link>{" "}
            page.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {CHANNELS.map((c, i) => (
            <section
              key={c.name}
              className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                  {c.name}
                </h2>
              </div>
              <p className="mt-3 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                {c.description}
              </p>
              <div className="mt-4 flex flex-col gap-3 rounded-md border border-hairline-soft bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href={c.href}
                  className="Nox-focus Nox-mono rounded-sm text-[14px] text-accent-blue underline hover:text-white"
                >
                  {c.email}
                </Link>
                <span className="text-[13px] tracking-[-0.13px] text-ink-muted">
                  {c.response}
                </span>
              </div>
            </section>
          ))}
        </div>

        {/* What to include */}
        <section className="Nox-card mt-8 rounded-xl border border-hairline-soft bg-surface-1 p-6">
          <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
            What to include
          </h2>
          <ul className="mt-4 space-y-3">
            {[
              "Your username and the page or challenge slug where the issue happened.",
              "What you expected vs. what you saw — paste the exact error text, not a screenshot alone.",
              "For submission problems: the submission or run ID from the URL or result panel.",
              "For security reports: steps to reproduce, impact, and any logs. Please do not exploit beyond proof of concept.",
            ].map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-3 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-surface-2"
                  style={{ background: "var(--color-ink-muted)" }}
                />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <div className="Nox-card mt-8 rounded-xl border border-hairline-soft bg-surface-1 p-6">
          <h2 className="text-[16px] font-medium tracking-[-0.16px] text-ink">
            Prefer self-serve?
          </h2>
          <p className="mt-2 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
            Account settings live under{" "}
            <Link
              href="/settings"
              className="Nox-focus underline text-accent-blue hover:text-white"
            >
              Settings
            </Link>
            , challenge help is on each challenge page, and platform health is
            on{" "}
            <Link
              href="/status"
              className="Nox-focus underline text-accent-blue hover:text-white"
            >
              Status
            </Link>
            .
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 text-[13px] tracking-[-0.13px] text-ink-muted">
          <Link
            href="/about"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            About
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
