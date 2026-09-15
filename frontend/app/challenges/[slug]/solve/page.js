"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, FileCode2, FlaskConical, LayoutDashboard, LoaderCircle, RotateCcw, X } from "lucide-react";
import { API_BASE, auth, rankFor, signOutAndLogin } from "../../../../lib/auth";
import { StatNumber } from "../../../../components/Stat";
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

const TERMINAL_RUN = ["passed", "failed", "timeout", "runtime-error", "system-error"];

function cleanOutput(output) {
  return String(output ?? "")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("NOX_RESULT:"))
    .join("\n")
    .trim()
    .slice(-3000);
}

/** Builds the terminal entry for a run/submission verdict (null = clear). */
function toTerminalEntry(run) {
  if (!run) return null;
  const output = cleanOutput(run.output);
  const testErrors = (run.results ?? [])
    .filter((r) => !r.passed && r.error)
    .map((r) => `── ${r.name} ──\n${r.error}`)
    .join("\n\n");
  if (["timeout", "runtime-error", "system-error"].includes(run.status)) {
    const body = [run.error, testErrors, output ? `── output ──\n${output}` : null]
      .filter(Boolean)
      .join("\n\n");
    return {
      title: run.status === "timeout" ? "Execution timed out" : "Runtime error",
      body,
      tone: "error",
    };
  }
  if (run.status === "failed") {
    if (!testErrors && !output) return null;
    return {
      title: testErrors ? "Test errors" : "Program output",
      body: [testErrors, output ? `── output ──\n${output}` : null]
        .filter(Boolean)
        .join("\n\n"),
      tone: testErrors ? "error" : "muted",
    };
  }
  return output ? { title: "Program output", body: output, tone: "ok" } : null;
}

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

/**
 * Virtual terminal — the only place runtime errors are shown. Collapsible,
 * auto-expands on errors, Ctrl+` toggles. entry: { title, body, tone }.
 */
