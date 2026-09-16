"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

export default function Error({
  error,
  reset,
}) {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Log something (in production this would go to your logger).
    console.error("Nox error boundary:", error);
    setShowMessage(true);
  }, [error]);

  if (!showMessage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
      <main className="mx-auto flex min-h-screen max-w-[1199px] flex-col items-center justify-center px-5 sm:px-8">
        <div className="text-center">
          <p className="Nox-mono text-[13px] tracking-[-0.12px] text-ink-muted mb-4">
            Something went wrong
          </p>
          <span className="Nox-display block text-[clamp(80px,16vw,170px)] leading-[0.9] font-medium tracking-[-0.07em] text-ink opacity-90">
            !
          </span>
          <h1 className="Nox-display mt-2 block text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
            We hit a snag
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted">
            An unexpected error occurred. This is usually temporary — please
            try again in a moment.
          </p>
        </div>

        {/* Action row */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className={`Nox-focus inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline hover:bg-white/90 ${HOVER} ${PRESS}`}
          >
            Try again
          </button>
          <Link
            href="/"
            className={`Nox-focus inline-flex min-h-[44px] items-center justify-center rounded-pill bg-surface-1 px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline hover:bg-surface-2 ${HOVER} ${PRESS}`}
          >
            Back to home
          </Link>
        </div>

        {/* Detectable things to check */}
        <div className="mt-12 w-full max-w-lg">
          <p className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted mb-4">
            If this keeps happening
          </p>
          <div className="flex flex-col gap-2">
            {[
              "Refresh the page and try the action again.",
              "Check that your internet connection is stable.",
              "Try again later if the Platform is under heavy load.",
            ].map((tip) => (
              <p
                key={tip}
                className="Nox-input rounded-md bg-surface-1 px-4 py-3 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted"
              >
                {tip}
              </p>
            ))}
          </div>
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
