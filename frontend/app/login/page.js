"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { auth, toFieldError, emailDomainAllowed, emailDomainMessage } from "../../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/* Single field state bundle: value, persistent error, shake replay key.
   Errors stay until the value validates — no auto-revert. */
function useField(validate) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [shaking, setShaking] = useState(false);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const fail = (message) => {
    const cs = getComputedStyle(document.documentElement);
    const num = (name, fb) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    clearTimers();
    setError(message);
    setShaking(false);
    setShakeKey((k) => k + 1);
    requestAnimationFrame(() => setShaking(true));
    const shakeMs = num("--shake-dur-a", 80) * 2 + num("--shake-dur-b", 60) * 2;
    timers.current.push(setTimeout(() => setShaking(false), shakeMs + 20));
  };

  const onChange = (next) => {
    setValue(next);
    /* Clear the error as soon as the value validates — not before. */
    if (error && validate(next) === null) {
      clearTimers();
      setError(null);
      setShaking(false);
    }
  };

  const valid = error === null && value.length > 0 && validate(value) === null;

  return { value, error, valid, shakeKey, shaking, fail, onChange };
}

const validateEmail = (v) => {
  const t = v.trim();
  if (!EMAIL_RE.test(t)) return "Enter a valid email address.";
  if (!emailDomainAllowed(t)) return emailDomainMessage();
  return null;
};
const validatePassword = (v) => (v.length > 0 ? null : "Enter your password.");

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const busyTimer = useRef(null);

  const email = useField(validateEmail);
  const password = useField(validatePassword);
  const [formError, setFormError] = useState(null);
  // 403 EMAIL_NOT_VERIFIED lands here with a resend action.
  const [unverified, setUnverified] = useState(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  /* transitions-dev 07-panel-reveal.md — entrance, pure CSS state flip */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => clearTimeout(busyTimer.current), []);

  /* OAuth return: Google sends failures back here as ?error=. Read it
     post-hydration (not a lazy initializer) so the first client render
     matches the server HTML — otherwise React hydration mismatches (#418). */
  const [oauthError, setOauthError] = useState(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const q = new URLSearchParams(window.location.search);
        if (q.get("error")) {
          setOauthError({ code: q.get("error"), detail: q.get("error_description") });
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const oauthMessage = oauthError
    ? oauthError.code === "access_denied"
      ? "Google sign-in was cancelled. Try again when you're ready."
      : oauthError.detail || "Google sign-in couldn't be completed. Try again."
    : null;

  const continueWithGoogle = async () => {
    if (busy || googleBusy) return;
    setFormError(null);
    setOauthError(null);
    setGoogleBusy(true);
    try {
      const origin = window.location.origin;
      const hint = email.value.trim();
      const { url } = await auth.googleAuthURL({
        callbackURL: `${origin}/dashboard`,
        newUserCallbackURL: `${origin}/onboarding`,
        errorCallbackURL: `${origin}/login`,
        ...(EMAIL_RE.test(hint) ? { loginHint: hint } : {}),
      });
      if (url) {
        window.location.href = url;
        return;
      }
      setFormError("Couldn't reach Google. Try again.");
    } catch (err) {
      setFormError(err?.message ?? "Couldn't reach Google. Try again.");
    } finally {
      setGoogleBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setOauthError(null);
    let firstBad = null;
    const checks = [
      [email, validateEmail, emailRef],
      [password, validatePassword, passwordRef],
    ];
    checks.forEach(([field, validate, ref]) => {
      const message = validate(field.value);
      if (message !== null) {
        field.fail(message);
        if (!firstBad) firstBad = ref;
      }
    });
    if (firstBad) {
      firstBad.current?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    setUnverified(null);
    try {
      const address = email.value.trim();
      await auth.login({ email: address, password: password.value });
      // Fresh users land in onboarding, everyone else hits the dashboard.
      const { user } = await auth.meFull();
      router.push(user?.onboardingCompleted ? "/dashboard" : "/onboarding");
      router.refresh();
    } catch (err) {
      if (err?.code === "EMAIL_NOT_VERIFIED" || /not verified/i.test(err?.message ?? "")) {
        setUnverified(email.value.trim());
        setResent(false);
        return;
      }
      const mapped = toFieldError(err);
      if (mapped?.field === "email") email.fail(mapped.message);
      else if (mapped?.field === "password") password.fail(mapped.message);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resending || !unverified) return;
    setResending(true);
    try {
      await auth.resendVerification(unverified);
      setResent(true);
    } catch {
      setFormError("Couldn't resend the link. Try again shortly.");
    } finally {
      setResending(false);
    }
  };

  const inputShell = (field) =>
    `t-input Nox-input flex w-full items-center gap-2 rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink placeholder:text-ink-muted ${HOVER} ${
      field.error ? "is-error" : field.valid ? "is-valid" : ""
    } ${field.shaking ? "is-shaking" : ""}`;

  /* Inner inputs never paint their own ring — the wrapper owns
     focus/valid/error outlines via :focus-within. */
  const innerInput =
    "w-full bg-transparent outline-none placeholder:text-ink-muted focus-visible:shadow-none";

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      {/* Centered auth column — no nav chrome on auth pages */}
      <main className="mx-auto grid w-full max-w-[1199px] flex-1 place-items-center px-5 py-12 sm:px-[30px]">
        <div
          data-open={mounted}
          className="t-panel-slide Nox-auth-enter w-full max-w-[400px]"
        >
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
                Welcome back
              </h1>
              <p className="mt-2 text-[15px] leading-[1.3] tracking-[-0.15px] text-ink-muted">
                Log in to keep Noxing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={busy || googleBusy}
            aria-label="Continue with Google"
            className={`Nox-focus flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-pill border-0 bg-surface-1 px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-ink hover:bg-surface-2 disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
          >
            <GoogleMark />
            {googleBusy ? "Connecting…" : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-hairline-soft" />
            <span className="text-[12px] tracking-[-0.12px] text-ink-muted">
              or
            </span>
            <span className="h-px flex-1 bg-hairline-soft" />
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {formError ?? oauthMessage ? (
              <p
                role="alert"
                className="rounded-md bg-surface-1 px-[14px] py-[10px] text-[14px] leading-[1.4] text-danger"
                style={{ boxShadow: "var(--shadow-ring-error)" }}
              >
                {formError ?? oauthMessage}
              </p>
            ) : null}
            {unverified ? (
              <div
                role="alert"
                className="rounded-md bg-surface-1 px-[14px] py-[10px] text-[14px] leading-[1.4] text-ink"
              >
                <p>
                  Email not verified — check <span className="font-medium">{unverified}</span> for
                  the 6-digit code.{resent ? " Fresh code just sent." : ""}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Link
                    href={`/verify?email=${encodeURIComponent(unverified)}`}
                    className="Nox-focus rounded text-[14px] font-medium text-accent-blue no-underline hover:underline"
                  >
                    Enter code
                  </Link>
                  <button
                    type="button"
                    onClick={resend}
                    disabled={resending}
                    className="Nox-focus cursor-pointer rounded bg-transparent p-0 text-[14px] font-medium text-accent-blue hover:underline disabled:cursor-wait disabled:opacity-70"
                  >
                    {resending ? "Sending…" : "Resend code"}
                  </button>
                </p>
              </div>
            ) : null}
            <div className={`t-input-wrap ${email.error ? "is-error" : ""}`}>
              <label
                htmlFor="login-email"
                className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
              >
                Email
              </label>
              <div
                key={`email-${email.shakeKey}`}
                className={inputShell(email) }
              >
                <input
                  ref={emailRef}
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  value={email.value}
                  onChange={(e) => email.onChange(e.target.value)}
                  aria-invalid={!!email.error}
                  aria-describedby="login-email-error"
                  className={innerInput}
                />
              </div>
              <p
                id="login-email-error"
                role={email.error ? "alert" : undefined}
                className="t-error-msg Nox-error-msg mt-2"
              >
                {email.error ?? ""}
              </p>
            </div>

            <div className={`t-input-wrap ${password.error ? "is-error" : ""}`}>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="Nox-focus rounded text-[13px] font-medium tracking-[-0.13px] text-accent-blue no-underline hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div
                key={`password-${password.shakeKey}`}
                className={inputShell(password)}
              >
                <input
                  ref={passwordRef}
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password.value}
                  onChange={(e) => password.onChange(e.target.value)}
                  aria-invalid={!!password.error}
                  aria-describedby="login-password-error"
                  className={innerInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="Nox-focus shrink-0 cursor-pointer rounded text-ink-muted hover:text-ink"
                >
                  <span
                    className="t-icon-swap"
                    data-state={showPassword ? "b" : "a"}
                    aria-hidden="true"
                  >
                    <span className="t-icon flex" data-icon="a">
                      <Eye size={18} strokeWidth={2} />
                    </span>
                    <span className="t-icon flex" data-icon="b">
                      <EyeOff size={18} strokeWidth={2} />
                    </span>
                  </span>
                </button>
              </div>
              <p
                id="login-password-error"
                role={password.error ? "alert" : undefined}
                className="t-error-msg Nox-error-msg mt-2"
              >
                {password.error ?? ""}
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className={`Nox-focus mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
            >
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] tracking-[-0.14px] text-ink-muted">
            New to Nox?{" "}
            <Link
              href="/signup"
              className="Nox-focus rounded font-medium text-accent-blue no-underline hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