function Terminal({ entry, open, onToggle, onClear }) {
  const dot =
    !entry || entry.tone === "muted"
      ? "bg-ink-muted"
      : entry.tone === "error"
        ? "bg-danger"
        : "bg-success";
  return (
    <div className="border-t border-hairline-soft bg-canvas">
      <div className="flex items-center gap-1 px-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="solve-terminal"
          className="Nox-focus flex min-h-[36px] flex-1 cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-2 text-left"
        >
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span className="text-[11px] font-medium tracking-[0.08em] text-ink-muted">
            TERMINAL
          </span>
          {entry ? (
            <span className="truncate text-[12px] text-ink-muted">{entry.title}</span>
          ) : null}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`ml-auto shrink-0 text-ink-muted transition-transform duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] ${open ? "" : "-rotate-90"}`}
          />
        </button>
        {entry ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear terminal"
            className={`Nox-focus inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-muted hover:bg-surface-1 hover:text-ink ${HOVER}`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div
        id="solve-terminal"
        className={`overflow-hidden transition-[max-height] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] ${open && entry ? "max-h-56" : "max-h-0"}`}
      >
        <pre className="max-h-56 overflow-y-auto px-4 pt-1 pb-3 font-mono text-[12px] leading-[1.6] whitespace-pre-wrap text-ink/85">
          {entry?.body ?? ""}
        </pre>
      </div>
    </div>
  );
}

function ScoreRow({ label, value, max }) {  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-ink-muted">{label}</span>
        <span className="Nox-mono text-ink">
          {value}
          <span className="text-ink-muted">/{max}</span>
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Submit verdict — accepted celebration (success check + score breakdown
 * + XP/rating deltas + rank-up) or rejection with failed hidden test
 * NAMES only (inputs stay server-side).
 */
function VerdictCard({ result, preRating, onDismiss }) {
  const accepted = result?.status === "accepted";
  const failed = (result?.results ?? []).filter((r) => !r.passed);
  const b = result?.scoreBreakdown;
  const newRating = (preRating ?? 0) + (result?.ratingDelta ?? 0);
  const rankedUp =
    preRating != null &&
    rankFor(preRating) !== rankFor(newRating);

  return (
    <div
      key={result?.id ?? "verdict"}
      role="status"
      className={`rounded-xl p-5 ${accepted ? "bg-success/10" : "bg-surface-1"}`}
      style={accepted ? { boxShadow: "var(--shadow-ring-focus)" } : undefined}
    >
      <div className="flex items-start gap-4">
        {accepted ? (
          <span className="t-success-check mt-1 shrink-0" data-state="in" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
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
        ) : (
          <span
            aria-hidden="true"
            className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger"
          >
            <X size={20} strokeWidth={2.5} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="Nox-display text-[22px] leading-[1.15] font-medium tracking-[-0.5px] text-ink">
            {accepted
              ? "Accepted"
              : result?.status === "rejected"
                ? "Not quite — hidden tests caught it"
                : result?.status === "timeout"
                  ? "Timed out on hidden tests"
                  : "Couldn't judge that run"}
          </h2>
          {accepted ? (
            <p className="mt-1 text-[14px] text-ink-muted">
              All hidden tests passed. <StatNumber value={result.score} className="text-ink" /> points.
            </p>
          ) : result?.status === "rejected" ? (
            <p className="mt-1 text-[14px] text-ink-muted">
              {failed.length} hidden test{failed.length === 1 ? "" : "s"} failed — no inputs shown,
              that&apos;s the point. Debug it blind.
            </p>
          ) : (
            <p className="mt-1 font-mono text-[12.5px] whitespace-pre-wrap text-danger">
              {result?.error ?? "Unknown judging failure."}
            </p>
          )}
        </div>
      </div>

      {accepted && b ? (
        <div className="mt-4 flex flex-col gap-2.5 rounded-xl bg-canvas/60 p-4">
          <ScoreRow label="Correctness" value={b.correctness} max={70} />
          <ScoreRow label="Efficiency" value={b.efficiency} max={15} />
          <ScoreRow label="Speed" value={b.speed} max={10} />
          <ScoreRow label="Quality" value={b.quality} max={5} />
        </div>
      ) : null}

      {result?.status === "rejected" && failed.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1.5">
          {failed.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md bg-canvas px-3 py-2 text-[13.5px] text-ink"
            >
              <X size={13} strokeWidth={3} aria-hidden="true" className="shrink-0 text-danger" />
              <span className="truncate">{f.name}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="Nox-mono mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <span className={result?.xpAwarded ? "text-success" : "text-ink-muted"}>
          {result?.xpAwarded ? `+${result.xpAwarded} XP` : "+0 XP"}
        </span>
        <span className={(result?.ratingDelta ?? 0) >= 0 ? "text-success" : "text-danger"}>
          {`${(result?.ratingDelta ?? 0) >= 0 ? "+" : ""}${result?.ratingDelta ?? 0} rating`}
        </span>
        {rankedUp ? (
          <span className="text-accent-blue">Rank up: {rankFor(newRating)}!</span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/challenges"
          className={`Nox-focus inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-5 text-[14px] font-medium text-black no-underline ${HOVER}`}
        >
          Back to catalog
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-2 px-5 text-[14px] font-medium text-ink ${HOVER}`}
        >
          Keep debugging
        </button>
      </div>
    </div>
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
  // Run lifecycle: idle → queued → running → done (runResult set) / error.
  const [runPhase, setRunPhase] = useState("idle");
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState(null);
  const [runNotice, setRunNotice] = useState(null);
  // Submit lifecycle: same shape, verdict lands in submitResult (submission).
  const [submitPhase, setSubmitPhase] = useState("idle");
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [preRating, setPreRating] = useState(null);
  // Virtual terminal: errors live here, never in the tests list.
  const [terminal, setTerminal] = useState(null);
  const [termOpen, setTermOpen] = useState(false);

  const editorRef = useRef(null);
  const saveTimer = useRef(null);
  const pollTimer = useRef(null);
  const submitTimer = useRef(null);
  const workerHintShown = useRef(false);
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
      // Locked (solved): render the ACCEPTED snapshot read-only. Drafts
      // are ignored — there is nothing left to edit or retry.
      const locked = !!ch.solved;
      const sourceFiles =
        locked && ch.solution?.files?.length ? ch.solution.files : ch.starterFiles ?? [];
      const metas = sourceFiles.map((f) => ({ path: f.path }));
      const starterMap = Object.fromEntries((ch.starterFiles ?? []).map((f) => [f.path, f.content ?? ""]));
      setStarters(starterMap);
      const solutionMap = Object.fromEntries(sourceFiles.map((f) => [f.path, f.content ?? ""]));
      const init = {};
      const dirtyMap = {};
      await Promise.all(
        metas.map(async (m) => {
          if (locked) {
            init[m.path] = solutionMap[m.path] ?? "";
            return;
          }
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

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      clearTimeout(pollTimer.current);
      clearTimeout(submitTimer.current);
    },
    []
  );

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

  const toggleTerminal = useCallback(() => setTermOpen((o) => !o), []);

  const showTerminal = useCallback((run) => {
    const entry = toTerminalEntry(run);
    setTerminal(entry);
    if (entry?.tone === "error") setTermOpen(true);
  }, []);

  const flushSave = useCallback(() => {
    if (challengeRef.current?.solved) return; // locked: nothing to persist
    clearTimeout(saveTimer.current);
    const editor = editorRef.current;
    if (editor && activePath) persist(activePath, editor.getValue(activePath));
  }, [activePath, persist]);
  const onRun = useCallback(async () => {
    const editor = editorRef.current;
    const ch = challengeRef.current;
    if (!editor || !ch || !files || runPhase === "queued" || runPhase === "running") return;
    clearTimeout(pollTimer.current);
    workerHintShown.current = false;
    setRunError(null);
    setRunNotice(null);
    setRunResult(null);
    setRunPhase("queued");
    setTerminal({ title: "Running tests…", body: "", tone: "muted" });
    flushSave();
    try {
      const payload = files.map((f) => ({
        path: f.path,
        content: editor.getValue(f.path),
      }));
      const { runId } = await auth.runTests(ch.slug, payload);
      setRunPhase("running");
      const started = Date.now();
      const tick = async () => {
        let run = null;
        try {
          run = (await auth.getRun(runId)).run;
        } catch {
          /* transient — keep polling */
        }
        if (run && TERMINAL_RUN.includes(run.status)) {
          setRunResult(run);
          setRunNotice(null);
          setRunPhase("done");
          showTerminal(run);
          return;
        }
        // Still queued after 5s: ask the API whether any worker is even
        // alive, so the message names the real problem (usually a worker
        // that was never started) instead of spinning silently.
        if (run && run.status === "queued" && Date.now() - started > 5000) {
          if (!workerHintShown.current) {
            workerHintShown.current = true;
            fetch(`${API_BASE}/api/health`)
              .then((r) => r.json())
              .then((h) =>
                setRunNotice(
                  h.workersOnline === 0
                    ? "No worker is running — start one with `bun run worker` in backend/."
                    : "Queued — a worker will pick this up shortly."
                )
              )
              .catch(() => setRunNotice("Waiting for a worker to pick this up…"));
          }
        }
        if (Date.now() - started > 60000) {
          setRunError("Still working — keep waiting or run again.");
          setRunPhase("idle");
          return;
        }
        pollTimer.current = setTimeout(tick, 400);
      };
      pollTimer.current = setTimeout(tick, 150);
    } catch (err) {
      setRunError(err.message);
      setTerminal(null);
      setRunPhase("idle");
    }
  }, [files, flushSave, runPhase, showTerminal]);

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

  const onSubmit = useCallback(async () => {
    const editor = editorRef.current;
    const ch = challengeRef.current;
    if (!editor || !ch || !files) return;
    if (submitPhase === "queued" || submitPhase === "running") return;
    if (runPhase === "queued" || runPhase === "running") return;
    clearTimeout(submitTimer.current);
    workerHintShown.current = false;
    setSubmitError(null);
    setSubmitResult(null);
    setSubmitPhase("queued");
    flushSave();
    try {
      // Snapshot the pre-submit rating for the rank-up callout.
      try {
        const me = await auth.meFull();
        setPreRating(me?.stats?.rating ?? null);
      } catch {
        setPreRating(null);
      }
      const payload = files.map((f) => ({
        path: f.path,
        content: editor.getValue(f.path),
      }));
      const { submissionId } = await auth.submitChallenge(ch.slug, payload);
      setSubmitPhase("running");
      const started = Date.now();
      const tick = async () => {
        let sub = null;
        try {
          sub = (await auth.getSubmission(submissionId)).submission;
        } catch {
          /* transient — keep polling */
        }
        if (sub && sub.status !== "pending") {
          setSubmitResult(sub);
          setSubmitPhase("done");
          showTerminal(sub);
          return;
        }
        // Pending past 8s with no worker alive = the dev worker is down.
        // Name it instead of letting "Judging…" spin toward the 90s cap.
        if (sub?.status === "pending" && Date.now() - started > 8000 && !workerHintShown.current) {
          workerHintShown.current = true;
          fetch(`${API_BASE}/api/health`)
            .then((r) => r.json())
            .then((h) => {
              if (h.workersOnline === 0) {
                setSubmitError("No worker is running — start one with `bun run worker` in backend/.");
                setSubmitPhase("idle");
                clearTimeout(submitTimer.current);
              }
            })
            .catch(() => {});
        }
        if (Date.now() - started > 90000) {
          setSubmitError("Judging is taking a while — check back shortly.");
          setSubmitPhase("idle");
          return;
        }
        submitTimer.current = setTimeout(tick, 600);
      };
      submitTimer.current = setTimeout(tick, 300);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitPhase("idle");
    }
  }, [files, flushSave, submitPhase, runPhase, showTerminal]);

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
  const locked = !!challenge.solved;

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
            {locked ? (
              <span
                role="status"
                className="inline-flex min-h-[36px] items-center gap-2 rounded-pill bg-success/15 px-[14px] text-[13px] font-medium text-success"
              >
                <Check size={14} strokeWidth={3} aria-hidden="true" />
                Completed
              </span>
            ) : (
              <SaveStatus saving={saving} dirtyCount={dirtyCount} savedAt={savedAt} />
            )}
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
            {locked ? (
              <p className="px-3 py-2 text-[12px] leading-[1.5] text-ink-muted">
                Solved — this snapshot is frozen.
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Editor + terminal (terminal only while solvable) */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-hairline-soft bg-[#11161C]">
          <div className="h-[62vh] min-h-[420px] flex-1 lg:h-auto lg:min-h-0">
            <CodeEditor
              ref={editorRef}
              files={files}
              activePath={activePath}
              initialContents={initialContents}
              onContent={onContent}
              onRequestSave={flushSave}
              onToggleTerminal={toggleTerminal}
              readOnly={locked}
            />
          </div>
          {locked ? null : (
            <Terminal
              entry={terminal}
              open={termOpen}
              onToggle={toggleTerminal}
              onClear={() => setTerminal(null)}
            />
          )}
        </div>

        {/* Tests */}
        <div className="flex min-h-0 flex-col gap-2 lg:overflow-y-auto">
          {submitResult && submitPhase === "done" ? (
            <VerdictCard
              result={submitResult}
              preRating={preRating}
              onDismiss={() => {
                setSubmitResult(null);
                setSubmitPhase("idle");
              }}
            />
          ) : null}
          <div className="rounded-xl bg-surface-1 p-4">
            <h2 className="flex items-center gap-2 text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
              <FlaskConical size={14} aria-hidden="true" />
              Visible tests ({tests.length})
              {runResult ? (
                <span
                  className={`ml-auto rounded-pill px-2 py-0.5 text-[11px] font-medium ${
                    runResult.status === "passed"
                      ? "bg-success/15 text-success"
                      : "bg-danger/15 text-danger"
                  }`}
                  role="status"
                >
                  {runResult.status === "passed"
                    ? "Passed"
                    : runResult.status === "failed"
                      ? `${runResult.testsPassed}/${runResult.testsTotal} passed`
                      : runResult.status}
                </span>
              ) : null}
            </h2>
            <ul className="mt-3 flex max-h-[300px] flex-col gap-2 overflow-y-auto lg:max-h-none">
              {(runResult?.results?.length ? runResult.results : tests).map((t, i) => {
                const verdict = runResult?.results?.length ? t.passed : null;
                return (
                  <li key={i} className="rounded-md bg-canvas px-3 py-2.5">
                    <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                      {verdict === true ? (
                        <Check size={14} strokeWidth={3} aria-label="passed" className="shrink-0 text-success" />
                      ) : verdict === false ? (
                        <X size={14} strokeWidth={3} aria-label="failed" className="shrink-0 text-danger" />
                      ) : null}
                      <span className="truncate">{t.name}</span>
                    </p>
                    {verdict === false && t.error ? (
                      <p className="mt-1 text-[12px] text-ink-muted">
                        Errored — details in the terminal below.
                      </p>
                    ) : verdict === false ? (
                      <div className="Nox-mono mt-1.5 grid gap-1 text-[11.5px] leading-[1.5]">
                        <p className="truncate text-ink-muted">
                          want <span className="text-success">{JSON.stringify(t.expected)}</span>
                        </p>
                        <p className="truncate text-ink-muted">
                          got <span className="text-danger">{JSON.stringify(t.actual)}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="Nox-mono mt-1 truncate text-[12px] text-ink-muted">
                        → {JSON.stringify(t.expected ?? tests[i]?.expected)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {runError ? (
              <p role="alert" className="mt-3 text-[12.5px] leading-[1.5] text-danger">
                {runError}
              </p>
            ) : null}
            {runNotice && !runError ? (
              <p role="status" className="mt-3 text-[12.5px] leading-[1.5] text-ink-muted">
                {runNotice}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-surface-1 p-4">
            {locked ? (
              <div role="status">
                <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                  Completed
                  {typeof challenge.solution?.score === "number" ? (
                    <span className="Nox-mono ml-auto text-[13px] text-ink-muted">
                      {challenge.solution.score} pts
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-[13px] leading-[1.5] text-ink-muted">
                  Accepted
                  {challenge.solution?.solvedAt
                    ? ` ${new Date(challenge.solution.solvedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
                  {" "}· this snapshot is frozen. No edits, no re-runs.
                </p>
                <Link
                  href="/challenges"
                  className={`Nox-focus mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-pill bg-white px-4 text-[14px] font-medium text-black no-underline ${HOVER}`}
                >
                  Back to catalog
                </Link>
              </div>
            ) : (
              <>
            <button
              type="button"
              onClick={onRun}
              disabled={runPhase === "queued" || runPhase === "running"}
              className={`Nox-focus inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-white px-4 text-[14px] font-medium text-black disabled:cursor-wait disabled:opacity-70 ${HOVER}`}
            >
              {runPhase === "queued" || runPhase === "running" ? (
                <>
                  <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />
                  {runPhase === "queued" ? "Queued…" : "Running…"}
                </>
              ) : (
                "Run tests"
              )}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={
                submitPhase === "queued" ||
                submitPhase === "running" ||
                runPhase === "queued" ||
                runPhase === "running"
              }
              className={`Nox-focus mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-surface-2 px-4 text-[14px] font-medium text-ink disabled:cursor-wait disabled:opacity-70 ${HOVER}`}
            >
              {submitPhase === "queued" || submitPhase === "running" ? (
                <>
                  <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />
                  {submitPhase === "queued" ? "Queued…" : "Judging…"}
                </>
              ) : (
                "Submit"
              )}
            </button>
            {submitError ? (
              <p role="alert" className="mt-3 text-[12.5px] leading-[1.5] text-danger">
                {submitError}
              </p>
            ) : null}
            <p className="mt-3 text-[12px] leading-[1.5] text-ink-muted">
              {runResult?.executionTimeMs != null
                ? `Last run took ${runResult.executionTimeMs} ms. `
                : ""}
              Drafts autosave locally. Hidden tests judge on submit.
            </p>
              </>
            )}
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
