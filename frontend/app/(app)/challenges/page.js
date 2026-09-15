"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { auth, LANGUAGES, INTERESTS } from "../../../lib/auth";
import { DifficultyBadge, KIND_LABEL, formatSuccess } from "../../../components/ChallengeBits";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";

const TABS = [
  { key: "recommended", label: "Recommended", sort: "recommended" },
  { key: "all", label: "All", sort: "popular" },
  { key: "newest", label: "Newest", sort: "newest" },
  { key: "trending", label: "Trending", sort: "trending" },
];

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="Nox-focus min-h-[44px] w-full cursor-pointer appearance-none rounded-md bg-surface-1 pr-9 pl-[14px] text-[14px] font-medium text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-surface-1 p-5" aria-hidden="true">
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-pill bg-surface-2" />
        <div className="h-6 w-20 rounded-pill bg-surface-2" />
      </div>
      <div className="mt-4 h-6 w-3/4 rounded-md bg-surface-2" />
      <div className="mt-2 h-4 w-full rounded bg-surface-2" />
      <div className="mt-1 h-4 w-2/3 rounded bg-surface-2" />
      <div className="mt-4 h-4 w-40 rounded bg-surface-2" />
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <Suspense>
      <ChallengesInner />
    </Suspense>
  );
}

function ChallengesInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(searchParams.get("q")?.trim() ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const pillRef = useRef(null);
  const tabRefs = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
      setLoading(true);
      setError(null);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    auth
      .listChallenges({
        q: debouncedQ || undefined,
        difficulty: difficulty || undefined,
        language: language || undefined,
        category: category || undefined,
        sort: TABS[tab].sort,
        page,
        limit: 12,
      })
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (alive) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [tab, debouncedQ, difficulty, language, category, page, attempt]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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

  const activeFilters = [difficulty, language, category].filter(Boolean).length;
  // New queries always show the loading state first (event handlers only —
  // the fetch effect itself never sets state synchronously).
  const touch = () => {
    setLoading(true);
    setError(null);
  };
  const clearAll = () => {
    setQ("");
    setDebouncedQ("");
    setDifficulty("");
    setLanguage("");
    setCategory("");
    setPage(1);
    touch();
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div data-open={mounted} className="t-panel-slide Nox-auth-enter">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="Nox-display text-[30px] leading-[1.1] font-medium tracking-[-1px] text-ink">
            Challenges
          </h1>
          <p className="mt-2 text-[15px] tracking-[-0.15px] text-ink-muted" role="status">
            {loading && !data
              ? "Finding broken code…"
              : `${total} challenge${total === 1 ? "" : "s"}${debouncedQ ? ` for “${debouncedQ}”` : ""}`}
          </p>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="t-tabs mt-6" role="tablist" aria-label="Sort challenges">
        <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" />
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={tab === i ? "true" : "false"}
            onClick={() => {
              setTab(i);
              setPage(1);
              touch();
              movePill(i, true);
            }}
            className="t-tab Nox-focus px-4 text-[14px] font-medium"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-ink-muted"
          />
          <label htmlFor="ch-search" className="sr-only">
            Search challenges
          </label>
          <input
            id="ch-search"
            type="search"
            placeholder="Search titles, descriptions, tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="Nox-focus w-full rounded-md bg-surface-1 py-[10px] pr-[14px] pl-10 text-[15px] text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FilterSelect
            id="ch-difficulty"
            label="Difficulty"
            value={difficulty}
            onChange={(v) => {
              setDifficulty(v);
              setPage(1);
              touch();
            }}
            options={[
              { value: "", label: "All levels" },
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
              { value: "expert", label: "Expert" },
            ]}
          />
          <FilterSelect
            id="ch-language"
            label="Language"
            value={language}
            onChange={(v) => {
              setLanguage(v);
              setPage(1);
              touch();
            }}
            options={[
              { value: "", label: "All languages" },
              ...LANGUAGES.map((l) => ({ value: l.slug, label: l.label })),
            ]}
          />
          <FilterSelect
            id="ch-category"
            label="Category"
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
              touch();
            }}
            options={[
              { value: "", label: "All categories" },
              ...INTERESTS.map((t) => ({ value: t.slug, label: t.label })),
            ]}
          />
          <button
            type="button"
            onClick={clearAll}
            disabled={activeFilters === 0 && !debouncedQ}
            className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-md border-0 bg-transparent px-[14px] text-[14px] font-medium text-ink-muted hover:bg-surface-1 hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted ${HOVER}`}
          >
            <X size={15} aria-hidden="true" />
            Clear{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        {error ? (
          <div className="rounded-xl bg-surface-1 p-8 text-center">
            <p className="text-[15px] font-medium text-ink">Couldn&apos;t load challenges</p>
            <p className="mt-1 text-[14px] text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={() => { setAttempt((a) => a + 1); touch(); }}
              className={`Nox-focus mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-pill bg-white px-6 text-[14px] font-medium text-black ${HOVER}`}
            >
              Retry
            </button>
          </div>
        ) : loading && !data ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="rounded-xl bg-surface-1 p-8 text-center">
            <p className="text-[15px] font-medium text-ink">No challenges match those filters</p>
            <p className="mt-1 text-[14px] text-ink-muted">
              Try widening the net — or clear everything and browse.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className={`Nox-focus mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-pill bg-white px-6 text-[14px] font-medium text-black ${HOVER}`}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.items.map((c) => (
                <Link
                  key={c.slug}
                  href={`/challenges/${c.slug}`}
                  className={`Nox-focus group block rounded-xl bg-surface-1 p-5 no-underline transition-[border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:-translate-y-0.5 hover:bg-surface-2 ${HOVER}`}
                  style={{ border: "1px solid transparent" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <DifficultyBadge level={c.difficulty} />
                    <span className="Nox-mono rounded-pill bg-canvas px-2.5 py-1 text-[12px] text-ink-muted">
                      {c.language}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {KIND_LABEL[c.kind] ?? c.kind}
                    </span>
                  </div>
                  <h2 className="mt-3 line-clamp-1 text-[17px] font-medium tracking-[-0.2px] text-ink">
                    {c.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-[14px] leading-[1.45] text-ink-muted">
                    {c.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-[12px] text-ink-muted">
                    <span className="Nox-mono">
                      {c.solveCount ?? 0} solve{(c.solveCount ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatSuccess(c.successRate)} success</span>
                    <span aria-hidden="true">·</span>
                    <span>~{c.estimatedSolveMinutes ?? 15} min</span>
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); touch(); }}
                  className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-pill bg-surface-1 px-4 text-[14px] font-medium text-ink hover:bg-surface-2 disabled:cursor-default disabled:opacity-40 ${HOVER}`}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Newer
                </button>
                <span className="Nox-mono text-[13px] text-ink-muted">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); touch(); }}
                  className={`Nox-focus inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-pill bg-surface-1 px-4 text-[14px] font-medium text-ink hover:bg-surface-2 disabled:cursor-default disabled:opacity-40 ${HOVER}`}
                >
                  Older
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
