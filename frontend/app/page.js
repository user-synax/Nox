"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bug,
  Check,
  Clock,
  Code2,
  Eye,
  Flame,
  GitBranch,
  Heart,
  Lock,
  Medal,
  Menu,
  MessageSquare,
  Play,
  ShieldCheck,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { auth } from "../lib/auth";
import { useSession } from "../lib/useSession";
import { SessionNav } from "../components/SessionNav";

const NAV_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Example", href: "#example" },
  { label: "Progress", href: "#progress" },
  { label: "FAQ", href: "#faq" },
];

/* Motion tokens — all hovers/presses ride the shared transitions-dev scale.
   No lift-on-hover anywhere: cards shift border/background color only. */
const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const STEPS = [
  {
    n: "01",
    title: "Discover a broken build",
    body: "Pick a challenge by language, category, and difficulty. Every challenge ships with real starter code — not a blank file.",
  },
  {
    n: "02",
    title: "Read the failure",
    body: "Inspect the implementation, run the visible tests, and trace the root cause from actual output — the way on-call work feels.",
  },
  {
    n: "03",
    title: "Fix and iterate",
    body: "Edit in Monaco, re-run tests instantly, and watch failures turn green. Reset to starter code any time without penalty.",
  },
  {
    n: "04",
    title: "Submit and prove it",
    body: "Hidden tests judge the fix. Pass them all to earn score, XP, and rating — correctness first, always.",
  },
];

const BROKEN_CODE = [
  "function cartTotal(items) {",
  "  let total = 0;",
  "  for (let i = 0; i <= items.length; i++) {",
  "    total += items[i].price;",
  "  }",
  "  return total;",
  "}",
];

const FIXED_CODE = [
  "function cartTotal(items) {",
  "  let total = 0;",
  "  for (let i = 0; i < items.length; i++) {",
  "    total += items[i].price;",
  "  }",
  "  return total;",
  "}",
];

const VISIBLE_TESTS_BROKEN = [
  { name: "sums two items", detail: "expected 35 · got 35", pass: true },
  { name: "single item", detail: "expected 12 · got 12", pass: true },
  { name: "empty cart returns 0", detail: "TypeError: Cannot read properties", pass: false },
];

const VISIBLE_TESTS_FIXED = [
  { name: "sums two items", detail: "expected 35 · got 35", pass: true },
  { name: "single item", detail: "expected 12 · got 12", pass: true },
  { name: "empty cart returns 0", detail: "expected 0 · got 0", pass: true },
];

const RANKS = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Grandmaster",
];

const LEADERBOARD = [
  { user: "mira_d", rating: "2,140", delta: "+32" },
  { user: "ayush", rating: "1,647", delta: "+21", you: true },
  { user: "kaito_dev", rating: "1,602", delta: "+18" },
  { user: "lena_ships", rating: "1,588", delta: "-6" },
];

const SOLUTIONS = [
  {
    title: "Why <= breaks on empty arrays",
    challenge: "Off by One: Cart Total",
    excerpt:
      "The loop reads one past the end. Guard the bound and the TypeError disappears — plus a note on testing empty inputs first.",
    likes: "48",
    comments: "12",
    lang: "JavaScript",
  },
  {
    title: "Await inside map: collecting usernames",
    challenge: "Floating Promises: Batch Usernames",
    excerpt:
      "map returns promises, not values. Promise.all over the mapped array restores order and keeps failures isolated.",
    likes: "36",
    comments: "9",
    lang: "JavaScript",
  },
  {
    title: "Reference equality vs value equality",
    challenge: "Reference Trap: Dedupe Users",
    excerpt:
      "Objects never equal by reference. Key on user.id in a Set and dedupe becomes O(n) instead of broken.",
    likes: "29",
    comments: "7",
    lang: "TypeScript",
  },
];

const FAQS = [
  {
    q: "How is Nox different from LeetCode-style platforms?",
    a: "Most platforms ask you to write a solution from scratch. Nox hands you intentionally broken code and asks you to do the everyday engineering job: read it, find the root cause, fix it, and prove the fix against hidden tests.",
  },
  {
    q: "Do I write code from scratch?",
    a: "No. Every challenge starts with a working-shaped codebase that fails in specific ways. You edit the starter files in Monaco, run the visible tests to iterate, then submit for hidden-test judging.",
  },
  {
    q: "Which languages are supported?",
    a: "JavaScript, TypeScript, and Python at launch. Language execution is modular, so new runtimes (Go, Rust, Java, and more) can be added without rewriting the platform.",
  },
  {
    q: "How do XP and rating work?",
    a: "They are separate. XP rewards activity and progression — solves, streaks, achievements. Rating measures competitive debugging skill starting at 1000 and moves with an Elo-like system weighted by difficulty and performance.",
  },
  {
    q: "Can I read solutions before solving?",
    a: "No. Solutions stay hidden until you pass a challenge, which protects challenge integrity. After a successful submission you can publish your own explanation and learn from others.",
  },
];

function Eyebrow({ children }) {
  return (
    <p className="text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
      {children}
    </p>
  );
}

