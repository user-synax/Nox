"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "../../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [state, setState] = useState(token ? "working" : "no-token");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    auth
      .verifyEmail(token)
      .then(() => {
        if (alive) setState("done");
      })
      .catch((err) => {
        if (alive) {
          setError(err.message);
          setState("failed");
        }
      });
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      <main className="mx-auto grid w-full max-w-[1199px] flex-1 place-items-center px-5 py-12 sm:px-[30px]">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-start gap-4">
            <Link
              href="/"
              aria-label="Nox home"
              className="Nox-focus block rounded-[14px]"
            >
              <span className="block h-12 w-12 overflow-hidden rounded-[14px]">
                <Image
                  src="/Nox-logo.png"
                  alt=""
                  aria-hidden="true"
                  width={48}
                  height={48}
                  priority
                  sizes="48px"
                  className="h-12 w-12 object-cover"
                />
              </span>
            </Link>
            <div>
              <h1 className="Nox-display text-[30px] leading-[1.1] font-medium tracking-[-1px] text-ink">
                {state === "done" ? "Email verified" : "Verify your email"}
              </h1>
              <p className="mt-2 text-[15px] leading-[1.3] tracking-[-0.15px] text-ink-muted">
                {state === "working" && "Confirming your link…"}
                {state === "done" && "Your account is ready. Time to debug."}
                {state === "no-token" &&
                  "This page needs a verification link — check your inbox for the latest one."}
                {state === "failed" && (error ?? "This link is invalid or expired.")}
              </p>
            </div>
          </div>

          {state === "done" ? (
            <button
              type="button"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className={`Nox-focus inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black ${HOVER} ${PRESS}`}
            >
              Continue
            </button>
          ) : state === "working" ? (
            <p className="text-[14px] text-ink-muted" role="status">
              Verifying…
            </p>
          ) : (
            <Link
              href="/login"
              className={`Nox-focus inline-flex min-h-[44px] w-full items-center justify-center rounded-pill bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline ${HOVER} ${PRESS}`}
            >
              Back to log in
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
