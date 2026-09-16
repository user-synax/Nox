import Link from "next/link";

const NOT_FOUND = [
  {
    reason: "A challenge slug that no longer exists",
    fix: "Check the URL or return to the challenge catalog",
  },
  {
    reason: "A profile page that was renamed or removed",
    fix: "Search for the new username or visit the leaderboard",
  },
  {
    reason: "A solution link that expired or was unpublished",
    fix: "Go back to your dashboard or the challenge itself",
  },
  {
    reason: "A typo in the address bar",
    fix: "Try again, or start from the home page",
  },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
      <main className="mx-auto flex min-h-screen max-w-[1199px] flex-col items-center justify-center px-5 sm:px-8">
        {/* 404 code — design-system display type, tight tracking */}
        <div className="text-center">
          <p className="Nox-mono text-[13px] tracking-[-0.12px] text-ink-muted mb-4">
            Unfortunately
          </p>
          <span className="Nox-display block text-[clamp(96px,18vw,200px)] leading-[0.9] font-medium tracking-[-0.07em] text-ink opacity-90">
            404
          </span>
          <h1 className="Nox-display mt-2 block text-[clamp(28px,4vw,44px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
            Page not found
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
            The page you are looking for does not exist, was moved, or is
            temporarily unavailable.
          </p>
        </div>

        {/* Where you might have ended up */}
        <div className="mt-12 w-full max-w-lg">
          <p className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted mb-4">
            Where you might have ended up
          </p>
          <div className="flex flex-col gap-3">
            {NOT_FOUND.map((item) => (
              <div
                key={item.reason}
                className="Nox-card rounded-xl border border-hairline-soft bg-surface-1 p-4"
              >
                <p className="text-[15px] text-ink-muted">{item.reason}</p>
                <p className="mt-1 text-[13px] tracking-[-0.13px] text-ink">
                  {item.fix}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className={`Nox-focus inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline hover:bg-white/90 ${PRESS}`}
          >
            Back to home
          </Link>
          <Link
            href="/challenges"
            className={`Nox-focus inline-flex min-h-[44px] items-center justify-center rounded-pill bg-surface-1 px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline hover:bg-surface-2 ${PRESS}`}
          >
            Explore challenges
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 flex items-center gap-2 text-[13px] tracking-[-0.13px] text-ink-muted">
          <Link
            href="/terms"
            className="Nox-focus rounded-md px-2 py-1 hover:text-ink no-underline"
          >
            Terms
          </Link>
          <span className="text-hairline" aria-hidden="true">·</span>
          <Link
            href="/privacy"
            className="Nox-focus rounded-md px-2 py-1 hover:text-ink no-underline"
          >
            Privacy
          </Link>
          <span className="text-hairline" aria-hidden="true">·</span>
          <Link
            href="/cookies"
            className="Nox-focus rounded-md px-2 py-1 hover:text-ink no-underline"
          >
            Cookies
          </Link>
        </div>
      </main>
    </div>
  );
}
