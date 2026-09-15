"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
  User,
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

function SoonBadge() {
  return (
    <span className="ml-auto rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] font-medium tracking-[-0.11px] text-ink-muted">
      Soon
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
            <span aria-disabled="true" className={`${itemCls(false)} cursor-not-allowed opacity-70`}>
              <Compass size={17} strokeWidth={2} aria-hidden="true" />
              Challenges
              <SoonBadge />
            </span>
            <span aria-disabled="true" className={`${itemCls(false)} cursor-not-allowed opacity-70`}>
              <Trophy size={17} strokeWidth={2} aria-hidden="true" />
              Leaderboard
              <SoonBadge />
            </span>
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

/** Bottom tab bar for <lg — live destinations only. */
export function TabBar({ user, pathname }) {
  const profileHref = user?.username ? `/u/${user.username}` : "/settings";
  const tabs = [
    { href: "/dashboard", label: "Home", Icon: LayoutDashboard, active: pathname === "/dashboard" },
    { href: profileHref, label: "Profile", Icon: User, active: pathname === profileHref },
    { href: "/settings", label: "Settings", Icon: Settings, active: pathname === "/settings" },
  ];
  return (
    <nav
      aria-label="App navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline-soft bg-canvas/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-3 px-2 pt-1">
        {tabs.map(({ href, label, Icon, active }) => (
          <Link
            key={href + label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`Nox-focus flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium no-underline ${HOVER} ${
              active ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1 w-6 rounded-full transition-colors duration-[var(--duration-fast)] ${
                active ? "bg-accent-blue" : "bg-transparent"
              }`}
            />
            <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
