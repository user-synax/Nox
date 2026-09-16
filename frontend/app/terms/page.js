import Link from "next/link";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const SECTIONS = [
  {
    num: "01",
    title: "Acceptance of Terms",
    body: [
      "By accessing or using Nox (the \"Platform\"), you agree to be bound by these Terms and Conditions (\"Terms\"). If you do not agree to these Terms, do not use the Platform.",
      "The Platform is developed and operated by Nox. We reserve the right to modify these Terms at any time, and continued use of the Platform after changes constitutes acceptance of the modified Terms.",
    ],
  },
  {
    num: "02",
    title: "Account Registration",
    body: [
      "To access certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration.",
      "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must not share your account with others or transfer it without our written consent.",
      "If you discover any unauthorized use of your account, you must notify us immediately. We may suspend or terminate accounts that violate these Terms or are inactive for an extended period.",
    ],
  },
  {
    num: "03",
    title: "Challenge Participation",
    body: [
      "Challenges on the Platform are designed for practice and skill development. Each challenge presents intentionally broken code that you must identify, diagnose, and fix.",
      "You agree to attempt challenges honestly. Submitting solutions obtained from others, using prohibited tools during timed challenges, or attempting to bypass the testing infrastructure violates these Terms.",
      "Solutions and explanations you publish remain yours, but by publishing them on the Platform you grant us a license to display and distribute them as part of the Platform.",
      "We may disable, modify, or remove any challenge at any time. Completed challenge progress is preserved for your account.",
    ],
  },
  {
    num: "04",
    title: "User Conduct",
    body: [
      "You agree not to use the Platform to: submit code that harms, exploits, or attempts to gain unauthorized access to our systems; harass, threaten, or intimidate other users; post content that is defamatory, fraudulent, or violates someone else's intellectual property; or circumvent any technical limitations of the Platform.",
      "We may remove content, suspend submissions, or restrict accounts that violate these standards, with or without notice, at our sole discretion.",
    ],
  },
  {
    num: "05",
    title: "Subscriptions and Payments",
    body: [
      "Certain features may require a paid subscription. Subscription fees, billing frequency, and renewal terms are displayed before you confirm a purchase.",
      "Subscriptions automatically renew unless canceled before the renewal date. You may cancel at any time through your account settings; cancellation takes effect at the end of the current billing period.",
      "Refunds are handled according to the refund policy published at the time of purchase. Fees paid for a specific period are non-refundable except where required by law.",
    ],
  },
  {
    num: "06",
    title: "Intellectual Property",
    body: [
      "The Platform, including its code, design, branding, and original content, is owned by Nox and protected by copyright, trademark, and other intellectual property laws.",
      "Challenge starter code provided on the Platform is for your practice use only during the challenge. You may not redistribute it outside the Platform or use it to create competing services.",
      "You retain ownership of code you write and solutions you publish. By submitting content, you grant us a non-exclusive, royalty-free license to host, display, and distribute it as part of the Platform.",
    ],
  },
  {
    num: "07",
    title: "Privacy",
    body: [
      "Your use of the Platform is also governed by our Privacy Policy, which describes how we collect, use, and share information about you.",
      "By using the Platform, you consent to the practices described in the Privacy Policy.",
    ],
  },
  {
    num: "08",
    title: "Disclaimers",
    body: [
      "The Platform is provided on an \"as is\" and \"as available\" basis. We make no warranties, express or implied, regarding the Platform's reliability, accuracy, or fitness for a particular purpose.",
      "Challenge outcomes, ratings, rankings, and XP are intended for practice and motivation. They are not certified measures of professional competency and should not be relied upon as such.",
      "We do not guarantee that the Platform will be uninterrupted, secure, or error-free. Code execution is provided for practice and is not a substitute for production-grade testing environments.",
    ],
  },
  {
    num: "09",
    title: "Limitations of Liability",
    body: [
      "To the maximum extent permitted by law, Nox and its contributors are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.",
      "Our total liability for any claim arising from or related to the Platform is limited to the amount you paid us in the twelve months preceding the claim, or zero if you used the Platform without charge.",
    ],
  },
  {
    num: "10",
    title: "Termination",
    body: [
      "We may terminate or suspend your access to the Platform immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.",
      "You may stop using the Platform at any time. Upon termination, your right to use the Platform ends, but the intellectual property licenses granted here survive.",
    ],
  },
  {
    num: "11",
    title: "Changes to These Terms",
    body: [
      "We may update these Terms to reflect changes to the Platform, legal requirements, or our practices.",
      "Material changes will be communicated via an in-app notice or email where reasonably possible. Continued use after a material change constitutes acceptance.",
      "The date of the latest revision is shown at the bottom of this page.",
    ],
  },
  {
    num: "12",
    title: "Contact",
    body: [
      "If you have questions about these Terms, contact us at legal@nox.synax.me.",
      "We aim to respond to legitimate inquiries within a few business days.",
    ],
  },
];

export default function TermsPage() {
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
              href="/privacy"
              className="Nox-focus rounded-md px-3 py-2 text-[14px] font-medium tracking-[-0.14px] text-ink-muted hover:text-ink no-underline"
            >
              Privacy
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
            Terms and Conditions
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
            href="/privacy"
            className="Nox-focus rounded-md px-3 py-1.5 hover:bg-surface-1 hover:text-ink no-underline"
          >
            Privacy Policy
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
