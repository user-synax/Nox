"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { auth } from "../lib/auth";
import { Avatar } from "./Avatar";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

function Logo({ size = 36 }) {
  return (
    <span
      className="block overflow-hidden rounded-[12px]"
      style={{ width: size, height: size }}
    >
      <Image
        src="/Nox-logo.png"
        alt="Nox home"
        width={size}
        height={size}
        sizes={`${size}px`}
        style={{ width: size, height: size }}
        className="object-cover"
      />
    </span>
  );
}

const itemCls = (active) =>
  `Nox-focus flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium no-underline ${HOVER} ${
    active ? "bg-surface-2 text-ink" : "bg-transparent text-ink-muted hover:bg-surface-1 hover:text-ink"
  }`;

/**
 * Fixed desktop sidebar (lg+). Live destinations link; unshipped systems
 * render as honest disabled rows with Soon badges — never dead links.
 */
export function Sidebar({ user, pathname }) {
  const router = useRouter();
  const profileHref = user?.username ? `/u/${user.username}` : "/settings";

  const onLogout = async () => {
    try {
      await auth.logout();
    } catch {
      /* already gone */
    }
    router.push("/");
    router.refresh();
  };

  return (
    <aside
      aria-label="App navigation"
      className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-hairline-soft bg-canvas px-4 py-6 lg:flex"
    >
      <Link
        href="/dashboard"
        aria-label="Nox dashboard"
        className="Nox-focus flex items-center gap-2.5 rounded-full px-2"
      >
        <Logo />
        <span className="Nox-display text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink">
          Nox
        </span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto">
        <div>
          <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-muted">
            MENU
          </p>
          <div className="flex flex-col gap-1">
            <Link
              href="/dashboard"
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={itemCls(pathname === "/dashboard")}
            >
              <LayoutDashboard size={17} strokeWidth={2} aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/challenges"
              aria-current={pathname.startsWith("/challenges") ? "page" : undefined}
              className={itemCls(pathname.startsWith("/challenges"))}
            >
              <Compass size={17} strokeWidth={2} aria-hidden="true" />
              Challenges
            </Link>
            <Link
              href="/leaderboard"
              aria-current={pathname.startsWith("/leaderboard") ? "page" : undefined}
              className={itemCls(pathname.startsWith("/leaderboard"))}
            >
              <Trophy size={17} strokeWidth={2} aria-hidden="true" />
              Leaderboard
            </Link>
          </div>
        </div>

        <div>
          <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-muted">
            COMMUNITY
          </p>
          <div className="flex flex-col gap-1">
            <Link
              href="/community"
              aria-current={pathname.startsWith("/community") ? "page" : undefined}
              className={itemCls(pathname.startsWith("/community"))}
            >
              <Users size={17} strokeWidth={2} aria-hidden="true" />
              Community
            </Link>
          </div>
        </div>

        <div>
          <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-muted">
            YOU
          </p>
          <div className="flex flex-col gap-1">
            <Link
              href={profileHref}
              aria-current={pathname === profileHref ? "page" : undefined}
              className={itemCls(pathname === profileHref)}
            >
              <User size={17} strokeWidth={2} aria-hidden="true" />
              Profile
            </Link>
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={itemCls(pathname === "/settings")}
            >
              <Settings size={17} strokeWidth={2} aria-hidden="true" />
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-t border-hairline-soft pt-4">
        <div className="flex items-center gap-3 px-2">
          <Link
            href={profileHref}
            aria-label="Your profile"
            className="Nox-focus block shrink-0 rounded-full"
          >
            <Avatar user={user} size={36} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium tracking-[-0.14px] text-ink">
              {user?.displayName ?? user?.username ?? "…"}
            </p>
            <p className="truncate text-[12px] text-ink-muted">@{user?.username ?? "…"}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
            className={`Nox-focus inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-surface-1 hover:text-ink ${HOVER} ${PRESS}`}
          >
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Compact top bar for <lg (logo + avatar). The tab bar below owns nav. */
export function MobileTop({ user }) {
  const profileHref = user?.username ? `/u/${user.username}` : "/settings";
  return (
    <header className="sticky top-0 z-40 border-b border-hairline-soft bg-canvas/95 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/dashboard" aria-label="Nox dashboard" className="Nox-focus rounded-full">
          <Logo size={32} />
        </Link>
        <Link href={profileHref} aria-label="Your profile" className="Nox-focus block rounded-full">
          <Avatar user={user} size={32} />
        </Link>
      </div>
    </header>
  );
}

/**
 * Bottom tab bar for <lg — 4 tabs so the bar never crowds.
 * Home / Challenges / Ranks link; Menu owns Community / Profile / Settings
 * in a dropdown sheet (transitions-dev 05). The active pill slides between
 * tabs (transitions-dev 16) and the Menu icon cross-fades to a close icon
 * (transitions-dev 09). Desktop keeps the full sidebar — untouched.
 */
export function TabBar({ user, pathname }) {
  const path = pathname || "";
  const profileHref = user?.username ? `/u/${user.username}` : "/settings";

  const primary = [
    { href: "/dashboard", label: "Home", Icon: LayoutDashboard, active: path === "/dashboard" },
    { href: "/challenges", label: "Challenges", Icon: Compass, active: path.startsWith("/challenges") },
    { href: "/leaderboard", label: "Ranks", Icon: Trophy, active: path.startsWith("/leaderboard") },
  ];
  const more = [
    { href: "/community", label: "Community", desc: "Feed and people", Icon: Users, active: path.startsWith("/community") },
    { href: profileHref, label: "Profile", desc: "Your stats", Icon: User, active: path === profileHref },
    { href: "/settings", label: "Settings", desc: "Account and prefs", Icon: Settings, active: path === "/settings" },
  ];
  const menuActive = more.some((t) => t.active);
  const activeIndex = primary.findIndex((t) => t.active);
  const routeIndex = activeIndex !== -1 ? activeIndex : menuActive ? 3 : -1;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const pillRef = useRef(null);
  const itemRefs = useRef([]);
  const shellRef = useRef(null);
  const sheetRef = useRef(null);
  const closeTimer = useRef(null);
  const firstPaint = useRef(true);

  /* Pill follows the open sheet too, so tapping Menu feels responsive. */
  const shownIndex = menuOpen || menuClosing ? 3 : routeIndex;

  const movePill = useCallback((index, animate) => {
    const pill = pillRef.current;
    const el = itemRefs.current[index];
    if (!pill) return;
    if (!el || index < 0) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.opacity = "1";
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
  }, []);

  /* Slide on route / sheet change; snap (no transition) on first paint. */
  useEffect(() => {
    if (firstPaint.current) {
      const raf = requestAnimationFrame(() => {
        movePill(shownIndex, false);
        firstPaint.current = false;
      });
      return () => cancelAnimationFrame(raf);
    }
    movePill(shownIndex, true);
  }, [shownIndex, profileHref, movePill]);

  /* Snap the pill on resize so it never drifts off its tab. */
  useEffect(() => {
    const onResize = () => movePill(shownIndex, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [shownIndex, movePill]);

  const closeMenu = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!menuOpen && !menuClosing) return;
    setMenuOpen(false);
    setMenuClosing(true);
    const closeMs =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")
      ) || 150;
    closeTimer.current = setTimeout(() => setMenuClosing(false), closeMs);
  }, [menuOpen, menuClosing]);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenuClosing(false);
    setMenuOpen(true);
  };

  /* Route change dismisses the sheet instantly — no orphaned popover.
     Derived-state adjustment during render (no effect, no ref): when the
     route moves on, the open sheet belongs to the previous page. */
  const [menuScope, setMenuScope] = useState(path);
  if (menuScope !== path) {
    setMenuScope(path);
    setMenuOpen(false);
    setMenuClosing(false);
  }

  /* Outside tap / Escape closes; focus lands on the first sheet row. */
  useEffect(() => {
    if (!menuOpen) return;
    sheetRef.current?.querySelector("a")?.focus({ preventScroll: true });
    const onDown = (e) => {
      if (shellRef.current && !shellRef.current.contains(e.target)) closeMenu();
    };
    const onKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const menuSelected = shownIndex === 3;

  return (
    <nav
      aria-label="App navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline-soft bg-canvas/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={closeMenu}
          className="fixed inset-0 cursor-default border-0 bg-black/50 p-0"
        />
      ) : null}
      <div ref={shellRef} className="relative">
        <div
          ref={sheetRef}
          id="mobile-more-menu"
          role="menu"
          aria-label="More"
          data-origin="bottom-center"
          className={`t-dropdown Nox-more-sheet absolute inset-x-3 bottom-[calc(100%+10px)] ${
            menuOpen ? "is-open" : ""
          } ${menuClosing ? "is-closing" : ""}`}
        >
          {more.map(({ href, label, desc, Icon, active }) => (
            <Link
              key={href + label}
              href={href}
              role="menuitem"
              aria-current={active ? "page" : undefined}
              onClick={closeMenu}
              className={`Nox-focus flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 text-[14px] no-underline ${HOVER} ${
                active ? "bg-surface-2 text-ink" : "bg-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink"
              >
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-medium tracking-[-0.14px]">{label}</span>
                <span className="block truncate text-[12px] text-ink-muted">{desc}</span>
              </span>
              {active ? (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-blue" />
              ) : (
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-ink-muted" />
              )}
            </Link>
          ))}
        </div>

        <div className="t-tabs Nox-tabbar" aria-label="Primary">
          <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" style={{ opacity: 0 }} />
          {primary.map(({ href, label, Icon, active }, i) => (
            <Link
              key={href}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              href={href}
              data-active={active && !menuOpen ? "true" : "false"}
              aria-current={active ? "page" : undefined}
              className={`Nox-focus t-tab ${HOVER} ${PRESS}`}
            >
              <span aria-hidden="true" className="Nox-tabbar-icon">
                <Icon size={21} strokeWidth={active && !menuOpen ? 2.25 : 2} aria-hidden="true" />
              </span>
              <span className="text-[11px] leading-none font-medium tracking-[-0.11px]">{label}</span>
            </Link>
          ))}
          <button
            ref={(el) => {
              itemRefs.current[3] = el;
            }}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-more-menu"
            aria-current={menuActive ? "page" : undefined}
            data-active={menuSelected ? "true" : "false"}
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
            className={`Nox-focus t-tab cursor-pointer ${HOVER} ${PRESS}`}
          >
            <span
              aria-hidden="true"
              className="t-icon-swap"
              data-state={menuOpen ? "b" : "a"}
            >
              <span className="t-icon" data-icon="a">
                <Menu size={21} strokeWidth={menuSelected && !menuOpen ? 2.25 : 2} aria-hidden="true" />
              </span>
              <span className="t-icon" data-icon="b">
                <X size={21} strokeWidth={2.25} aria-hidden="true" />
              </span>
            </span>
            <span className="text-[11px] leading-none font-medium tracking-[-0.11px]">Menu</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
