"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { auth } from "../lib/auth";
import { Avatar } from "./Avatar";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";

/**
 * Right cluster of the landing nav. Signed out → the classic pills.
 * Signed in → avatar trigger + origin-aware dropdown (Profile, Settings, Log out).
 * Session is owned by the parent (fetched once, shared with the mobile menu).
 */
export function SessionNav({ session, loading }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const wrapRef = useRef(null);

  const close = useCallback(() => {
    if (!open || closing) return;
    const css = getComputedStyle(document.documentElement);
    const ms = parseFloat(css.getPropertyValue("--dropdown-close-dur")) || 150;
    setClosing(true);
    setOpen(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setClosing(false), ms);
  }, [open, closing]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      clearTimeout(closeTimer.current);
    };
  }, [close]);

  const onLogout = async () => {
    close();
    try {
      await auth.logout();
    } catch {
      /* already gone */
    }
    router.push("/");
    router.refresh();
  };

  if (loading || !session?.user) {
    return (
      <>
        <Link
          href="/login"
          className={`Nox-focus hidden rounded-pill bg-surface-1 px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-ink no-underline hover:bg-surface-2 min-[810px]:inline-flex ${HOVER}`}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className={`Nox-focus hidden rounded-pill bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline sm:inline-flex ${HOVER}`}
        >
          Start Noxing
        </Link>
        <Link
          href="/signup"
          className={`Nox-focus inline-flex rounded-pill bg-white px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-black no-underline sm:hidden ${HOVER}`}
        >
          Start
        </Link>
      </>
    );
  }

  const user = session.user;
  const items = [
    { href: `/u/${user.username}`, label: "Profile", Icon: User },
    { href: "/settings", label: "Settings", Icon: Settings },
  ];

  return (
    <div ref={wrapRef} className="relative hidden min-[810px]:block">
      <button
        type="button"
        onClick={() => (open ? close() : (setClosing(false), setOpen(true)))}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account — ${user.username}`}
        className="Nox-focus block cursor-pointer rounded-full"
      >
        <Avatar user={user} size={36} />
      </button>
      <div className="absolute top-[calc(100%+8px)] right-0">
        <div
          role="menu"
          aria-label="Account"
          data-origin="top-right"
          className={`t-dropdown ${open ? "is-open" : closing ? "is-closing" : ""}`}
        >
          <div
            className="w-52 bg-surface-1 p-2"
            style={{
              borderRadius: "15px",
              boxShadow: "var(--shadow-floating)",
              visibility: open || closing ? "visible" : "hidden",
            }}
          >
            <p className="truncate px-3 pt-2 pb-1 text-[13px] text-ink-muted">
              @{user.username}
            </p>
            {items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                tabIndex={open ? 0 : -1}
                onClick={close}
                className={`Nox-focus flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[14px] font-medium no-underline ${HOVER} bg-transparent text-ink hover:bg-surface-2`}
              >
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            ))}
            <div className="my-1 border-t border-hairline-soft" />
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={onLogout}
              className={`Nox-focus flex w-full cursor-pointer items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-[14px] font-medium text-danger hover:bg-surface-2 ${HOVER}`}
            >
              <LogOut size={16} strokeWidth={2} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
