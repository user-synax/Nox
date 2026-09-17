"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LoaderCircle,
  Lock,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { auth } from "../../../lib/auth";
import { useLiveRooms } from "../../../lib/socket";
import { Avatar } from "../../../components/Avatar";
import { LikeButton, timeAgo } from "../../../components/Solutions";
import { ReportButton } from "../../../components/ReportDialog";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const fieldCls =
  "Nox-focus w-full rounded-md border border-hairline-soft bg-canvas px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-muted/60";

function CodeBlock({ code }) {
  const lines = String(code ?? "").replace(/\n$/, "").split("\n");
  return (
    <div className="overflow-x-auto rounded-xl bg-black/40">
      <pre className="min-w-full p-4 font-mono text-[13px] leading-[1.6]">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span
              aria-hidden="true"
              className="w-8 shrink-0 pr-4 text-right text-ink-muted/60 select-none"
            >
              {i + 1}
            </span>
            <code className="flex-1 whitespace-pre text-ink/90">{line || " "}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

function CommentItem({
  comment,
  isMine,
  isFresh,
  likeBusy,
  onLike,
  onEdit,
  onDelete,
  confirmDelete,
  showReport = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const edited =
    comment.updatedAt && comment.createdAt && comment.updatedAt !== comment.createdAt;
  const temp = String(comment.id).startsWith("temp-");

  const saveEdit = async () => {
    const body = draft.trim();
    if (!body || body === comment.body || saving) return;
    setSaving(true);
    try {
      await onEdit(comment, body);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      className={`rounded-xl bg-surface-1 p-4 transition-colors duration-500 ${isFresh ? "bg-accent-blue/10" : ""} ${temp ? "opacity-70" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        <Avatar user={comment.author?.username ? comment.author : { ...comment.author, username: "?" }} size={26} />
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
          <span className="font-medium text-ink">
            {comment.author?.displayName ?? comment.author?.username ?? "…"}
          </span>
          <span> · {temp ? "Sending…" : timeAgo(comment.createdAt)}</span>
          {edited && !temp ? <span> · edited</span> : null}
        </p>
        {!temp && isMine ? (
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setDraft(comment.body);
                setEditing((e) => !e);
              }}
              aria-label="Edit comment"
              className={`Nox-focus inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink ${HOVER}`}
            >
              <Pencil size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(comment)}
              aria-label="Delete comment"
              className={`Nox-focus inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-muted hover:bg-danger/15 hover:text-danger ${HOVER}`}
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            aria-label="Edit comment"
            className={`${fieldCls} resize-y leading-[1.55]`}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center rounded-pill border-0 bg-white px-4 text-[13px] font-medium text-black disabled:opacity-70 ${HOVER}`}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center rounded-pill border-0 bg-surface-2 px-4 text-[13px] font-medium text-ink ${HOVER}`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[14px] leading-[1.6] whitespace-pre-wrap text-ink/90">
          {comment.body}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {!temp ? (
          <LikeButton
            liked={comment.likedByMe}
            count={comment.likeCount}
            busy={likeBusy}
            onToggle={() => onLike(comment)}
            label="Like comment"
          />
        ) : null}
        {!temp && showReport && !isMine ? (
          <span className="ml-auto">
            <ReportButton
              targetType="comment"
              targetId={comment.id}
              label="Report comment"
            />
          </span>
        ) : null}
        {confirmDelete ? (
          <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
            Delete this comment?
            <button
              type="button"
              onClick={() => onDelete(comment, true)}
              className={`Nox-focus cursor-pointer rounded-pill border-0 bg-danger/15 px-3 py-1 text-[13px] font-medium text-danger ${HOVER}`}
            >
              Confirm
            </button>
          </span>
        ) : null}
      </div>
    </li>
  );
}

export default function SolutionDetailPage({ params }) {
  const { id } = use(params);
  const [solution, setSolution] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [meUser, setMeUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [locked, setLocked] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [deleted, setDeleted] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentLikeBusy, setCommentLikeBusy] = useState({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmSolutionDelete, setConfirmSolutionDelete] = useState(false);
  const [editingSolution, setEditingSolution] = useState(false);
  const [editFields, setEditFields] = useState({ title: "", body: "", code: "", tags: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [fresh, setFresh] = useState({});
  const [mounted, setMounted] = useState(false);
  const pendingRef = useRef([]);

  const myUsername = meUser?.username ?? null;
  const isAuthor = !!(myUsername && solution?.author?.username === myUsername);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      auth.getSolution(id),
      auth.listComments(id, { limit: 50 }),
      auth.meFull().catch(() => null),
    ]).then(([sol, thread, me]) => {
      if (!alive) return;
      if (sol.status === "fulfilled") {
        setSolution(sol.value.solution);
      } else if (sol.reason?.status === 403) {
        setLocked({
          slug: sol.reason?.data?.challengeSlug ?? null,
          title: sol.reason?.data?.challengeTitle ?? "this challenge",
        });
      } else if (sol.reason?.status === 404) {
        setMissing(true);
      } else {
        setLoadError(sol.reason?.message ?? "Could not load solution.");
      }
      if (thread.status === "fulfilled") {
        setComments(thread.value.items ?? []);
        setCommentsTotal(thread.value.total ?? 0);
      }
      if (me.status === "fulfilled" && me.value) setMeUser(me.value.user);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  const markFresh = (commentId) => {
    setFresh((f) => ({ ...f, [commentId]: true }));
    setTimeout(() => {
      setFresh((f) => {
        const next = { ...f };
        delete next[commentId];
        return next;
      });
    }, 2500);
  };

  // Live thread — counts merge authoritatively, likedByMe never from echoes.
  useLiveRooms({
    solutionId: solution && !deleted ? id : null,
    events: {
      "solution:like": ({ solutionId, likeCount } = {}) => {
        if (solutionId !== id || likeCount == null) return;
        setSolution((s) => (s ? { ...s, likeCount } : s));
      },
      "solution:updated": ({ solution: s } = {}) => {
        if (!s || s.id !== id) return;
        setSolution((prev) => (prev ? { ...prev, ...s, likedByMe: prev.likedByMe } : prev));
      },
      "solution:deleted": ({ solutionId } = {}) => {
        if (solutionId === id) setDeleted(true);
      },
      "comment:new": ({ comment } = {}) => {
        if (!comment?.id) return;
        setComments((prev) => {
          if (prev.some((c) => c.id === comment.id)) return prev;
          // Own echo racing the REST response: swap the temp row in place.
          if (comment.author?.username && comment.author.username === myUsername) {
            const idx = prev.findIndex(
              (c) => String(c.id).startsWith("temp-") && c.body === comment.body
            );
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = comment;
              return next;
            }
          }
          return [...prev, comment];
        });
        pendingRef.current = pendingRef.current.filter((b) => b !== comment.body);
        setCommentsTotal((t) => t + 1);
        if (!comment.author?.username || comment.author.username !== myUsername) {
          markFresh(comment.id);
        }
      },
      "comment:updated": ({ comment } = {}) => {
        if (!comment?.id) return;
        setComments((prev) =>
          prev.map((c) => (c.id === comment.id ? { ...c, ...comment, likedByMe: c.likedByMe } : c))
        );
      },
      "comment:deleted": ({ commentId } = {}) => {
        if (!commentId) return;
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentsTotal((t) => Math.max(0, t - 1));
      },
      "comment:like": ({ commentId, likeCount } = {}) => {
        if (!commentId || likeCount == null) return;
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, likeCount } : c))
        );
      },
    },
  });

  const toggleLike = async () => {
    if (!solution || likeBusy) return;
    const prevLiked = !!solution.likedByMe;
    const prevCount = solution.likeCount ?? 0;
    setLikeBusy(true);
    setSolution((s) =>
      s ? { ...s, likedByMe: !prevLiked, likeCount: prevCount + (prevLiked ? -1 : 1) } : s
    );
    try {
      const { liked, likeCount } = await auth.toggleSolutionLike(id);
      setSolution((s) => (s ? { ...s, likedByMe: liked, likeCount } : s));
    } catch {
      setSolution((s) => (s ? { ...s, likedByMe: prevLiked, likeCount: prevCount } : s));
    } finally {
      setLikeBusy(false);
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setComposerError(null);
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const temp = {
      id: tempId,
      solutionId: id,
      body,
      likeCount: 0,
      likedByMe: false,
      author: meUser
        ? { username: meUser.username, displayName: meUser.displayName, avatarUrl: meUser.avatarUrl }
        : { username: null, displayName: "You", avatarUrl: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pendingRef.current.push(body);
    setComments((prev) => [...prev, temp]);
    setDraft("");
    try {
      const { comment } = await auth.postComment(id, body);
      pendingRef.current = pendingRef.current.filter((b) => b !== body);
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev.filter((c) => c.id !== tempId);
        return prev.map((c) => (c.id === tempId ? comment : c));
      });
      if (comment?.id) setCommentsTotal((t) => t + 1);
    } catch (err) {
      pendingRef.current = pendingRef.current.filter((b) => b !== body);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setComposerError(err?.message ?? "Could not post comment.");
    } finally {
      setSending(false);
    }
  };

  const editComment = async (comment, body) => {
    const { comment: freshComment } = await auth.editComment(comment.id, body);
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id ? { ...freshComment, likedByMe: c.likedByMe } : c
      )
    );
  };

  const deleteComment = async (comment, confirmed = false) => {
    if (!confirmed) {
      setConfirmDeleteId(comment.id);
      return;
    }
    setConfirmDeleteId(null);
    const prev = comments;
    setComments((rows) => rows.filter((c) => c.id !== comment.id));
    try {
      const { commentCount } = await auth.deleteComment(comment.id);
      if (commentCount != null) setCommentsTotal(commentCount);
      else setCommentsTotal((t) => Math.max(0, t - 1));
    } catch {
      setComments(prev);
    }
  };

  const toggleCommentLike = async (comment) => {
    if (commentLikeBusy[comment.id]) return;
    setCommentLikeBusy((m) => ({ ...m, [comment.id]: true }));
    const prevLiked = !!comment.likedByMe;
    const prevCount = comment.likeCount ?? 0;
    setComments((rows) =>
      rows.map((c) =>
        c.id === comment.id
          ? { ...c, likedByMe: !prevLiked, likeCount: prevCount + (prevLiked ? -1 : 1) }
          : c
      )
    );
    try {
      const { liked, likeCount } = await auth.toggleCommentLike(comment.id);
      setComments((rows) =>
        rows.map((c) => (c.id === comment.id ? { ...c, likedByMe: liked, likeCount } : c))
      );
    } catch {
      setComments((rows) =>
        rows.map((c) =>
          c.id === comment.id ? { ...c, likedByMe: prevLiked, likeCount: prevCount } : c
        )
      );
    } finally {
      setCommentLikeBusy((m) => {
        const next = { ...m };
        delete next[comment.id];
        return next;
      });
    }
  };

  const saveSolutionEdit = async (e) => {
    e.preventDefault();
    if (editSaving) return;
    setEditError(null);
    setEditSaving(true);
    try {
      const tagList = editFields.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10);
      const { solution: s } = await auth.editSolution(id, {
        title: editFields.title.trim(),
        body: editFields.body.trim(),
        code: editFields.code,
        tags: tagList,
      });
      setSolution((prev) => (prev ? { ...prev, ...s, likedByMe: prev.likedByMe } : prev));
      setEditingSolution(false);
    } catch (err) {
      setEditError(err?.message ?? "Could not save solution.");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteSolution = async () => {
    if (!confirmSolutionDelete) {
      setConfirmSolutionDelete(true);
      return;
    }
    try {
      await auth.deleteSolution(id);
      setDeleted(true);
    } catch {
      setConfirmSolutionDelete(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      <main className="mx-auto w-full max-w-[1199px] flex-1 px-5 py-8 sm:px-[30px]">
        <div className="mx-auto w-full max-w-[760px]">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" aria-label="Nox home" className="Nox-focus block rounded-[14px]">
              <span className="block h-10 w-10 overflow-hidden rounded-[12px]">
                <Image
                  src="/Nox-logo.png"
                  alt=""
                  aria-hidden="true"
                  width={40}
                  height={40}
                  sizes="40px"
                  className="h-10 w-10 object-cover"
                />
              </span>
            </Link>
            <Link
              href={meUser ? "/dashboard" : "/login"}
              className={`Nox-focus inline-flex min-h-[40px] items-center rounded-pill bg-surface-1 px-[15px] py-2 text-[14px] font-medium text-ink no-underline hover:bg-surface-2 ${HOVER}`}
            >
              {meUser ? "Dashboard" : "Log in"}
            </Link>
          </div>

          {loading ? (
            <div className="animate-pulse" aria-hidden="true">
              <div className="h-8 w-3/4 rounded-md bg-surface-1" />
              <div className="mt-3 h-4 w-40 rounded bg-surface-1" />
              <div className="mt-6 h-64 rounded-xl bg-surface-1" />
            </div>
          ) : missing || deleted ? (
            <div className="rounded-xl bg-surface-1 p-8 text-center">
              <h1 className="Nox-display text-[24px] font-medium tracking-[-0.5px]">
                {deleted ? "Solution deleted." : "No write-up by that id."}
              </h1>
              <p className="mt-2 text-[14px] text-ink-muted">
                {deleted
                  ? "The author took it down."
                  : "It may have been removed, or the link is wrong."}
              </p>
              <Link
                href="/challenges"
                className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER} ${PRESS}`}
              >
                Browse challenges
              </Link>
            </div>
          ) : locked ? (
            <div className="rounded-xl bg-surface-1 p-8 text-center">
              <p className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                <Lock size={18} aria-hidden="true" />
              </p>
              <h1 className="Nox-display mt-3 text-[24px] font-medium tracking-[-0.5px]">
                Solve it to read this
              </h1>
              <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-[1.5] text-ink-muted">
                Write-ups stay hidden until you&apos;ve cracked the challenge yourself —
                that&apos;s what keeps them honest.
              </p>
              {locked.slug ? (
                <Link
                  href={`/challenges/${locked.slug}/solve`}
                  className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER} ${PRESS}`}
                >
                  Solve {locked.title}
                </Link>
              ) : (
                <Link
                  href={meUser ? "/challenges" : "/login"}
                  className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER} ${PRESS}`}
                >
                  {meUser ? "Browse challenges" : "Log in"}
                </Link>
              )}
            </div>
          ) : loadError ? (
            <div className="rounded-xl bg-surface-1 p-8 text-center">
              <p className="text-[15px] font-medium text-ink">Couldn&apos;t load this write-up</p>
              <p className="mt-1 text-[14px] text-ink-muted">{loadError}</p>
            </div>
          ) : solution ? (
            <div data-open={mounted} className="t-panel-slide Nox-auth-enter">
              {solution.challengeSlug ? (
                <Link
                  href={`/challenges/${solution.challengeSlug}#solutions`}
                  className={`Nox-focus inline-flex items-center gap-1.5 rounded text-[14px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
                >
                  ← {solution.challengeTitle ?? "Challenge"} solutions
                </Link>
              ) : null}

              <div className="mt-4 flex items-center gap-2.5">
                <Avatar
                  user={solution.author?.username ? solution.author : { ...solution.author, username: "?" }}
                  size={32}
                />
                <p className="min-w-0 flex-1 text-[14px] text-ink-muted">
                  <span className="font-medium text-ink">
                    {solution.author?.displayName ?? solution.author?.username ?? "…"}
                  </span>
                  <span> · {timeAgo(solution.createdAt)}</span>
                </p>
                {isAuthor && !editingSolution ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditFields({
                          title: solution.title ?? "",
                          body: solution.body ?? "",
                          code: solution.code ?? "",
                          tags: (solution.tags ?? []).join(", "),
                        });
                        setEditError(null);
                        setEditingSolution(true);
                      }}
                      aria-label="Edit solution"
                      className={`Nox-focus inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-muted hover:bg-surface-1 hover:text-ink ${HOVER}`}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={deleteSolution}
                      aria-label="Delete solution"
                      className={`Nox-focus inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-muted hover:bg-danger/15 hover:text-danger ${HOVER}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </span>
                ) : !isAuthor && meUser ? (
                  <span className="flex shrink-0 items-center">
                    <ReportButton
                      targetType="solution"
                      targetId={solution.id}
                      label="Report solution"
                    />
                  </span>
                ) : null}
              </div>

              {editingSolution ? (
                <form onSubmit={saveSolutionEdit} className="mt-4 rounded-xl bg-surface-1 p-5" aria-label="Edit solution">
                  <div className="flex flex-col gap-3">
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-ink-muted">Title</span>
                      <input
                        value={editFields.title}
                        onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))}
                        maxLength={100}
                        required
                        minLength={3}
                        className={fieldCls}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-ink-muted">Explanation</span>
                      <textarea
                        value={editFields.body}
                        onChange={(e) => setEditFields((f) => ({ ...f, body: e.target.value }))}
                        rows={6}
                        required
                        minLength={10}
                        maxLength={20000}
                        className={`${fieldCls} resize-y leading-[1.55]`}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-ink-muted">Fixed code</span>
                      <textarea
                        value={editFields.code}
                        onChange={(e) => setEditFields((f) => ({ ...f, code: e.target.value }))}
                        rows={8}
                        required
                        spellCheck={false}
                        className={`${fieldCls} resize-y font-mono text-[13px] leading-[1.6]`}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-ink-muted">Tags (comma-separated)</span>
                      <input
                        value={editFields.tags}
                        onChange={(e) => setEditFields((f) => ({ ...f, tags: e.target.value }))}
                        className={`${fieldCls} Nox-mono`}
                      />
                    </label>
                  </div>
                  {editError ? (
                    <p role="alert" className="mt-3 text-[13px] text-danger">{editError}</p>
                  ) : null}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center rounded-pill border-0 bg-white px-6 text-[14px] font-medium text-black disabled:opacity-70 ${HOVER}`}
                    >
                      {editSaving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSolution(false)}
                      className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center rounded-pill border-0 bg-surface-2 px-5 text-[14px] font-medium text-ink ${HOVER}`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h1 className="Nox-display mt-3 text-[30px] leading-[1.1] font-medium tracking-[-1px]">
                    {solution.title}
                  </h1>
                  <p className="mt-4 text-[15px] leading-[1.65] tracking-[-0.1px] whitespace-pre-wrap text-ink/90">
                    {solution.body}
                  </p>
                  <div className="mt-4">
                    <CodeBlock code={solution.code} />
                  </div>
                </>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <LikeButton
                  liked={solution.likedByMe}
                  count={solution.likeCount}
                  busy={likeBusy}
                  onToggle={toggleLike}
                  label="Like solution"
                />
                <span className="Nox-mono inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-surface-1 px-3 text-[13px] text-ink-muted">
                  <MessageSquare size={14} aria-hidden="true" />
                  {commentsTotal}
                </span>
                {(solution.tags ?? []).map((t) => (
                  <span key={t} className="Nox-mono text-[12px] text-ink-muted">#{t}</span>
                ))}
                {confirmSolutionDelete ? (
                  <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
                    Delete this write-up?
                    <button
                      type="button"
                      onClick={deleteSolution}
                      className={`Nox-focus cursor-pointer rounded-pill border-0 bg-danger/15 px-3 py-1 text-[13px] font-medium text-danger ${HOVER}`}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSolutionDelete(false)}
                      className={`Nox-focus cursor-pointer rounded-pill border-0 bg-surface-2 px-3 py-1 text-[13px] font-medium text-ink ${HOVER}`}
                    >
                      Keep
                    </button>
                  </span>
                ) : null}
              </div>

              {/* Thread */}
              <section aria-label="Comments" id="comments" className="mt-8 scroll-mt-6">
                <h2 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
                  Discussion
                  <span className="Nox-mono ml-2 text-[13px] text-ink-muted">{commentsTotal}</span>
                </h2>
                {comments.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {comments.map((c) => (
                      <CommentItem
                        key={c.id}
                        comment={c}
                        isMine={!!(myUsername && c.author?.username === myUsername)}
                        isFresh={!!fresh[c.id]}
                        likeBusy={!!commentLikeBusy[c.id]}
                        onLike={toggleCommentLike}
                        onEdit={editComment}
                        onDelete={deleteComment}
                        confirmDelete={confirmDeleteId === c.id}
                        showReport={!!meUser}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl bg-surface-1 p-5 text-[14px] text-ink-muted">
                    No comments yet — ask about the approach or share a sharper fix.
                  </p>
                )}
                {meUser ? (
                  <form onSubmit={postComment} className="mt-3 rounded-xl bg-surface-1 p-4">
                    <label htmlFor="comment-box" className="sr-only">Write a comment</label>
                    <textarea
                      id="comment-box"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Add to the discussion…"
                      rows={3}
                      maxLength={2000}
                      className={`${fieldCls} resize-y leading-[1.55]`}
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        className={`Nox-focus inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-pill border-0 bg-white px-5 text-[14px] font-medium text-black disabled:cursor-not-allowed disabled:opacity-50 ${HOVER} ${PRESS}`}
                      >
                        {sending ? (
                          <>
                            <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
                            Posting…
                          </>
                        ) : (
                          "Comment"
                        )}
                      </button>
                      <span className="Nox-mono text-[12px] text-ink-muted">
                        {draft.length}/2000
                      </span>
                    </div>
                    {composerError ? (
                      <p role="alert" className="mt-2 text-[13px] text-danger">{composerError}</p>
                    ) : null}
                  </form>
                ) : (
                  <p className="mt-3 rounded-xl bg-surface-1 p-5 text-[14px] text-ink-muted">
                    <Link href="/login" className="font-medium text-accent-blue no-underline hover:underline">
                      Log in
                    </Link>{" "}
                    to join the discussion.
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
