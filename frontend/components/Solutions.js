"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, LoaderCircle, MessageSquare } from "lucide-react";
import { auth } from "../lib/auth";
import { Avatar } from "./Avatar";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Presentational like toggle — parents own the optimistic state and pass
 * the settled values back in. `busy` disables while the request is in flight
 * (the visible count already moved; this just blocks double-taps).
 */
export function LikeButton({ liked, count, onToggle, busy = false, label = "Like" }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={!!liked}
      aria-label={`${label} (${count ?? 0})`}
      title={label}
      className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-pill border-0 px-3 text-[13px] font-medium disabled:cursor-wait ${HOVER} ${PRESS} ${
        liked ? "bg-danger/15 text-danger" : "bg-surface-2 text-ink-muted hover:text-ink"
      }`}
    >
      <Heart
        size={14}
        aria-hidden="true"
        fill={liked ? "currentColor" : "none"}
        strokeWidth={liked ? 0 : 2}
      />
      <span className="Nox-mono">{count ?? 0}</span>
    </button>
  );
}

/** Card for solution lists (challenge tab, profile). Code stays on detail. */
export function SolutionCard({ solution, onLike, showChallenge = false }) {
  if (!solution) return null;
  const a = solution.author ?? {};
  return (
    <article className="rounded-xl bg-surface-1 p-5">
      <div className="flex items-center gap-2.5">
        <Avatar user={a.username ? a : { ...a, username: "?" }} size={28} />
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
          <span className="font-medium text-ink">{a.displayName ?? a.username ?? "…"}</span>
          {a.username ? <span> @{a.username}</span> : null}
          <span> · {timeAgo(solution.createdAt)}</span>
          {showChallenge && solution.challengeSlug ? (
            <span>
              {" "}· in{" "}
              <Link
                href={`/challenges/${solution.challengeSlug}#solutions`}
                className="Nox-focus rounded font-medium text-accent-blue no-underline hover:underline"
              >
                {solution.challengeTitle ?? "challenge"}
              </Link>
            </span>
          ) : null}
        </p>
      </div>
      <Link
        href={`/solutions/${solution.id}`}
        className="Nox-focus mt-2 block rounded no-underline"
      >
        <h3 className="text-[16px] font-medium tracking-[-0.16px] text-ink hover:underline">
          {solution.title}
        </h3>
        {solution.excerpt ? (
          <p className="mt-1 line-clamp-2 text-[14px] leading-[1.5] text-ink-muted">
            {solution.excerpt}
          </p>
        ) : null}
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <span onClick={(e) => e.preventDefault()}>
          <LikeButton
            liked={solution.likedByMe}
            count={solution.likeCount}
            onToggle={() => onLike?.(solution)}
          />
        </span>
        <Link
          href={`/solutions/${solution.id}#comments`}
          aria-label={`${solution.commentCount ?? 0} comments`}
          className={`Nox-focus inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-surface-2 px-3 text-[13px] font-medium text-ink-muted no-underline hover:text-ink ${HOVER}`}
        >
          <MessageSquare size={14} aria-hidden="true" />
          <span className="Nox-mono">{solution.commentCount ?? 0}</span>
        </Link>
        {(solution.tags ?? []).slice(0, 3).map((t) => (
          <span key={t} className="Nox-mono hidden text-[12px] text-ink-muted sm:inline">
            #{t}
          </span>
        ))}
      </div>
    </article>
  );
}

const fieldCls =
  "Nox-focus w-full rounded-md border border-hairline-soft bg-canvas px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-muted/60";

/**
 * Share-a-write-up form. `defaultCode` is prefilled from the accepted
 * submission snapshot; everything stays editable before publishing.
 */
export function SolutionComposer({ challenge, defaultCode = "", onPublished }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [code, setCode] = useState(defaultCode);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setCode((c) => c || defaultCode);
          setOpen(true);
        }}
        className={`Nox-focus inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border border-dashed border-hairline bg-transparent px-5 text-[14px] font-medium text-ink-muted hover:border-ink-muted hover:text-ink ${HOVER}`}
      >
        Share your approach — explain the root cause and the fix
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10);
      const { solution } = await auth.shareSolution(challenge.slug ?? challenge.id, {
        title: title.trim(),
        body: body.trim(),
        code,
        language: challenge.language,
        tags: tagList,
      });
      setTitle("");
      setBody("");
      setCode("");
      setTags("");
      setOpen(false);
      onPublished?.(solution);
    } catch (err) {
      setError(err?.message ?? "Could not publish this solution.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-surface-1 p-5" aria-label="Share solution">
      <h3 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
        Share your approach
      </h3>
      <div className="mt-3 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-muted">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The loop quit one step too early"
            maxLength={100}
            required
            minLength={3}
            className={fieldCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-muted">
            What was wrong, and why does the fix work?
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Walk through the root cause so the next debugger learns it…"
            rows={5}
            required
            minLength={10}
            maxLength={20000}
            className={`${fieldCls} resize-y leading-[1.55]`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-muted">
            Fixed code <span className="Nox-mono">({challenge.language})</span>
          </span>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={8}
            required
            spellCheck={false}
            className={`${fieldCls} resize-y font-mono text-[13px] leading-[1.6]`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-muted">
            Tags <span className="opacity-70">(comma-separated, optional)</span>
          </span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="off-by-one, loops"
            className={`${fieldCls} Nox-mono`}
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[13px] leading-[1.5] text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-white px-6 text-[14px] font-medium text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
        >
          {saving ? (
            <>
              <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />
              Publishing…
            </>
          ) : (
            "Publish solution"
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-2 px-5 text-[14px] font-medium text-ink ${HOVER}`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
