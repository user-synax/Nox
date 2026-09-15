"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { auth, emailDomainAllowed, emailDomainMessage } from "../../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!emailDomainAllowed(value)) {
      setError(emailDomainMessage());
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await auth.forgotPassword(value);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

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
                Reset your password
              </h1>
              <p className="mt-2 text-[15px] leading-[1.3] tracking-[-0.15px] text-ink-muted">
                {sent
                  ? "Check your inbox for the reset link."
                  : "Enter your account email and we'll send you a reset link."}
              </p>
            </div>
          </div>

          {sent ? (
            <div
              role="status"
              className="rounded-md bg-surface-1 px-[14px] py-[10px] text-[14px] leading-[1.4] text-ink-muted"
            >
              If an account exists for{" "}
              <span className="text-ink">{email.trim()}</span>, a reset link
              is on its way. It expires soon — check spam too.
            </div>
          ) : (
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
                  htmlFor="forgot-email"
                  className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                >
                  Email
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  className="Nox-focus flex w-full items-center rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className={`Nox-focus mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[14px] tracking-[-0.14px] text-ink-muted">
            Remembered it?{" "}
            <Link
              href="/login"
              className="Nox-focus rounded font-medium text-accent-blue no-underline hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
