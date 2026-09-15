"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileCode2, FlaskConical, LayoutDashboard, Lock, RotateCcw } from "lucide-react";
import { auth, signOutAndLogin } from "../../../../lib/auth";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  recordRecent,
  swrGet,
} from "../../../../lib/workspace";
import { DifficultyBadge } from "../../../../components/ChallengeBits";

const CodeEditor = dynamic(
  () => import("../../../../components/CodeEditor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center" role="status">
        <p className="text-[14px] text-ink-muted">Loading editor…</p>
      </div>
    ),
  }
);

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";

function SaveStatus({ saving, dirtyCount, savedAt }) {
  const text = saving
    ? "Saving…"
    : dirtyCount > 0
      ? savedAt
        ? `Saved ${savedAt}`
        : "Local draft"
      : "Starter code";
  return (
    <span
      role="status"
      className="inline-flex min-h-[36px] items-center gap-2 rounded-pill bg-surface-1 px-[14px] text-[13px] font-medium text-ink-muted"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${saving ? "animate-pulse bg-accent-blue" : dirtyCount > 0 ? "bg-success" : "bg-ink-muted"}`}
      />
      {text}
    </span>
  );
}

export default function SolvePage({ params }) {
  const { slug } = use(params);
  const router = useRouter();
  const [challenge, setChallenge] = useState(null);
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState(null); // [{ path }]
  const [initialContents, setInitialContents] = useState(null);
  const [starters, setStarters] = useState({});
  const [activePath, setActivePath] = useState("");
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  const editorRef = useRef(null);
  const saveTimer = useRef(null);
  const challengeRef = useRef(null);
  const usernameRef = useRef("");

  useEffect(() => {
    challengeRef.current = challenge;
  }, [challenge]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      auth.meFull().catch(() => null),
      new Promise((resolve, reject) =>
        swrGet(
          `challenge:v1:${slug}`,
          () => auth.getChallenge(slug).then((r) => r.challenge),
          (data) => resolve(data),
          { ttlMs: 5 * 60 * 1000 }
        ).catch(reject)
      ),
    ]).then(async ([me, ch]) => {
      if (!alive) return;
      // Outside the (app) shell now — own the gate: a dead session clears
      // and bounces to /login instead of stranding drafts under "".
      if (!me?.user) {
        signOutAndLogin(router);
        return;
      }
      if (!ch) return;
      const user = me.user.username ?? "";
      usernameRef.current = user;
      setUsername(user);
      setChallenge(ch);
      recordRecent(ch.slug, ch.title);
      const metas = (ch.starterFiles ?? []).map((f) => ({ path: f.path }));
      const starterMap = Object.fromEntries((ch.starterFiles ?? []).map((f) => [f.path, f.content ?? ""]));
      setStarters(starterMap);
      const init = {};
      const dirtyMap = {};
      await Promise.all(
        metas.map(async (m) => {
          const draft = user ? await loadDraft(user, ch.slug, m.path) : null;
          init[m.path] = draft ?? starterMap[m.path] ?? "";
          if (draft != null && draft !== (starterMap[m.path] ?? "")) dirtyMap[m.path] = true;
        })
      );
      if (!alive) return;
      setFiles(metas);
      setInitialContents(init);
      setDirty(dirtyMap);
      setActivePath(metas[0]?.path ?? "");
    }).catch((err) => {
      if (!alive) return;
      if (err?.status === 404) setMissing(true);
      else setError(err?.message ?? "Could not load workspace.");
    });
    return () => {
      alive = false;
    };
  }, [slug, router]);

  useEffect(() => {
    if (!files) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [files]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const persist = useCallback((path, value) => {
    const user = usernameRef.current;
    const ch = challengeRef.current;
    if (!user || !ch) return;
    setSaving(true);
    saveDraft(user, ch.slug, path, value).then(() => {
      setSaving(false);
      setSavedAt(
        new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      );
    });
  }, []);

  const onContent = useCallback(
    (path, value) => {
      const starter = starters[path] ?? "";
      setDirty((d) => {
        const next = { ...d };
        if (value !== starter) next[path] = true;
        else delete next[path];
        return next;
      });
      clearTimeout(saveTimer.current);
      setSaving(true);
      saveTimer.current = setTimeout(() => persist(path, value), 800);
    },
    [starters, persist]
  );

  const flushSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    const editor = editorRef.current;
    if (editor && activePath) persist(activePath, editor.getValue(activePath));
  }, [activePath, persist]);

  const resetFile = useCallback(
    async (path) => {
      const target = path ?? activePath;
      if (!target) return;
      const user = usernameRef.current;
      const ch = challengeRef.current;
      if (user && ch) await clearDraft(user, ch.slug, target);
      editorRef.current?.setValue(target, starters[target] ?? "");
      setDirty((d) => {
        const next = { ...d };
        delete next[target];
        return next;
      });
    },
    [activePath, starters]
  );

  const resetAll = useCallback(async () => {
    const user = usernameRef.current;
    const ch = challengeRef.current;
    for (const f of files ?? []) {
      if (user && ch) await clearDraft(user, ch.slug, f.path);
      editorRef.current?.setValue(f.path, starters[f.path] ?? "");
    }
    setDirty({});
  }, [files, starters]);

  if (missing) {
    return (
      <div className="flex min-h-dvh flex-col bg-canvas font-body text-ink">
        <main className="grid flex-1 place-items-center px-5">
          <div className="w-full max-w-[400px] rounded-xl bg-surface-1 p-8 text-center">
            <h1 className="Nox-display text-[24px] font-medium text-ink">No challenge by that name.</h1>
            <Link
              href="/challenges"
              className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center rounded-pill bg-white px-6 text-[14px] font-medium text-black no-underline ${HOVER}`}
            >
              Browse challenges
            </Link>
          </div>
        </main>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-dvh flex-col bg-canvas font-body text-ink">
        <main className="grid flex-1 place-items-center px-5">
          <div className="w-full max-w-[400px] rounded-xl bg-surface-1 p-8 text-center">
            <p className="text-[15px] font-medium text-ink">Couldn&apos;t open the workspace</p>
            <p className="mt-1 text-[14px] text-ink-muted">{error}</p>
          </div>
        </main>
      </div>
    );
  }
  if (!challenge || !files || !initialContents) {
    return (
      <div className="flex min-h-dvh flex-col bg-canvas font-body text-ink">
        <div className="h-14 border-b border-hairline-soft" />
        <div className="animate-pulse px-4 py-4 sm:px-5" aria-hidden="true">
          <div className="h-6 w-1/3 rounded-md bg-surface-1" />
          <div className="mt-4 h-[70vh] rounded-xl bg-surface-1" />
        </div>
      </div>
    );
  }

  const dirtyCount = Object.keys(dirty).length;
  const tests = challenge.visibleTests ?? [];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas font-body text-ink">
      {/* Workspace top bar — the only chrome on this page */}
      <header className="sticky top-0 z-40 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Link
            href="/dashboard"
            className={`Nox-focus inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-pill bg-surface-1 px-[14px] text-[13px] font-medium text-ink no-underline hover:bg-surface-2 sm:text-[14px] ${HOVER}`}
          >
            <LayoutDashboard size={15} aria-hidden="true" />
            Back to Dashboard
          </Link>
          <span aria-hidden="true" className="hidden h-5 w-px bg-hairline-soft sm:block" />
          <h1 className="Nox-display min-w-0 flex-1 truncate text-[16px] font-medium tracking-[-0.3px] text-ink sm:text-[18px]">
            {challenge.title}
          </h1>
          <span className="hidden shrink-0 sm:block">
            <DifficultyBadge level={challenge.difficulty} />
          </span>
          <span className="shrink-0">
            <SaveStatus saving={saving} dirtyCount={dirtyCount} savedAt={savedAt} />
          </span>
        </div>
      </header>

      <main data-open={mounted} className="t-panel-slide Nox-auth-enter mx-auto w-full max-w-[1600px] flex-1 px-3 py-3 sm:px-5 sm:py-4">
      {/* Overview link lives with the file areas below to keep the bar minimal */}
      <div className="mb-3 flex items-center gap-3 px-1">
        <Link
          href={`/challenges/${challenge.slug}`}
          className={`Nox-focus inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Challenge overview
        </Link>
      </div>

      {/* File pills (mobile / narrow) */}
      {files.length > 1 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" role="tablist" aria-label="Files">
          {files.map((f) => (
            <button
              key={f.path}
              type="button"
              role="tab"
              aria-selected={activePath === f.path}
              onClick={() => setActivePath(f.path)}
              className={`Nox-focus inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-0 px-3 font-mono text-[13px] ${HOVER} ${
                activePath === f.path ? "bg-surface-2 text-ink" : "bg-surface-1 text-ink-muted hover:text-ink"
              }`}
            >
              {dirty[f.path] ? (
                <span aria-label="unsaved changes" className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
              ) : null}
              {f.path}
            </button>
          ))}
        </div>
      ) : null}

      {/* Workspace — full viewport height on desktop, stacked on mobile */}
      <div className="grid gap-2 lg:h-[calc(100dvh-11.5rem)] lg:min-h-[520px] lg:grid-cols-[230px_minmax(0,1fr)_310px]">
        {/* Explorer (desktop) */}
        <div className="hidden rounded-xl bg-surface-1 p-3 lg:block lg:min-h-0 lg:overflow-y-auto">
          <p className="px-2 pt-1 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-muted">
            FILES
          </p>
          <div className="flex flex-col gap-1" role="tablist" aria-label="Files">
            {files.map((f) => (
              <button
                key={f.path}
                type="button"
                role="tab"
                aria-selected={activePath === f.path}
                onClick={() => setActivePath(f.path)}
                className={`Nox-focus flex cursor-pointer items-center gap-2 rounded-md border-0 px-3 py-2.5 text-left font-mono text-[13px] ${HOVER} ${
                  activePath === f.path ? "bg-surface-2 text-ink" : "bg-transparent text-ink-muted hover:bg-surface-2/60 hover:text-ink"
                }`}
              >
                <FileCode2 size={14} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{f.path}</span>
                {dirty[f.path] ? (
                  <span aria-label="unsaved changes" className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent-blue" />
                ) : null}
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-hairline-soft pt-3">
            <button
              type="button"
              onClick={() => resetFile()}
              className={`Nox-focus flex w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-left text-[13px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset this file
            </button>
            {files.length > 1 ? (
              <button
                type="button"
                onClick={resetAll}
                className={`Nox-focus flex w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-left text-[13px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
              >
                <RotateCcw size={13} aria-hidden="true" />
                Reset all files
              </button>
            ) : null}
          </div>
        </div>

        {/* Editor */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-hairline-soft bg-[#11161C]">
          <div className="h-[62vh] min-h-[420px] flex-1 lg:h-auto lg:min-h-0">
            <CodeEditor
              ref={editorRef}
              files={files}
              activePath={activePath}
              initialContents={initialContents}
              onContent={onContent}
              onRequestSave={flushSave}
            />
          </div>
        </div>

        {/* Tests */}
        <div className="flex min-h-0 flex-col gap-2 lg:overflow-y-auto">
          <div className="rounded-xl bg-surface-1 p-4">
            <h2 className="flex items-center gap-2 text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
              <FlaskConical size={14} aria-hidden="true" />
              Visible tests ({tests.length})
            </h2>
            <ul className="mt-3 flex max-h-[300px] flex-col gap-2 overflow-y-auto lg:max-h-none">
              {tests.map((t, i) => (
                <li key={i} className="rounded-md bg-canvas px-3 py-2.5">
                  <p className="text-[13.5px] font-medium text-ink">{t.name}</p>
                  <p className="Nox-mono mt-1 truncate text-[12px] text-ink-muted">
                    → {JSON.stringify(t.expected)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-surface-1 p-4">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-pill bg-white px-4 text-[14px] font-medium text-black opacity-50"
            >
              <Lock size={15} aria-hidden="true" />
              Run tests
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className={`mt-2 inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center rounded-pill bg-surface-2 px-4 text-[14px] font-medium text-ink-muted ${HOVER}`}
            >
              Submit
            </button>
            <p className="mt-3 text-[12px] leading-[1.5] text-ink-muted">
              Drafts autosave locally. Running + judging arrive with the execution engine.
            </p>
            <div className="mt-3 flex gap-2 border-t border-hairline-soft pt-3 lg:hidden">
              <button
                type="button"
                onClick={() => resetFile()}
                className={`Nox-focus flex-1 cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-[13px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
              >
                Reset file
              </button>
              {files.length > 1 ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className={`Nox-focus flex-1 cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-[13px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
                >
                  Reset all
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
