import Link from "next/link";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const SECTIONS = [
  {
    num: "01",
    title: "Introduction",
    body: [
      "This Privacy Policy explains how Nox (\"we,\" \"us,\" or \"our\") collects, uses, and shares information about you when you use the Nox Platform (the \"Platform\").",
      "We built Nox for one reason: to help developers practice real debugging in a safe, judged environment. We collect only what we need to make that work, keep it secure, and do not sell it.",
      "This policy applies to the Platform and any related services we offer. By using the Platform, you consent to the practices described here.",
    ],
  },
  {
    num: "02",
    title: "Information We Collect",
    body: [
      "We collect information in three main categories: information you give us, information we collect automatically, and information from third parties.",
      "Information you give us includes your name, email address, username, and any profile details you choose to add. If you submit solutions or publish explanations, we store those as part of your account.",
      "Information we collect automatically includes usage data such as which challenges you view and attempt, submission timestamps, test pass rates, ratings, and XP. We also collect device and browser information, IP address, and log data for security and debugging.",
      "Information from third parties may include authentication details when you sign in through an external provider such as Google, subject to that provider's permissions.",
    ],
  },
  {
    num: "03",
    title: "How We Use Your Information",
    body: [
      "We use your information to operate the Platform: let you sign in, track your progress, score submissions, calculate ratings and XP, and show you your own profile.",
      "We use it to improve the Platform: understand which challenges are effective, detect abuse, debug problems, and measure performance.",
      "We use it to communicate with you: send account notifications, security alerts, and occasional product updates you have opted into.",
      "We do not use your information to sell you ads from third parties.",
    ],
  },
  {
    num: "04",
    title: "Sharing Your Information",
    body: [
      "We do not sell your personal information. We share information only in limited, necessary circumstances.",
      "We share profile information you choose to make public, such as your username, rating, rank, and solved-count, with other users of the Platform.",
      "We share information with service providers who help us run the Platform, under contracts that restrict how they can use it.",
      "We may share information to comply with law, respond to valid legal process, protect the Platform and its users, or enforce our Terms.",
      "Aggregated or anonymized data, such as leaderboard rankings and public challenge statistics, may be shown publicly, but it is not linked back to identifiable individuals unless you have chosen to make that information public.",
    ],
  },
  {
    num: "05",
    title: "Cookies and Similar Technologies",
    body: [
      "We use cookies and similar technologies to keep you signed in, remember preferences, and understand how the Platform is used.",
      "Authentication cookies keep your session active so you do not have to log in repeatedly. These are necessary for normal use of the Platform.",
      "Analytics and performance cookies help us understand usage patterns without identifying you personally.",
      "You can control cookie behavior through the settings in your browser or through our Cookie Policy.",
      "Blocking certain cookies may limit your ability to use some features of the Platform.",
    ],
  },
  {
    num: "06",
    title: "Data Retention",
    body: [
      "We keep your account information as long as your account is active, or as needed to provide the Platform and comply with law.",
      "Activity history such as solved challenges, ratings, and XP is kept as part of your account so your progress is preserved.",
      "If you delete your account, we remove or de-identify your personal information within a reasonable period, except where we are required to retain it for legal or security reasons.",
      "Backup systems may retain copies of data for a limited time even after deletion requests.",
    ],
  },
  {
    num: "07",
    title: "Data Security",
    body: [
      "We use reasonable technical and organizational measures to protect your information, including encryption in transit, access controls, and monitoring for suspicious activity.",
      "No system is perfectly secure. If we learn of a breach that affects your information, we will take reasonable steps to investigate, contain, and notify affected users where required by law.",
      "Code execution happens in isolated environments. We do not expose other users' submissions or internal systems to the code you run.",
    ],
  },
  {
    num: "08",
    title: "Your Rights",
    body: [
      "Depending on where you are and what data we hold, you may have the right to access the personal information we hold about you, correct inaccuracies, request deletion, or restrict our processing.",
      "You may also have the right to data portability for information you provided to us.",
      "To exercise these rights, contact us at privacy@nox.dev. We will respond within a reasonable time and may need to verify your identity before acting.",
      "You can export or delete your account from the Platform settings where the feature is available.",
    ],
  },
  {
    num: "09",
    title: "Children",
    body: [
      "The Platform is not directed at children. We do not knowingly collect information from children under the age of 16 without parental consent.",
      "If we learn we have collected information from a child without the required consent, we will take steps to delete it.",
    ],
  },
  {
    num: "10",
    title: "International Transfers",
    body: [
      "Your information may be transferred to and processed in countries other than your own, including where our servers or service providers are located.",
      "We take steps to ensure such transfers are handled in accordance with applicable data protection requirements.",
    ],
  },
  {
    num: "11",
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy to reflect changes to the Platform, legal requirements, or our practices.",
      "Material changes will be communicated through an in-app notice or email where reasonably possible. The date of the latest revision is shown at the bottom of this page.",
    ],
  },
  {
    num: "12",
    title: "Contact",
    body: [
      "If you have questions or concerns about this Privacy Policy, contact us at privacy@nox.dev.",
      "We aim to respond to legitimate privacy inquiries within a few business days.",
    ],
  },
];

export default function PrivacyPage() {
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
              href="/cookies"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Cookies
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
            Last updated: September 2026
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <section key={section.num} className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-6">
              <div className="flex items-baseline gap-3">
                <span className="Nox-mono shrink-0 text-[13px] text-ink-muted">
                  {section.num}
                </span>
                <h2 className="Nox-display text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                  {section.title}
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-[15px] leading-[1.6] tracking-[-0.15px] text-ink-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 text-[13px] tracking-[-0.13px] text-ink-muted">
          <Link
            href="/terms"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/cookies"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Cookie Policy
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
