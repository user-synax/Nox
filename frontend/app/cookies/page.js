import Link from "next/link";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const COOKIE_GROUPS = [
  {
    name: "Strictly Necessary",
    essential: true,
    description:
      "These cookies are required for the Platform to work. They keep you signed in and remember security preferences. You cannot disable them.",
    examples: [
      { name: "Session auth", purpose: "Keeps your authenticated session active" },
      { name: "CSRF token", purpose: "Protects form submissions from cross-site attacks" },
      { name: "Consent preference", purpose: "Remembers your cookie choices" },
    ],
    lifetime: "Until you sign out or clear your browser data",
  },
  {
    name: "Functional",
    essential: false,
    description:
      "These cookies remember choices you make so the Platform feels consistent across visits, such as language or display settings.",
    examples: [
      { name: "UI preferences", purpose: "Remembers your chosen theme or layout" },
      {
        name: "Accessibility",
        purpose: "Remembers accessibility settings such as reduced motion",
      },
    ],
    lifetime: "Up to 12 months, unless you clear them sooner",
  },
  {
    name: "Analytics",
    essential: false,
    description:
      "These cookies help us understand how the Platform is used so we can improve it. They do not identify you personally.",
    examples: [
      { name: "Page views", purpose: "Counts visits and page interactions" },
      { name: "Feature usage", purpose: "Tracks which features are used most" },
      { name: "Error reporting", purpose: "Helps us detect and fix technical problems" },
    ],
    lifetime: "13 months maximum",
  },
  {
    name: "Performance",
    essential: false,
    description:
      "These cookies collect information about how the Platform performs, such as load times and response status, to keep the experience fast.",
    examples: [
      { name: "Response timing", purpose: "Measures how quickly pages and runs respond" },
      { name: "Resource usage", purpose: "Tracks server-side load for capacity planning" },
    ],
    lifetime: "30 days",
  },
];

const HOW_TO_CONTROL = [
  {
    title: "Browser settings",
    body: [
      "Most browsers let you view, block, or delete cookies through their settings. You can usually find these under Privacy or Security in your browser preferences.",
      "Blocking all cookies may break features that require a signed-in session.",
    ],
  },
  {
    title: "Consent choices",
    body: [
      "When you first visit the Platform, you can choose which non-essential cookies you allow. We remember this choice with a consent cookie.",
      "You can revisit your choices by using the cookie settings link in the Platform footer.",
    ],
  },
  {
    title: "Opting out",
    body: [
      "You can opt out of non-essential cookies at any time. Doing so will not affect strictly necessary cookies.",
      "Opting out may reduce our ability to improve the Platform based on usage patterns.",
    ],
  },
];

const FAQ = [
  {
    q: "What is a cookie?",
    a: "A cookie is a small text file a website stores on your device so it can recognize your browser on return visits. Cookies can be session-based (cleared when you close the browser) or persistent (kept for a set period).",
  },
  {
    q: "Does Nox use other tracking technologies?",
    a: "We use cookies as described here. We may also use similar technologies such as local storage for client-side state. These serve the same general purposes as cookies and are covered by this policy.",
  },
  {
    q: "Do cookies identify me personally?",
    a: "Strictly necessary session cookies are linked to your account while you are signed in. Analytics cookies are designed to be aggregated and anonymized so they do not identify individuals.",
  },
  {
    q: "Why can't I disable strictly necessary cookies?",
    a: "These cookies are required for the Platform to function: signing in, protecting submissions, and keeping your session secure. Without them, the Platform cannot provide the core experience.",
  },
  {
    q: "How long do cookies last?",
    a: "Session cookies last until you sign out or close the browser. Persistent cookies last for the period shown for each group, up to a maximum of 13 months for analytics cookies.",
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
      {/* Top nav — same wordmark pattern as marketing site */}
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
              href="/terms"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Privacy
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-10">
          <p className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
            Legal
          </p>
          <h1 className="Nox-display mt-3 text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
            Cookie Policy
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
            Last updated: September 2026
          </p>
        </div>

        {/* Intro */}
        <div className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
          <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
            This Cookie Policy explains how Nox uses cookies and similar
            technologies on the Platform. It works together with our Privacy
            Policy. If you have questions, contact us at{" "}
            <Link
              href="mailto:privacy@nox.dev"
              className="Nox-focus underline text-accent-blue hover:text-white"
            >
              privacy@nox.dev
            </Link>
            .
          </p>
        </div>

        {/* Cookie groups */}
        <div className="mt-10 flex flex-col gap-8">
          <h2 className="Nox-display text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
            The cookies we use
          </h2>

          {COOKIE_GROUPS.map((group) => (
            <div
              key={group.name}
              className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                      {group.name}
                    </h3>
                    {group.essential && (
                      <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-[12px] font-medium tracking-[-0.12px] text-success">
                        Essential
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
                    {group.description}
                  </p>
                </div>
              </div>

              {group.examples.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {group.examples.map((example) => (
                    <li
                      key={example.name}
                      className="flex items-start gap-3 rounded-md border border-hairline-soft bg-canvas px-4 py-3"
                    >
                      <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-hairline bg-canvas flex items-center justify-center">
                        {group.essential ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M5 8.5L7 10.5L11 6.5"
                              stroke="var(--color-success)"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="Nox-mono text-[11px] text-ink-muted">i</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium tracking-[-0.14px] text-ink">
                          {example.name}
                        </p>
                        <p className="Nox-mono truncate text-[13px] text-ink-muted">
                          {example.purpose}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center gap-2 text-[13px] tracking-[-0.13px] text-ink-muted">
                <span className="Nox-mono rounded-sm border border-hairline bg-canvas px-2 py-1 text-[12px]">
                  Lifetime
                </span>
                <span>{group.lifetime}</span>
              </div>
            </div>
          ))}
        </div>

        {/* How to control */}
        <div className="mt-12">
          <h2 className="Nox-display text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
            How to control cookies
          </h2>
          <div className="mt-8 flex flex-col gap-6">
            {HOW_TO_CONTROL.map((item) => (
              <div
                key={item.title}
                className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6"
              >
                <h3 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                  {item.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {item.body.map((paragraph, i) => (
                    <li key={i}>
                      <p className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                        {paragraph}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="Nox-display text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
            Common questions
          </h2>
          <div className="mt-8 flex flex-col gap-4">
            {FAQ.map((item) => (
              <div key={item.q} className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
                <h3 className="text-[16px] font-medium tracking-[-0.16px] text-ink">
                  {item.q}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 text-[13px] tracking-[-0.13px] text-ink-muted">
          <Link
            href="/terms"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Terms of Service
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
