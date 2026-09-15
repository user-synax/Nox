"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FileCode2, FlaskConical, Lightbulb, Lock } from "lucide-react";
import { auth, LANGUAGES, INTERESTS } from "../../../../lib/auth";
import { recordRecent, swrGet } from "../../../../lib/workspace";
import { DifficultyBadge, KIND_LABEL, formatSuccess } from "../../../../components/ChallengeBits";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const TABS = ["Description", "Starter code", "Visible tests"];

function langLabel(slug) {
  return LANGUAGES.find((l) => l.slug === slug)?.label ?? slug;
}
function categoryLabel(slug) {
  return INTERESTS.find((t) => t.slug === slug)?.label ?? slug;
}

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

function MetaRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] text-ink-muted">{label}</dt>
      <dd className="text-right text-[14px] font-medium text-ink">{children}</dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-4 w-32 rounded bg-surface-1" />
      <div className="mt-4 h-9 w-3/4 rounded-md bg-surface-1" />
      <div className="mt-3 flex gap-2">
        <div className="h-6 w-16 rounded-pill bg-surface-1" />
        <div className="h-6 w-20 rounded-pill bg-surface-1" />
      </div>
      <div className="mt-6 h-40 rounded-xl bg-surface-1" />
    </div>
  );
}

export default function ChallengeDetailPage({ params }) {
  const { slug } = use(params);
  const [challenge, setChallenge] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [file, setFile] = useState(0);
  const [mounted, setMounted] = useState(false);
  const pillRef = useRef(null);
  const tabRefs = useRef([]);

  useEffect(() => {
    let alive = true;
    // IDB first: back-navigation from solve renders instantly.
    swrGet(
      `challenge:v1:${slug}`,
      () => auth.getChallenge(slug).then((r) => r.challenge),
      (c) => {
        if (!alive) return;
        setChallenge(c);
        recordRecent(c.slug, c.title);
      }
    ).catch((err) => {
      if (!alive) return;
      if (err?.status === 404) setMissing(true);
      else setError(err?.message ?? "Could not load challenge.");
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!challenge && !missing && !error) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [challenge, missing, error]);

  const movePill = (index, animate) => {
    const pill = pillRef.current;
    const el = tabRefs.current[index];
    if (!pill || !el) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.width = `${el.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.width = `${el.offsetWidth}px`;
    }
  };

  useEffect(() => {
    movePill(tab, false);
  });

  if (missing) {
    return (
      <div className="rounded-xl bg-surface-1 p-8 text-center">
        <h1 className="Nox-display text-[24px] font-medium tracking-[-0.5px] text-ink">
          No challenge by that name.
        </h1>
        <p className="mt-2 text-[14px] text-ink-muted">
          It may be a draft, removed, or the link is wrong.
        </p>
        <Link
          href="/challenges"
          className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER}`}
        >
          Browse challenges
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-surface-1 p-8 text-center">
        <p className="text-[15px] font-medium text-ink">Couldn&apos;t load this challenge</p>
        <p className="mt-1 text-[14px] text-ink-muted">{error}</p>
        <Link
          href="/challenges"
          className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER}`}
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  if (!challenge) return <Skeleton />;

  const files = challenge.starterFiles ?? [];
  const tests = challenge.visibleTests ?? [];
  const tabLabels = [
    "Description",
    `Starter code${files.length > 1 ? ` (${files.length})` : ""}`,
    `Visible tests (${tests.length})`,
  ];

  return (
    <div data-open={mounted} className="t-panel-slide Nox-auth-enter">
      <Link
        href="/challenges"
        className={`Nox-focus inline-flex items-center gap-1.5 rounded text-[14px] font-medium text-ink-muted hover:text-ink ${HOVER}`}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Challenges
      </Link>

      {/* Header */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {challenge.solved ? (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-pill bg-success/15 px-2.5 py-1 text-[12px] font-medium tracking-[-0.12px] text-success"
            >
              <Check size={13} strokeWidth={3} aria-hidden="true" />
              Completed
              {typeof challenge.solution?.score === "number" ? (
                <span className="Nox-mono opacity-80">{challenge.solution.score} pts</span>
              ) : null}
            </span>
          ) : (
            <DifficultyBadge level={challenge.difficulty} />
          )}
          <span className="Nox-mono rounded-pill bg-surface-1 px-2.5 py-1 text-[12px] text-ink-muted">
            {langLabel(challenge.language)}
          </span>
          <span className="text-[12px] text-ink-muted">
            {KIND_LABEL[challenge.kind] ?? challenge.kind}
          </span>
        </div>
        <h1 className="Nox-display mt-3 text-[30px] leading-[1.08] font-medium tracking-[-1px] text-ink sm:text-[36px]">
          {challenge.title}
        </h1>
        <p className="Nox-mono mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          <span>{challenge.solveCount ?? 0} solves</span>
          <span>{formatSuccess(challenge.successRate)} success</span>
          <span>~{challenge.estimatedSolveMinutes ?? 15} min</span>
          <span>v{challenge.version ?? 1}</span>
        </p>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href={`/challenges/${challenge.slug}/solve`}
          className={`Nox-focus inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill px-6 py-[10px] text-[14px] font-medium tracking-[-0.14px] no-underline ${challenge.solved ? "bg-surface-2 text-ink hover:bg-surface-1" : "bg-white text-black"} ${HOVER} ${PRESS}`}
        >
          {challenge.solved ? "Review solution" : "Start debugging"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <p className="text-[13px] text-ink-muted">
          {challenge.solved
            ? "Solved — your accepted snapshot is frozen and view-only."
            : "Your code autosaves as a local draft while you work."}
        </p>
      </div>

      {/* Tabs */}
      <div className="t-tabs mt-6" role="tablist" aria-label="Challenge sections">
        <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" />
        {tabLabels.map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={tab === i ? "true" : "false"}
            onClick={() => {
              setTab(i);
              movePill(i, true);
            }}
            className="t-tab Nox-focus px-4 text-[14px] font-medium"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {tab === 0 ? (
            <div className="rounded-xl bg-surface-1 p-5 sm:p-6">
              <p className="text-[15px] leading-[1.65] tracking-[-0.1px] whitespace-pre-wrap text-ink/90">
                {challenge.description}
              </p>
              {challenge.constraints ? (
                <div className="mt-6 border-t border-hairline-soft pt-4">
                  <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                    Constraints
                  </h2>
                  <p className="Nox-mono mt-2 text-[13px] leading-[1.6] text-ink">
                    {challenge.constraints}
                  </p>
                </div>
              ) : null}
            </div>
          ) : tab === 1 ? (
            <div className="flex flex-col gap-3">
              {files.length > 1 ? (
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Starter files">
                  {files.map((f, i) => (
                    <button
                      key={f.path}
                      type="button"
                      role="tab"
                      aria-selected={file === i ? "true" : "false"}
                      onClick={() => setFile(i)}
                      className={`Nox-focus inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md border-0 px-3 font-mono text-[13px] ${HOVER} ${
                        file === i
                          ? "bg-surface-2 text-ink"
                          : "bg-surface-1 text-ink-muted hover:text-ink"
                      }`}
                    >
                      <FileCode2 size={14} aria-hidden="true" />
                      {f.path}
                    </button>
                  ))}
                </div>
              ) : null}
              <CodeBlock code={files[file]?.content ?? ""} />
              <p className="text-[12px] text-ink-muted">
                Read-only preview — the editable workspace arrives with the editor.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tests.map((t, i) => (
                <div key={i} className="rounded-xl bg-surface-1 p-5">
                  <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
                    <FlaskConical size={15} aria-hidden="true" className="text-accent-blue" />
                    {t.name}
                  </p>
                  {t.description ? (
                    <p className="mt-1 text-[13px] text-ink-muted">{t.description}</p>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[12px] font-medium tracking-[0.04em] text-ink-muted">
                        INPUT
                      </p>
                      <pre className="overflow-x-auto rounded-md bg-black/40 p-3 font-mono text-[12.5px] leading-[1.55] text-ink/90">
                        {JSON.stringify(t.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[12px] font-medium tracking-[0.04em] text-ink-muted">
                        EXPECTED
                      </p>
                      <pre className="overflow-x-auto rounded-md bg-black/40 p-3 font-mono text-[12.5px] leading-[1.55] text-success">
                        {JSON.stringify(t.expected, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
              <p className="flex items-start gap-2 rounded-xl bg-surface-1 p-4 text-[13px] leading-[1.5] text-ink-muted">
                <Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                Plus hidden edge-case tests that run when you submit — no hardcoding the
                visible ones.
              </p>
            </div>
          )}
        </div>

        {/* Side card */}
        <aside className="h-fit rounded-xl bg-surface-1 p-5 lg:sticky lg:top-6">
          <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
            Details
          </h2>
          <dl className="mt-1 divide-y divide-hairline-soft">
            <MetaRow label="Category">{categoryLabel(challenge.category)}</MetaRow>
            <MetaRow label="Language">{langLabel(challenge.language)}</MetaRow>
            <MetaRow label="Time limit">{(challenge.timeLimitMs ?? 2000) / 1000}s</MetaRow>
            <MetaRow label="Memory">{challenge.memoryLimitMb ?? 64} MB</MetaRow>
            <MetaRow label="Attempts">{challenge.attemptCount ?? 0}</MetaRow>
          </dl>
          {(challenge.hints?.length ?? 0) > 0 ? (
            <div className="mt-4 border-t border-hairline-soft pt-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                <Lightbulb size={14} aria-hidden="true" />
                Hints ({challenge.hints.length})
              </h2>
              <div className="mt-2 flex flex-col gap-2">
                {challenge.hints.map((h, i) => (
                  <details
                    key={i}
                    className="group rounded-md bg-canvas px-3 py-2.5 text-[13.5px] leading-[1.5]"
                  >
                    <summary className="cursor-pointer list-none font-medium text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                      <span className="mr-2 inline-block transition-transform duration-[var(--duration-fast)] group-open:rotate-90">
                        →
                      </span>
                      Hint {i + 1}
                    </summary>
                    <p className="mt-1.5 text-ink-muted">{h}</p>
                  </details>
                ))}
              </div>
            </div>
          ) : null}
          {challenge.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-hairline-soft pt-4">
              {challenge.tags.map((t) => (
                <Link
                  key={t}
                  href={`/challenges?q=${encodeURIComponent(t)}`}
                  className="Nox-focus Nox-mono rounded-pill bg-canvas px-2.5 py-1 text-[12px] text-ink-muted no-underline hover:text-ink"
                >
                  #{t}
                </Link>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
