"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { auth, LANGUAGES, INTERESTS } from "../../lib/auth";
import { Avatar } from "../../components/Avatar";
import { SelectChip } from "../../components/SelectChip";
import { AvatarPicker } from "../../components/AvatarPicker";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

/* Staggered step heading — remounts per step (key) so the entrance replays. */
function StepHeading({ eyebrow, title, sub }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`t-stagger ${shown ? "is-shown" : ""}`}>
      <span className="t-stagger-line t-stagger-line--1 text-[13px] font-medium tracking-[-0.13px] text-accent-blue">
        {eyebrow}
      </span>
      <span className="t-stagger-line t-stagger-line--2 Nox-display mt-2 block text-[30px] leading-[1.1] font-medium tracking-[-1px] text-ink">
        {title}
      </span>
      <span className="t-stagger-line t-stagger-line--3 mt-2 block text-[15px] leading-[1.35] tracking-[-0.15px] text-ink-muted">
        {sub}
      </span>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [done, setDone] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState(null);
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState([]);
  const [langError, setLangError] = useState(null);
  const [interests, setInterests] = useState([]);
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");

  const sliderRef = useRef(null);

  /* Session gate + prefill. */
  useEffect(() => {
    let alive = true;
    auth
      .meFull()
      .then(({ user, stats }) => {
        if (!alive) return;
        if (user.onboardingCompleted) {
          router.replace("/");
          return;
        }
        setUsername(user.username ?? "");
        setDisplayName(user.displayName ?? user.username ?? "");
        setBio(user.bio ?? "");
        setAvatarUrl(user.avatarUrl ?? null);
        setInterests(user.interests ?? []);
        setLanguages(stats?.preferredLanguages ?? []);
        setWebsite(user.website ?? "");
        setGithub(user.githubUrl ?? "");
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
    return () => {
      alive = false;
    };
  }, [router]);

  /* Animate the slider height to the active step (JS orchestration). */
  useEffect(() => {
    if (loading || done) return;
    const slider = sliderRef.current;
    if (!slider) return;
    const active = slider.querySelector(`[data-page-id="${step}"]`);
    if (!active) return;
    const sync = () => {
      slider.style.height = `${active.scrollHeight}px`;
    };
    sync();
    const raf = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
    };
  }, [step, loading, done]);

  const toggle = (list, setList, slug) =>
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);

  const goStep1 = async () => {
    if (busy) return;
    const name = displayName.trim();
    if (!name) {
      setNameError("Give yourself a display name.");
      return;
    }
    setNameError(null);
    setFormError(null);
    setBusy(true);
    try {
      await auth.updateProfile({ displayName: name, bio: bio.trim() });
      setStep(2);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const goStep2 = async () => {
    if (busy) return;
    if (languages.length === 0) {
      setLangError("Pick at least one language.");
      return;
    }
    setLangError(null);
    setFormError(null);
    setBusy(true);
    try {
      await auth.updateProfile({ preferredLanguages: languages, interests });
      setStep(3);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async (data) => {
    if (busy) return;
    setFormError(null);
    setBusy(true);
    try {
      await auth.completeOnboarding(data);
      setDone(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  /* Auto-leave the celebration after a beat (button is the primary path). */
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 3200);
    return () => clearTimeout(t);
  }, [done, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
        <main className="mx-auto grid w-full max-w-[1199px] flex-1 place-items-center px-5 py-12 sm:px-[30px]">
          <p className="text-[14px] text-ink-muted" role="status">
            Setting up your space…
          </p>
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
        <main className="mx-auto grid w-full max-w-[1199px] flex-1 place-items-center px-5 py-12 sm:px-[30px]">
          <div className="flex w-full max-w-[400px] flex-col items-center text-center">
            <span className="t-success-check" data-state="in" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="72" height="72" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#22c55e" strokeWidth="2.5" opacity="0.35" />
                <path
                  d="M14 24l8 8 12-16"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ strokeDasharray: 32, strokeDashoffset: 32 }}
                />
              </svg>
            </span>
            <StepHeading
              eyebrow="Onboarding complete"
              title="You're all set."
              sub="Your developer profile is live. Time to find a bug worth fixing."
            />
            <button
              type="button"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className={`Nox-focus mt-8 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black ${HOVER} ${PRESS}`}
            >
              Start exploring
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      <main className="mx-auto grid w-full max-w-[1199px] flex-1 place-items-center px-5 py-12 sm:px-[30px]">
        <div className="w-full max-w-[560px]">
          {/* Progress header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <Link href="/" aria-label="Nox home" className="Nox-focus block rounded-[14px]">
                <span className="block h-10 w-10 overflow-hidden rounded-[12px]">
                  <Image
                    src="/Nox-logo.png"
                    alt=""
                    aria-hidden="true"
                    width={40}
                    height={40}
                    priority
                    sizes="40px"
                    className="h-10 w-10 object-cover"
                  />
                </span>
              </Link>
              <p className="Nox-mono text-[13px] tracking-[-0.13px] text-ink-muted">
                {step} / 3{username ? ` · @${username}` : ""}
              </p>
            </div>
            <div
              className="mt-4 h-1 overflow-hidden rounded-full bg-surface-1"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-label="Onboarding progress"
            >
              <div
                className="h-full rounded-full bg-accent-blue"
                style={{
                  width: `${(step / 3) * 100}%`,
                  transition: "width var(--duration-fast) var(--ease-smooth-out)",
                }}
              />
            </div>
          </div>

          {formError ? (
            <p
              role="alert"
              className="mb-4 rounded-md bg-surface-1 px-[14px] py-[10px] text-[14px] leading-[1.4] text-danger"
              style={{ boxShadow: "var(--shadow-ring-error)" }}
            >
              {formError}
            </p>
          ) : null}

          <div
            ref={sliderRef}
            className="t-page-slide"
            data-page={String(step)}
            style={{
              transition: "height var(--duration-fast) var(--ease-smooth-out)",
              overflow: "hidden",
            }}
          >
            {/* ── Step 1 · Profile ── */}
            <section className="t-page" data-page-id="1" aria-label="Profile">
              <div key="s1">
                <StepHeading
                  eyebrow="Step 1 of 3 · Profile"
                  title="How should you show up?"
                  sub="This is what other debuggers see on your public profile."
                />
                <div className="mt-6">
                  <AvatarPicker
                    value={{ avatarUrl, displayName: displayName || username, username }}
                    onChange={setAvatarUrl}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="ob-name"
                      className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                    >
                      Display name
                    </label>
                    <input
                      id="ob-name"
                      type="text"
                      maxLength={40}
                      placeholder="Ada Lovelace"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      aria-invalid={!!nameError}
                      className="Nox-focus w-full rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted"
                    />
                    {nameError ? (
                      <p role="alert" className="Nox-error-msg t-error-msg mt-2">
                        {nameError}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <label
                        htmlFor="ob-bio"
                        className="block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                      >
                        Bio <span className="font-normal">(optional)</span>
                      </label>
                      <span className="Nox-mono text-[12px] text-ink-muted">{bio.trim().length}/160</span>
                    </div>
                    <textarea
                      id="ob-bio"
                      rows={3}
                      maxLength={160}
                      placeholder="Full-stack debugger. I break production so you don't have to."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="Nox-focus w-full resize-none rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] leading-[1.4] text-ink outline-none placeholder:text-ink-muted"
                    />
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between gap-3">
                  <span className="text-[13px] text-ink-muted">Signed in as @{username}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={`Nox-focus cursor-pointer rounded-pill px-[15px] py-[10px] text-[14px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={goStep1}
                      disabled={busy}
                      className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-6 py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
                    >
                      {busy ? "Saving…" : "Continue"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Step 2 · Focus ── */}
            <section className="t-page" data-page-id="2" aria-label="Focus">
              <div key="s2">
                <StepHeading
                  eyebrow="Step 2 of 3 · Focus"
                  title="What do you debug in?"
                  sub="Languages shape your recommendations. Interests shape your feed."
                />
                <p className="mt-6 mb-3 text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                  Languages
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Preferred languages">
                  {LANGUAGES.map((l) => (
                    <SelectChip
                      key={l.slug}
                      label={l.label}
                      selected={languages.includes(l.slug)}
                      onToggle={() => {
                        setLangError(null);
                        toggle(languages, setLanguages, l.slug);
                      }}
                    >
                      {l.label}
                    </SelectChip>
                  ))}
                </div>
                {langError ? (
                  <p role="alert" className="Nox-error-msg t-error-msg mt-2">
                    {langError}
                  </p>
                ) : null}

                <p className="mt-6 mb-3 text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                  Interests <span className="font-normal">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
                  {INTERESTS.map((t) => (
                    <SelectChip
                      key={t.slug}
                      label={t.label}
                      selected={interests.includes(t.slug)}
                      onToggle={() => toggle(interests, setInterests, t.slug)}
                    >
                      {t.label}
                    </SelectChip>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`Nox-focus cursor-pointer rounded-pill px-[15px] py-[10px] text-[14px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className={`Nox-focus cursor-pointer rounded-pill px-[15px] py-[10px] text-[14px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={goStep2}
                      disabled={busy}
                      className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-6 py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
                    >
                      {busy ? "Saving…" : "Continue"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Step 3 · Links ── */}
            <section className="t-page" data-page-id="3" aria-label="Links">
              <div key="s3">
                <StepHeading
                  eyebrow="Step 3 of 3 · Links"
                  title="Where else are you?"
                  sub="Optional. Both show up on your public profile."
                />
                <div className="mt-6 flex items-center gap-4 rounded-xl bg-surface-1 p-4">
                  <Avatar
                    user={{ avatarUrl, displayName: displayName || username, username }}
                    size={52}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium tracking-[-0.15px] text-ink">
                      {displayName.trim() || username}
                    </p>
                    <p className="truncate text-[13px] text-ink-muted">@{username}</p>
                    {(languages.length > 0 || interests.length > 0) && (
                      <p className="mt-1 truncate text-[12px] text-ink-muted">
                        {[
                          ...languages.map(
                            (s) => LANGUAGES.find((l) => l.slug === s)?.label ?? s
                          ),
                          ...interests.map(
                            (s) => INTERESTS.find((t) => t.slug === s)?.label ?? s
                          ),
                        ].join(" · ")}
                      </p>
                    )}
                  </div>
                  <span
                    aria-hidden="true"
                    className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="ob-website"
                      className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                    >
                      Website <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id="ob-website"
                      type="url"
                      inputMode="url"
                      placeholder="you.dev"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="Nox-focus w-full rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ob-github"
                      className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                    >
                      GitHub <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id="ob-github"
                      type="url"
                      inputMode="url"
                      placeholder="github.com/you"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      className="Nox-focus w-full rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted"
                    />
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={`Nox-focus cursor-pointer rounded-pill px-[15px] py-[10px] text-[14px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => finish({})}
                      disabled={busy}
                      className={`Nox-focus cursor-pointer rounded-pill px-[15px] py-[10px] text-[14px] font-medium text-ink-muted hover:text-ink disabled:opacity-70 ${HOVER}`}
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        finish({ website: website.trim(), githubUrl: github.trim() })
                      }
                      disabled={busy}
                      className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-6 py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
                    >
                      {busy ? "Finishing…" : "Finish"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
