"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { auth, LANGUAGES, INTERESTS } from "../../../lib/auth";
import { AvatarPicker } from "../../../components/AvatarPicker";
import { SelectChip } from "../../../components/SelectChip";
import { Toast } from "../../../components/Toast";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [languages, setLanguages] = useState([]);
  const [interests, setInterests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    auth
      .meFull()
      .then(({ user, stats }) => {
        if (!alive) return;
        setUsername(user.username ?? "");
        setAvatarUrl(user.avatarUrl ?? null);
        setDisplayName(user.displayName ?? "");
        setBio(user.bio ?? "");
        setWebsite(user.website ?? "");
        setGithub(user.githubUrl ?? "");
        setLanguages(stats?.preferredLanguages ?? []);
        setInterests(user.interests ?? []);
        setLoading(false);
      })
      // The (app) shell owns the session gate — a failure here is a real
      // error, not a redirect.
      .catch(() => {
        if (!alive) return;
        setFormError("Could not load your profile. Try again.");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const toggle = (list, setList, slug) =>
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);

  const onSave = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!displayName.trim()) {
      setFormError("Display name can't be empty.");
      return;
    }
    if (bio.trim().length > 160) {
      setFormError("Bio must be at most 160 characters.");
      return;
    }
    setBusy(true);
    try {
      const { user, stats } = await auth.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        githubUrl: github.trim(),
        preferredLanguages: languages.length > 0 ? languages : undefined,
        interests,
      });
      setAvatarUrl(user.avatarUrl ?? null);
      setDisplayName(user.displayName ?? "");
      setBio(user.bio ?? "");
      setWebsite(user.website ?? "");
      setGithub(user.githubUrl ?? "");
      setLanguages(stats?.preferredLanguages ?? languages);
      setInterests(user.interests ?? interests);
      showToast("Profile saved");
    } catch (err) {
      setFormError(err.issues?.[0]?.message ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "Nox-focus w-full rounded-md bg-surface-1 px-[14px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-muted";

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <h1 className="Nox-display text-[30px] leading-[1.1] font-medium tracking-[-1px]">
            Settings
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Signed in as @{username} · your handle never changes.
          </p>
        </div>
        {username ? (
          <Link
            href={`/u/${username}`}
            className={`Nox-focus hidden shrink-0 items-center rounded-pill bg-surface-1 px-[15px] py-2 text-[14px] font-medium text-ink no-underline hover:bg-surface-2 sm:inline-flex ${HOVER}`}
          >
            View profile
          </Link>
        ) : null}
      </div>

          {loading ? (
            <div className="animate-pulse" aria-hidden="true">
              <div className="h-9 w-48 rounded-md bg-surface-1" />
              <div className="mt-6 flex items-center gap-4">
                <div className="h-[88px] w-[88px] rounded-full bg-surface-1" />
                <div className="h-4 w-40 rounded bg-surface-1" />
              </div>
              <div className="mt-6 h-[52px] rounded-md bg-surface-1" />
              <div className="mt-4 h-[92px] rounded-md bg-surface-1" />
            </div>
          ) : (
            <div data-open={mounted} className="t-panel-slide Nox-auth-enter">
              <h1 className="Nox-display text-[30px] leading-[1.1] font-medium tracking-[-1px]">
                Settings
              </h1>
              <p className="mt-2 text-[15px] text-ink-muted">
                Signed in as @{username} · your handle never changes.
              </p>

              <form onSubmit={onSave} noValidate className="mt-8 flex flex-col gap-8">
                {formError ? (
                  <p
                    role="alert"
                    className="rounded-md bg-surface-1 px-[14px] py-[10px] text-[14px] leading-[1.4] text-danger"
                    style={{ boxShadow: "var(--shadow-ring-error)" }}
                  >
                    {formError}
                  </p>
                ) : null}

                <section>
                  <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                    Avatar
                  </h2>
                  <div className="mt-3">
                    <AvatarPicker
                      value={{ avatarUrl, displayName: displayName || username, username }}
                      onChange={setAvatarUrl}
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-4">
                  <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                    Profile
                  </h2>
                  <div>
                    <label
                      htmlFor="set-name"
                      className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                    >
                      Display name
                    </label>
                    <input
                      id="set-name"
                      type="text"
                      maxLength={40}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <label
                        htmlFor="set-bio"
                        className="block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                      >
                        Bio
                      </label>
                      <span className="Nox-mono text-[12px] text-ink-muted">
                        {bio.trim().length}/160
                      </span>
                    </div>
                    <textarea
                      id="set-bio"
                      rows={3}
                      maxLength={160}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className={`${inputCls} resize-none leading-[1.4]`}
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-4">
                  <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                    Links
                  </h2>
                  <div>
                    <label
                      htmlFor="set-website"
                      className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                    >
                      Website
                    </label>
                    <input
                      id="set-website"
                      type="url"
                      inputMode="url"
                      placeholder="you.dev"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="set-github"
                      className="mb-2 block text-[13px] font-medium tracking-[-0.13px] text-ink-muted"
                    >
                      GitHub
                    </label>
                    <input
                      id="set-github"
                      type="url"
                      inputMode="url"
                      placeholder="github.com/you"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </section>

                <section>
                  <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                    Languages
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Preferred languages">
                    {LANGUAGES.map((l) => (
                      <SelectChip
                        key={l.slug}
                        label={l.label}
                        selected={languages.includes(l.slug)}
                        onToggle={() => toggle(languages, setLanguages, l.slug)}
                      >
                        {l.label}
                      </SelectChip>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                    Interests
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Interests">
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
                </section>

                <div className="flex items-center justify-end gap-3 border-t border-hairline-soft pt-6">
                  <button
                    type="submit"
                    disabled={busy}
                    className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-pill border-0 bg-white px-6 py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          )}
      <Toast toast={toast} />
    </div>
  );
}
