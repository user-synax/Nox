"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, emailDomainAllowed, emailDomainMessage } from "../../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const q = params.get("email");
      if (q) setEmail(q);
    });
    return () => cancelAnimationFrame(raf);
  }, [params]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const address = email.trim();
    if (!EMAIL_RE.test(address) || !emailDomainAllowed(address)) {
      setError(!EMAIL_RE.test(address) ? "Enter a valid email address." : emailDomainMessage());
      return;
    }
    if (!/^[0-9]{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await auth.verifyOtp(address, code.trim());
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err?.message ?? "Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resending) return;
    const address = email.trim();
    if (!EMAIL_RE.test(address)) {
      setError("Enter your email first so we know where to send it.");
      return;
    }
    setResending(true);
    try {
      await auth.resendVerification(address);
      setResent(true);
      setError(null);
    } catch {
      setError("Couldn't resend the code. Try again shortly.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      <main className="mx-auto grid w-full max-w-[1199px] flex-1 place-items-center px-5 py-12 sm:px-[30px]">
        <div
          data-open={mounted}
          className="t-panel-slide Nox-auth-enter w-full max-w-[400px]"
        >
          <div className="mb-8 flex flex-col items-start gap-4">
            <Link href="/" aria-label="Nox home" className="Nox-focus block rounded-[14px]">
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
                Check your inbox
              </h1>
              <p className="mt-2 text-[15px] leading-[1.3] tracking-[-0.15px] text-ink-muted">
                We sent a 6-digit code{email.trim() ? (
                  <>
                    {" "}to <span className="font-medium text-ink">{email.trim()}</span>
                  </>
                ) : (
                  " to your email"
                )}
                . It expires in 10 minutes.
                {resent ? " Fresh code just sent." : ""}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {error ? (
              <p
                role="alert"
                className="rounded-md bg-surface-1 px-[14px] py-[10px] text-[14px] leading-[1.4] text-danger"
                style={{ boxShadow: "var(--shadow-ring-error)" }}
              >
                {error}
              </p>
            ) : null}
            <div>
              <label
                htmlFor="verify-email"
                className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
              >
                Email
              </label>
              <input
                id="verify-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="Nox-focus w-full rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
            <div>
              <label
                htmlFor="verify-code"
                className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
              >
                6-digit code
              </label>
              <input
                id="verify-code"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                aria-invalid={!!error}
                className="Nox-focus Nox-mono w-full rounded-md bg-surface-1 px-[14px] py-[10px] text-center text-[22px] tracking-[0.5em] text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className={`Nox-focus mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] tracking-[-0.14px] text-ink-muted">
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="Nox-focus cursor-pointer rounded bg-transparent p-0 font-medium text-accent-blue hover:underline disabled:cursor-wait disabled:opacity-70"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