function LearnLink({ href, children }) {
  return (
    <Link
      href={href}
      className={`t-learn Nox-focus inline-flex items-center gap-1.5 rounded-sm text-[14px] font-medium tracking-[-0.14px] text-ink no-underline ${HOVER} hover:text-white`}
    >
      {children}
      <span className="t-learn-chevron" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            className="t-learn-arm t-learn-arm-top"
            d="M6 4L10 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="t-learn-arm t-learn-arm-bot"
            d="M10 8L6 12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}

function SectionHead({ eyebrow, title, sub }) {
  return (
    <div data-reveal className="t-stagger mx-auto max-w-[720px] text-center">
      <span className="t-stagger-line t-stagger-line--1">
        <Eyebrow>{eyebrow}</Eyebrow>
      </span>
      <span className="t-stagger-line t-stagger-line--2">
        <span className="Nox-display mt-4 block text-[clamp(32px,5vw,62px)] leading-[1.0] font-medium tracking-[-0.05em] text-balance text-ink">
          {title}
        </span>
      </span>
      {sub ? (
        <span className="t-stagger-line t-stagger-line--3">
          <span className="mt-4 block text-[18px] leading-[1.3] tracking-[-0.18px] text-pretty text-ink-muted">
            {sub}
          </span>
        </span>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [demoTab, setDemoTab] = useState("broken");
  const [runState, setRunState] = useState("idle");

  const pillRef = useRef(null);
  const tabRefs = useRef([]);
  const closeTimer = useRef(null);
  const runTimer = useRef(null);
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  // Logged-in users never see the marketing landing — mirrors the old
  // middleware which can't run cross-origin (Nox.session lives on the API
  // origin). Client gate keeps / → /dashboard without a flash.
  useEffect(() => {
    if (!sessionLoading && session?.user) router.replace("/dashboard");
  }, [sessionLoading, session, router]);

  /* transitions-dev 16-tabs-sliding.md orchestration — adapted selectors.
     Snaps without transition on first paint/resize (transition: none + reflow). */
  const movePill = useCallback((index, animate) => {
    const pill = pillRef.current;
    const tab = tabRefs.current[index];
    if (!pill || !tab) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    }
  }, []);

  useEffect(() => {
    const place = () => movePill(active, false);
    requestAnimationFrame(place);
    if (document.fonts?.ready) document.fonts.ready.then(place);
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, movePill]);

  /* transitions-dev 07-panel-reveal.md — navbar entrance, pure CSS state flip */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Scroll reveal — one IntersectionObserver drives every
     transitions-dev 18-texts-reveal (.t-stagger → .is-shown) and
     07-panel-reveal (.t-panel-slide → data-open) block below the fold. */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => {
        el.classList.add("is-shown");
        if (el.hasAttribute("data-open")) el.setAttribute("data-open", "true");
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-shown");
          if (entry.target.hasAttribute("data-open"))
            entry.target.setAttribute("data-open", "true");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(runTimer.current), []);

  const runDemoTests = useCallback(() => {
    if (runState === "running") return;
    setRunState("running");
    clearTimeout(runTimer.current);
    runTimer.current = setTimeout(() => setRunState("done"), 900);
  }, [runState]);

  const selectTab = (index) => {
    setActive(index);
    movePill(index, true);
  };

  const onTabKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (active + dir + NAV_LINKS.length) % NAV_LINKS.length;
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  /* transitions-dev 05-menu-dropdown.md orchestration.
     Swap .is-open for .is-closing, cleanup after --dropdown-close-dur. */
  const closeMobile = useCallback(() => {
    if (!mobileOpen || isClosing) return;
    const css = getComputedStyle(document.documentElement);
    const closeMs =
      parseFloat(css.getPropertyValue("--dropdown-close-dur")) || 150;
    setIsClosing(true);
    setMobileOpen(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsClosing(false), closeMs);
  }, [mobileOpen, isClosing]);

  const toggleMobile = useCallback(() => {
    if (mobileOpen) {
      closeMobile();
    } else {
      clearTimeout(closeTimer.current);
      setIsClosing(false);
      setMobileOpen(true);
    }
  }, [mobileOpen, closeMobile]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeMobile();
    };
    const onResize = () => {
      if (window.innerWidth >= 810) {
        setMobileOpen(false);
        setIsClosing(false);
      } else {
        movePill(active, false);
      }
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      clearTimeout(closeTimer.current);
    };
  }, [closeMobile, active, movePill]);

  const dropdownState = mobileOpen ? "is-open" : isClosing ? "is-closing" : "";
  const demoTests = demoTab === "broken" ? VISIBLE_TESTS_BROKEN : VISIBLE_TESTS_FIXED;
  const demoCode = demoTab === "broken" ? BROKEN_CODE : FIXED_CODE;
  const demoPassCount = demoTests.filter((t) => t.pass).length;

  if (sessionLoading) {
    return <div className="min-h-screen bg-canvas" aria-hidden="true" />;
  }
  if (session?.user) {
    return (
      <div className="min-h-screen bg-canvas grid place-items-center">
        <p className="text-[14px] text-ink-muted">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas font-body text-ink">
      {/* top-nav — sticky 56px bar on canvas, wordmark left, links center, pills right */}
      <header className="sticky mt-4 top-0 z-50 bg-canvas">
        <div
          data-open={mounted}
          className="t-panel-slide Nox-nav-enter relative mx-auto w-full max-w-[1199px]"
        >
          <nav
            aria-label="Primary"
            className="relative flex h-14 w-full items-center justify-between gap-2 px-5 sm:px-[30px]"
          >
            {/* Left — wordmark */}
            <Link
              href="/"
              aria-label="Nox home"
              className="Nox-focus flex shrink-0 items-center gap-2.5 rounded-full"
            >
              <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-full bg-transparent">
                <Image
                  src="/Nox-logo.png"
                  alt="Nox logo"
                  width={32}
                  height={32}
                  priority
                  sizes="32px"
                  className="h-12 w-12 object-cover"
                />
              </span>
              <span className="Nox-display text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink">
                Nox
              </span>
            </Link>

            {/* Center — desktop link group (pricing-tab pattern: lift = active) */}
            <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 min-[810px]:block">
              <div
                role="tablist"
                aria-label="Sections"
                onKeyDown={onTabKeyDown}
                className="t-tabs"
              >
                <span
                  ref={pillRef}
                  aria-hidden="true"
                  className="t-tabs-pill"
                />
                {NAV_LINKS.map((link, i) => (
                  <Link
                    key={link.label}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    href={link.href}
                    role="tab"
                    aria-selected={active === i ? "true" : "false"}
                    tabIndex={active === i ? 0 : -1}
                    onClick={() => selectTab(i)}
                    className="t-tab Nox-focus text-[14px] font-medium whitespace-nowrap no-underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right — session-aware cluster + mobile hamburger */}
            <div className="flex shrink-0 items-center gap-2">
              <SessionNav session={session} loading={sessionLoading} />

              {/* Mobile hamburger — 40px circle per button-icon-circular */}
              <button
                type="button"
                onClick={toggleMobile}
                aria-expanded={mobileOpen}
                aria-controls="Nox-mobile-menu"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                className={`Nox-focus inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface-1 text-ink hover:bg-surface-2 min-[810px]:hidden ${HOVER}`}
              >
                <span
                  className="t-icon-swap"
                  data-state={mobileOpen ? "b" : "a"}
                  aria-hidden="true"
                >
                  <span className="t-icon flex" data-icon="a">
                    <Menu size={18} strokeWidth={2} />
                  </span>
                  <span className="t-icon flex" data-icon="b">
                    <X size={18} strokeWidth={2} />
                  </span>
                </span>
              </button>
            </div>
          </nav>

          {/* Mobile hamburger overlay */}
          <div className="absolute inset-x-4 top-[calc(100%+8px)] min-[810px]:hidden">
            <div
              id="Nox-mobile-menu"
              data-origin="top-center"
              className={`t-dropdown ${dropdownState}`}
            >
              <div
                className="bg-surface-1 p-3"
                style={{
                  borderRadius: "20px",
                  boxShadow: "var(--shadow-floating)",
                  visibility:
                    mobileOpen || isClosing ? "visible" : "hidden",
                }}
              >
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map((link, i) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        aria-current={active === i ? "page" : undefined}
                        tabIndex={mobileOpen ? 0 : -1}
                        onClick={() => {
                          setActive(i);
                          closeMobile();
                        }}
                        className={`Nox-focus flex items-center justify-between rounded-md px-3 py-2.5 text-[14px] font-medium no-underline ${HOVER} ${
                          active === i
                            ? "bg-surface-2 text-ink"
                            : "bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink"
                        }`}
                      >
                        {link.label}
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            active === i
                              ? "bg-accent-blue"
                              : "bg-transparent"
                          }`}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="my-2 border-t border-hairline-soft" />
                <div className="flex flex-col gap-2 p-1">
                  {!sessionLoading && session?.user ? (
                    <>
                      <Link
                        href={`/u/${session.user.username}`}
                        tabIndex={mobileOpen ? 0 : -1}
                        onClick={closeMobile}
                        className={`Nox-focus inline-flex w-full items-center justify-center rounded-pill bg-surface-2 px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline ${HOVER}`}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        tabIndex={mobileOpen ? 0 : -1}
                        onClick={closeMobile}
                        className={`Nox-focus inline-flex w-full items-center justify-center rounded-pill bg-surface-2 px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline ${HOVER}`}
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        tabIndex={mobileOpen ? 0 : -1}
                        onClick={async () => {
                          closeMobile();
                          try {
                            await auth.logout();
                          } catch {
                            /* already gone */
                          }
                          router.refresh();
                        }}
                        className={`Nox-focus inline-flex w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-danger ${HOVER}`}
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        tabIndex={mobileOpen ? 0 : -1}
                        onClick={closeMobile}
                        className={`Nox-focus inline-flex w-full items-center justify-center rounded-pill bg-surface-2 px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline ${HOVER}`}
                      >
                        Log in
                      </Link>
                      <Link
                        href="/signup"
                        tabIndex={mobileOpen ? 0 : -1}
                        onClick={closeMobile}
                        className={`Nox-focus inline-flex w-full items-center justify-center rounded-pill bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline ${HOVER} ${PRESS}`}
                      >
                        Start Noxing
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1199px] px-5 sm:px-[30px]">
        {/* ── Hero — transitions-dev 18-texts-reveal staggered entrance ── */}
        <section aria-labelledby="hero-heading" className="pt-20 pb-16 sm:pt-24">
          <div data-reveal className="t-stagger mx-auto max-w-[840px] text-center">
            <span className="t-stagger-line t-stagger-line--1">
              <span className="inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface-1 px-4 py-2 text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                Real-world debugging practice
              </span>
            </span>
            <span className="t-stagger-line t-stagger-line--2">
              <span
                id="hero-heading"
                className="Nox-display mt-6 block text-[clamp(48px,8vw,85px)] leading-[0.95] font-medium tracking-[-0.05em] text-balance text-ink"
              >
                Debug code. Build skill. Prove it.
              </span>
            </span>
            <span className="t-stagger-line t-stagger-line--3">
              <span className="mx-auto mt-6 block max-w-[640px] text-[18px] leading-[1.3] tracking-[-0.18px] text-pretty text-ink-muted">
                Practice real-world debugging by fixing intentionally broken
                code, passing hidden tests, and building a developer profile
                that shows what you can actually debug.
              </span>
            </span>
          </div>

          <div
            data-reveal
            data-open="false"
            className="t-panel-slide Nox-section-enter mt-8 flex flex-col items-stretch justify-center gap-3 px-1 sm:flex-row sm:items-center sm:px-0"
          >
            <Link
              href="/signup"
              className={`Nox-focus inline-flex min-h-[44px] w-full items-center justify-center rounded-pill bg-white px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline sm:w-auto ${HOVER} ${PRESS}`}
            >
              Start Noxing
            </Link>
            <Link
              href="/challenges"
              className={`Nox-focus inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill bg-surface-1 px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline hover:bg-surface-2 sm:w-auto ${HOVER} ${PRESS}`}
            >
              <Play size={15} strokeWidth={2} aria-hidden="true" />
              Explore Challenges
            </Link>
          </div>

          <p className="mt-6 text-center text-[13px] font-medium tracking-[-0.13px] text-ink-muted">
            Find the bug. Fix the code. Prove the fix.
          </p>

          {/* Hero product mockup — product-mockup-tile on surface-1 */}
          <div
            data-reveal
            data-open="false"
            className="t-panel-slide Nox-section-enter mx-auto mt-12 max-w-[880px]"
          >
            <div className="Nox-card rounded-xl bg-surface-1 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-hairline-soft px-2 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink">
                    <Bug size={16} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium tracking-[-0.14px] text-ink">
                      Off by One: Cart Total
                    </p>
                    <p className="text-[12px] tracking-[-0.12px] text-ink-muted">
                      JavaScript · Easy · Algorithms
                    </p>
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <span className="rounded-pill bg-surface-2 px-3 py-1.5 text-[12px] font-medium tracking-[-0.12px] text-ink">
                    Easy
                  </span>
                  <span className="Nox-mono rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-[12px] text-ink-muted">
                    02:14
                  </span>
                </div>
              </div>

              <div className="grid min-w-0 gap-4 pt-4 min-[810px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="min-w-0 overflow-hidden rounded-lg border border-hairline-soft bg-canvas p-3 sm:p-4">
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
                    <p className="Nox-mono min-w-0 truncate text-[12px] text-ink-muted">index.js</p>
                    <div
                      role="tablist"
                      aria-label="Demo code state"
                      className="flex shrink-0 items-center gap-1 rounded-pill bg-surface-1 p-1"
                    >
                      {[
                        { id: "broken", label: "Broken" },
                        { id: "fixed", label: "Fixed" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={demoTab === t.id}
                          onClick={() => {
                            setDemoTab(t.id);
                            setRunState("idle");
                          }}
                          className={`Nox-focus cursor-pointer rounded-pill border-0 px-3 py-1.5 text-[13px] font-medium tracking-[-0.13px] ${HOVER} ${
                            demoTab === t.id
                              ? "bg-surface-2 text-ink"
                              : "bg-transparent text-ink-muted hover:text-ink"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <pre className="Nox-mono max-w-full overflow-x-auto text-[13px] leading-[1.7] text-ink">
                    <code>
                      {demoCode.map((line, i) => (
                        <span key={`${demoTab}-${i}`} className="block whitespace-pre">
                          <span aria-hidden="true" className="mr-4 inline-block w-4 text-right text-ink-muted opacity-60 select-none">
                            {i + 1}
                          </span>
                          <span
                            className={
                              line.includes("<=") && demoTab === "broken"
                                ? "rounded-sm bg-danger/15 text-ink"
                                : line.includes("< items.length") && demoTab === "fixed"
                                  ? "rounded-sm bg-success/10 text-ink"
                                  : "text-ink-muted"
                            }
                          >
                            {line}
                          </span>
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>

                <div className="flex min-w-0 flex-col rounded-lg border border-hairline-soft bg-canvas p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] font-medium tracking-[-0.13px] text-ink">
                      Visible tests
                    </p>
                    <p className="Nox-mono text-[12px] text-ink-muted">
                      {runState === "done" || runState === "idle"
                        ? `${demoPassCount}/${demoTests.length}`
                        : "···"}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {demoTests.map((t) => {
                      const showFail = runState !== "running" && !t.pass;
                      const showPass = runState !== "running" && t.pass;
                      return (
                        <li
                          key={t.name}
                          className="flex items-start gap-2.5 rounded-md bg-surface-1 px-3 py-2.5"
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${HOVER} ${
                              runState === "running"
                                ? "bg-surface-2 text-ink-muted"
                                : showPass
                                  ? "bg-success/15 text-success"
                                  : "bg-danger/15 text-danger"
                            }`}
                          >
                            {runState === "running" ? (
                              <Clock size={12} strokeWidth={2} />
                            ) : showPass ? (
                              <Check size={12} strokeWidth={2.5} />
                            ) : (
                              <X size={12} strokeWidth={2.5} />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium tracking-[-0.14px] text-ink">
                              {t.name}
                            </span>
                            <span className="Nox-mono block truncate text-[12px] text-ink-muted">
                              {runState === "running" ? "running…" : showFail ? t.detail : t.detail}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-hairline-soft px-3 py-2.5 text-[13px] text-ink-muted">
                    <Lock size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                    8 hidden tests locked until submit
                  </div>
                  <button
                    type="button"
                    onClick={runDemoTests}
                    disabled={runState === "running"}
                    className={`Nox-focus mt-3 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black disabled:cursor-default disabled:opacity-70 ${HOVER} ${PRESS}`}
                  >
                    <Play size={15} strokeWidth={2} aria-hidden="true" />
                    {runState === "running"
                      ? "Running tests…"
                      : runState === "done"
                        ? "Run again"
                        : "Run tests"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 1. How Nox works ── */}
        <section id="how" aria-labelledby="how-heading" className="scroll-mt-24 py-16 sm:py-24">
          <SectionHead
            eyebrow="How Nox works"
            title="Broken code in. Proven skill out."
            sub="A tight loop built for debugging — read, fix, run, and submit against tests you can't see."
          />
          <div className="mt-12 grid min-w-0 gap-4 sm:grid-cols-2 min-[810px]:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                data-reveal
                data-open="false"
                style={{ transitionDelay: `${i * 40}ms` }}
                className="t-panel-slide Nox-section-enter min-w-0"
              >
                <article className="Nox-card h-full rounded-xl bg-surface-1 p-6">
                  <p className="Nox-mono text-[13px] text-ink-muted">{s.n}</p>
                  <h3 className="Nox-display mt-3 text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.4] tracking-[-0.15px] text-ink-muted">
                    {s.body}
                  </p>
                </article>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <LearnLink href="/challenges">Browse the challenge catalog</LearnLink>
          </div>
        </section>

        {/* ── 2. Example broken-code challenge ── */}
        <section id="example" aria-labelledby="example-heading" className="scroll-mt-24 py-16 sm:py-24">
          <SectionHead
            eyebrow="Example challenge"
            title="Start from failure, not a blank file"
            sub="Every challenge pairs buggy starter code with visible tests for iteration — and hidden tests that decide the verdict."
          />
          <div
            data-reveal
            data-open="false"
            className="t-panel-slide Nox-section-enter mt-12 grid min-w-0 gap-4 min-[810px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
          >
            <article className="Nox-card min-w-0 rounded-xl bg-surface-1 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {["Bug Fix", "JavaScript", "Easy", "~15 min"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-pill bg-surface-2 px-3 py-1.5 text-[12px] font-medium tracking-[-0.12px] text-ink"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <h3 id="example-heading" className="Nox-display mt-4 text-[32px] leading-[1.13] font-medium tracking-[-0.03em] text-ink">
                Off by One: Cart Total
              </h3>
              <p className="mt-2 text-[15px] leading-[1.4] tracking-[-0.15px] text-ink-muted">
                The cart sums correctly — until it doesn&apos;t. An empty cart
                crashes, and the loop bound hides the cause. Find it, fix it,
                and keep every existing test green.
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  ["Visible", "3 tests"],
                  ["Hidden", "8 tests"],
                  ["Time limit", "2.0s"],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0 rounded-md bg-canvas px-2 py-3 sm:px-3">
                    <dt className="truncate text-[12px] tracking-[-0.12px] text-ink-muted">{k}</dt>
                    <dd className="Nox-mono mt-1 truncate text-[14px] text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/challenges"
                  className={`Nox-focus inline-flex min-h-[44px] w-full items-center justify-center rounded-pill bg-white px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline sm:w-auto ${HOVER} ${PRESS}`}
                >
                  Try this challenge
                </Link>
                <LearnLink href="/challenges">See all challenges</LearnLink>
              </div>
            </article>

            <article className="Nox-card min-w-0 rounded-xl bg-surface-1 p-5 sm:p-6">
              <h3 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
                How a submission is scored
              </h3>
              <p className="mt-1 text-[14px] leading-[1.4] tracking-[-0.14px] text-ink-muted">
                Hidden tests are the source of truth. No pass, no accept —
                however high the score.
              </p>
              <ul className="mt-5 flex flex-col gap-3">
                {[
                  ["Base correctness", "70 pts", "All required hidden tests pass"],
                  ["Efficiency", "15 pts", "Time and memory under limits"],
                  ["Completion speed", "10 pts", "Faster clean solves score more"],
                  ["Code quality", "5 pts", "Minimal, readable Nox"],
                ].map(([k, v, d]) => (
                  <li
                    key={k}
                    className="flex items-center justify-between gap-3 border-b border-hairline-soft pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium tracking-[-0.14px] text-ink">{k}</p>
                      <p className="text-[13px] tracking-[-0.13px] text-ink-muted">{d}</p>
                    </div>
                    <span className="Nox-mono shrink-0 text-[14px] text-ink">{v}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 min-w-0 overflow-x-auto rounded-md bg-canvas px-4 py-3">
                <p className="Nox-mono min-w-0 text-[13px] leading-[1.6] break-words text-ink-muted">
                  Accepted · 18/18 tests · 42ms · 18MB
                  <span className="block text-success">+125 XP · +21 rating</span>
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* ── 3. Competitive progression ── */}
        <section id="progress" aria-labelledby="progress-heading" className="scroll-mt-24 py-16 sm:py-24">
          <SectionHead
            eyebrow="Competitive progression"
            title="Correctness first. Status follows."
            sub="Rating measures skill, XP measures momentum — and neither rewards a fix that doesn't actually pass."
          />
          <div className="mt-12 grid min-w-0 gap-4 min-[810px]:grid-cols-3">
            <div data-reveal data-open="false" className="t-panel-slide Nox-section-enter min-w-0">
              <article className="Nox-card h-full min-w-0 rounded-xl bg-surface-1 p-5 sm:p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink">
                  <Zap size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 id="progress-heading" className="Nox-display mt-4 text-[24px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                  Rating and XP, separated
                </h3>
                <p className="mt-2 text-[15px] leading-[1.4] tracking-[-0.15px] text-ink-muted">
                  Start at 1000 rating. Climb with an Elo-like system weighted
                  by difficulty — while XP tracks solves, streaks, and daily
                  challenges.
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    ["Rating", "1,647"],
                    ["XP", "42,850"],
                    ["Solved", "187"],
                    ["Streak", "14 days"],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0 rounded-md bg-canvas px-3 py-3">
                      <dt className="truncate text-[12px] tracking-[-0.12px] text-ink-muted">{k}</dt>
                      <dd className="Nox-mono mt-1 truncate text-[18px] text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            </div>

            <div data-reveal data-open="false" className="t-panel-slide Nox-section-enter min-w-0">
              <article className="Nox-card flex h-full min-w-0 flex-col rounded-xl bg-surface-1 p-5 sm:p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink">
                  <Medal size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 className="Nox-display mt-4 text-[24px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                  Seven ranks to chase
                </h3>
                <p className="mt-2 text-[15px] leading-[1.4] tracking-[-0.15px] text-ink-muted">
                  Thresholds are configurable, progress is permanent on your
                  profile.
                </p>
                <ol className="mt-5 flex flex-col">
                  {RANKS.map((rank, i) => (
                    <li
                      key={rank}
                      className={`flex items-center justify-between border-b border-hairline-soft px-1 py-2.5 text-[14px] last:border-0 ${HOVER} ${
                        rank === "Diamond" ? "font-medium text-ink" : "text-ink-muted"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="Nox-mono text-[12px] opacity-70">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {rank}
                      </span>
                      {rank === "Diamond" && (
                        <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-ink">
                          You
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            <div data-reveal data-open="false" className="t-panel-slide Nox-section-enter min-w-0">
              <article className="Nox-card flex h-full min-w-0 flex-col rounded-xl bg-surface-1 p-5 sm:p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink">
                  <Trophy size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 className="Nox-display mt-4 text-[24px] leading-[1.2] font-medium tracking-[-0.02em] text-ink">
                  Weekly leaderboard
                </h3>
                <p className="mt-2 text-[15px] leading-[1.4] tracking-[-0.15px] text-ink-muted">
                  Global boards rank by rating; weekly boards reward momentum.
                </p>
                <ol className="mt-5 flex flex-col gap-1">
                  {LEADERBOARD.map((row, i) => (
                    <li
                      key={row.user}
                      className={`flex items-center justify-between rounded-md px-3 py-2.5 text-[14px] ${HOVER} ${
                        row.you ? "bg-surface-2 text-ink" : "bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="Nox-mono w-5 shrink-0 text-[12px] opacity-70">{i + 1}</span>
                        <span className="truncate font-medium">@{row.user}</span>
                      </span>
                      <span className="Nox-mono flex shrink-0 items-center gap-2 text-[13px]">
                        {row.rating}
                        <span className={row.delta.startsWith("+") ? "text-success" : "text-danger"}>
                          {row.delta}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4">
                  <LearnLink href="/leaderboard">View full leaderboard</LearnLink>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── 4. Developer profiles ── */}
        <section aria-labelledby="profiles-heading" className="py-16 sm:py-24">
          <SectionHead
            eyebrow="Developer profiles"
            title="A profile that proves debugging"
            sub="Every solve updates rating, rank, streaks, and skill breakdowns — a public record of what you can fix."
          />
          <div className="mt-12 grid min-w-0 items-stretch gap-4 min-[810px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div data-reveal data-open="false" className="t-panel-slide Nox-section-enter min-w-0">
              <article className="Nox-card h-full min-w-0 rounded-xl bg-surface-1 p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <span aria-hidden="true" className="Nox-display inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[22px] font-medium text-ink">
                    A
                  </span>
                  <div className="min-w-0">
                    <h3 id="profiles-heading" className="truncate text-[18px] font-medium tracking-[-0.18px] text-ink">
                      Ayush
                    </h3>
                    <p className="truncate text-[14px] tracking-[-0.14px] text-ink-muted">
                      Full Stack Developer · Nox.synax.me/u/ayush
                    </p>
                  </div>
                </div>
                <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    ["Rating", "1,647"],
                    ["Rank", "Diamond III"],
                    ["XP", "42,850"],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0 rounded-md bg-canvas px-2 py-3 text-center sm:px-3">
                      <dt className="truncate text-[12px] tracking-[-0.12px] text-ink-muted">{k}</dt>
                      <dd className="Nox-mono mt-1 truncate text-[15px] text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-6 flex flex-col gap-4">
                  {[
                    ["Debugging", "95%"],
                    ["JavaScript", "92%"],
                    ["Backend", "88%"],
                    ["Security", "81%"],
                  ].map(([skill, pct]) => (
                    <li key={skill}>
                      <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className="font-medium tracking-[-0.13px] text-ink">{skill}</span>
                        <span className="Nox-mono text-ink-muted">{pct}</span>
                      </div>
                      <div
                        role="img"
                        aria-label={`${skill} ${pct}`}
                        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                      >
                        <div className="h-full rounded-full bg-white" style={{ width: pct }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              {[
                {
                  Icon: ShieldCheck,
                  title: "Verified by hidden tests",
                  body: "Solved counts only move on accepted submissions — no partial credit, no inflated stats.",
                },
                {
                  Icon: Flame,
                  title: "Streaks without the pressure cult",
                  body: "Current and longest streaks track consistency. They complement skill — they never replace it.",
                },
                {
                  Icon: GitBranch,
                  title: "Skills by evidence",
                  body: "Category breakdowns reflect completed challenges across debugging, backend, security, and more.",
                },
              ].map((f, i) => (
                <div
                  key={f.title}
                  data-reveal
                  data-open="false"
                  style={{ transitionDelay: `${i * 40}ms` }}
                  className="t-panel-slide Nox-section-enter min-w-0"
                >
                  <article className="Nox-card flex h-full min-w-0 items-start gap-4 rounded-xl bg-surface-1 p-5 sm:p-6">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink">
                      <f.Icon size={18} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-medium tracking-[-0.16px] text-ink">
                        {f.title}
                      </h3>
                      <p className="mt-1 text-[15px] leading-[1.4] tracking-[-0.15px] text-ink-muted">
                        {f.body}
                      </p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Community solutions ── */}
        <section aria-labelledby="community-heading" className="py-16 sm:py-24">
          <SectionHead
            eyebrow="Community solutions"
            title="Solved it? Teach it."
            sub="Accepted solvers can publish explanations. Locked until you pass — open knowledge after."
          />
          <div className="mt-12 grid min-w-0 gap-4 min-[810px]:grid-cols-3">
            {SOLUTIONS.map((s, i) => (
              <div
                key={s.title}
                data-reveal
                data-open="false"
                style={{ transitionDelay: `${i * 40}ms` }}
                className="t-panel-slide Nox-section-enter min-w-0"
              >
                <article className="Nox-card flex h-full min-w-0 flex-col rounded-xl bg-surface-1 p-5 sm:p-6">
                  <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium tracking-[-0.12px] text-ink-muted">
                    <span className="shrink-0 rounded-pill bg-surface-2 px-2.5 py-1 text-ink">{s.lang}</span>
                    <span className="min-w-0 truncate">{s.challenge}</span>
                  </div>
                  <h3 id={i === 0 ? "community-heading" : undefined} className="Nox-display mt-3 text-[20px] leading-[1.25] font-medium tracking-[-0.02em] text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[15px] leading-[1.4] tracking-[-0.15px] text-ink-muted">
                    {s.excerpt}
                  </p>
                  <div className="mt-5 flex items-center gap-4 border-t border-hairline-soft pt-4 text-[13px] text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Heart size={14} strokeWidth={2} aria-hidden="true" />
                      <span className="Nox-mono">{s.likes}</span>
                      <span className="sr-only">likes</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare size={14} strokeWidth={2} aria-hidden="true" />
                      <span className="Nox-mono">{s.comments}</span>
                      <span className="sr-only">comments</span>
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <Eye size={14} strokeWidth={2} aria-hidden="true" />
                      After solve
                    </span>
                  </div>
                </article>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <p className="flex max-w-[560px] items-start gap-2 text-[14px] leading-[1.4] tracking-[-0.14px] text-ink-muted">
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
              Like, comment, and bookmark — with reporting and moderation keeping
              shared solutions worth reading.
            </p>
          </div>
        </section>

        {/* ── 6. Supported languages ── */}
        <section aria-labelledby="languages-heading" className="py-16 sm:py-24">
          <SectionHead
            eyebrow="Supported languages"
            title="Start with JS, TS, and Python"
            sub="A modular execution architecture means new runtimes arrive without rewriting the platform."
          />
          <div
            data-reveal
            data-open="false"
            className="t-panel-slide Nox-section-enter mx-auto mt-12 max-w-[860px] min-w-0"
          >
            <div className="Nox-card min-w-0 rounded-xl bg-surface-1 p-5 sm:p-8">
              <ul className="grid min-w-0 gap-3 sm:grid-cols-3">
                {[
                  { Icon: Code2, lang: "JavaScript", note: "Available now" },
                  { Icon: Code2, lang: "TypeScript", note: "Available now" },
                  { Icon: Code2, lang: "Python", note: "Available now" },
                ].map((l) => (
                  <li
                    key={l.lang}
                    className={`flex min-w-0 items-center gap-3 rounded-lg border border-hairline-soft bg-canvas px-4 py-4 ${HOVER} hover:border-hairline`}
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink">
                      <l.Icon size={18} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium tracking-[-0.15px] text-ink">
                        {l.lang}
                      </span>
                      <span className="flex items-center gap-1.5 text-[13px] tracking-[-0.13px] text-ink-muted">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                        {l.note}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Planned languages">
                {["C++", "Java", "Go", "Rust", "C#", "PHP", "Kotlin", "Swift"].map((l) => (
                  <span
                    key={l}
                    className="Nox-mono rounded-pill border border-hairline-soft px-3 py-1.5 text-[12px] text-ink-muted"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-center text-[14px] leading-[1.4] tracking-[-0.14px] text-ink-muted">
                On the roadmap — each runtime ships with isolated sandboxing,
                quotas, and timeouts.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ — transitions-dev 21-accordion expand ── */}
        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24 py-16 sm:py-24">
          <SectionHead
            eyebrow="FAQ"
            title="Questions, answered"
            sub="The short version of everything new debuggers ask before their first fix."
          />
          <div
            data-reveal
            data-open="false"
            className="t-panel-slide Nox-section-enter mx-auto mt-12 max-w-[760px]"
          >
            <div className="overflow-hidden rounded-xl border border-hairline-soft bg-canvas">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div
                    key={f.q}
                    data-open={open ? "true" : "false"}
                    className={`t-acc ${i !== FAQS.length - 1 ? "border-b border-hairline-soft" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      aria-expanded={open}
                      className={`Nox-focus flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-5 py-5 text-left sm:px-6 ${HOVER} ${
                        open ? "text-ink" : "text-ink hover:text-white"
                      }`}
                    >
                      <span className="text-[15px] font-medium tracking-[-0.15px]">
                        {f.q}
                      </span>
                      <span className="t-acc-chevron inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-1 text-ink" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4 6.5L8 10.5L12 6.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <div className="t-acc-panel">
                      <div className="t-acc-panel-inner">
                        <p className="px-5 pb-6 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-muted sm:px-6">
                          {f.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <h2 id="faq-heading" className="sr-only">Frequently asked questions</h2>
          </div>
        </section>

        {/* ── 7. Final CTA — solid surface panel, no gradient ── */}
        <section aria-labelledby="cta-heading" className="py-16 sm:py-24">
          <div
            data-reveal
            data-open="false"
            className="t-panel-slide Nox-section-enter"
          >
            <div className="Nox-card min-w-0 rounded-xxl bg-surface-1 px-5 py-12 text-center sm:px-12 sm:py-16">
              <div data-reveal className="t-stagger mx-auto max-w-[680px]">
                <span className="t-stagger-line t-stagger-line--1">
                  <Eyebrow>Ready when you are</Eyebrow>
                </span>
                <span className="t-stagger-line t-stagger-line--2">
                  <span id="cta-heading" className="Nox-display mt-4 block text-[clamp(32px,5vw,62px)] leading-[1.0] font-medium tracking-[-0.05em] text-balance text-ink">
                    Your first bug is waiting.
                  </span>
                </span>
                <span className="t-stagger-line t-stagger-line--3">
                  <span className="mx-auto mt-4 block max-w-[520px] text-[18px] leading-[1.3] tracking-[-0.18px] text-pretty text-ink-muted">
                    Create an account, open a challenge, and ship your first
                    accepted fix in minutes.
                  </span>
                </span>
              </div>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className={`Nox-focus inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill bg-white px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline sm:w-auto ${HOVER} ${PRESS}`}
                >
                  Start Noxing
                  <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                </Link>
                <Link
                  href="/challenges"
                  className={`Nox-focus inline-flex min-h-[44px] w-full items-center justify-center rounded-pill bg-surface-2 px-[22px] py-[12px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline hover:bg-surface-1 sm:w-auto ${HOVER} ${PRESS}`}
                >
                  Explore Challenges
                </Link>
              </div>
              <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] tracking-[-0.13px] text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Check size={13} strokeWidth={2.5} aria-hidden="true" className="text-success" />
                  Free to start
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users size={13} strokeWidth={2} aria-hidden="true" />
                  Public profiles
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Trophy size={13} strokeWidth={2} aria-hidden="true" />
                  Rating + XP from solve one
                </span>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer — dense link grid on canvas ── */}
      <footer className="border-t border-hairline-soft">
        <div className="mx-auto grid w-full max-w-[1199px] min-w-0 gap-10 px-5 py-16 sm:px-[30px] min-[810px]:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <div>
            <Link href="/" aria-label="Nox home" className="Nox-focus inline-flex items-center gap-2.5 rounded-full">
              <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-transparent">
                <Image
                  src="/Nox-logo.png"
                  alt="Nox logo"
                  width={32}
                  height={32}
                  sizes="32px"
                  className="h-10 w-10 object-cover"
                />
              </span>
              <span className="Nox-display text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink">
                Nox
              </span>
            </Link>
            <p className="mt-4 max-w-[300px] text-[13px] leading-[1.5] tracking-[-0.13px] text-ink-muted">
              Practice the skill developers use every day: debugging. Find the
              bug. Fix the code. Prove the fix.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href="/status"
                className="Nox-focus inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface-1 px-3 py-1.5 text-[12px] text-ink-muted no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:text-ink"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                All systems nominal
              </Link>
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { head: "Product", links: [["Challenges", "/challenges"], ["Leaderboard", "/leaderboard"], ["Daily challenge", "/challenges"], ["Pricing", "/pricing"]] },
              { head: "Account", links: [["Log in", "/login"], ["Sign up", "/signup"], ["Onboarding", "/onboarding"], ["Settings", "/settings"]] },
              { head: "Community", links: [["Solutions", "/challenges"], ["Profiles", "/"], ["Guidelines", "/"], ["Report", "/"]] },
              { head: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Security", "/security"], ["Status", "/status"]] },
            { head: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["Cookies", "/cookies"]] },
            ].map((col) => (
              <div key={col.head}>
                <h2 className="text-[13px] font-medium tracking-[-0.13px] text-ink">
                  {col.head}
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className={`Nox-focus rounded-sm text-[13px] tracking-[-0.13px] text-ink-muted no-underline ${HOVER} hover:text-ink`}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="border-t border-hairline-soft">
          <div className="mx-auto flex w-full max-w-[1199px] flex-col items-center justify-between gap-2 px-5 py-5 text-[12px] tracking-[-0.12px] text-ink-muted sm:flex-row sm:px-[30px]">
            <p>© 2026 Nox · Nox.synax.me</p>
            <p className="Nox-mono">Debugging over typing.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
