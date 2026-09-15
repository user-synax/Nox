"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { auth } from "../lib/auth";
import { useSession } from "../lib/useSession";
import { SessionNav } from "../components/SessionNav";

const NAV_LINKS = [
  { label: "Challenges", href: "/challenges" },
];

/* Motion tokens — all hovers/presses ride the shared transitions-dev scale */
const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

export default function Home() {
  const [active, setActive] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pillRef = useRef(null);
  const tabRefs = useRef([]);
  const closeTimer = useRef(null);
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

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

  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
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

      {/* Landing canvas — future blocks append below. Navbar only for now. */}
      <main className="mx-auto w-full max-w-[1199px] px-5 sm:px-[30px]">
        <h1 className="sr-only">Nox — Practice real-world debugging</h1>
        {/* Next block goes here */}
      </main>
    </div>
  );
}
