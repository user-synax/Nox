"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { auth } from "../../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

function ResetInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy || done) return;
    if (!token) {
      setError("This page needs a reset link — request a new one below.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await auth.resetPassword(token, password);
      setDone(true);
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
                Choose a new password
              </h1>
              <p className="mt-2 text-[15px] leading-[1.3] tracking-[-0.15px] text-ink-muted">
                {done
                  ? "Your password is updated. Log in with the new one."
                  : "8+ characters. Make it a good one."}
              </p>
            </div>
          </div>

          {done ? (
            <Link
              href="/login"
              className={`Nox-focus inline-flex min-h-[44px] w-full items-center justify-center rounded-pill bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline ${HOVER} ${PRESS}`}
            >
              Back to log in
            </Link>
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
              {!token ? (
                <p className="rounded-md bg-surface-1 px-[14px] py-[10px] text-[14px] leading-[1.4] text-ink-muted">
                  Missing reset token.{" "}
                  <Link
                    href="/forgot-password"
                    className="font-medium text-accent-blue no-underline hover:underline"
                  >
                    Request a new link
                  </Link>
                  .
                </p>
              ) : null}
              <div>
                <label
                  htmlFor="reset-password"
                  className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                >
                  New password
                </label>
                <input
                  id="reset-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="Nox-focus flex w-full items-center rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted"
                />
              </div>
              <div>
                <label
                  htmlFor="reset-confirm"
                  className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                >
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat it"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="Nox-focus flex w-full items-center rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className={`Nox-focus mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
              >
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
