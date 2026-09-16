"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "../../lib/useSession";
import { signOutAndLogin } from "../../lib/auth";
import { SessionContext } from "../../components/SessionScope";
import { Sidebar, MobileTop, TabBar } from "../../components/AppNav";

/**
 * (app) shell — sidebar (lg+) / top bar + tab bar (<lg) around every
 * authenticated page. Owns the session: loading shows a shell skeleton,
 * a dead session is cleared and bounced to /login (loop-safe).
 */
function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-canvas lg:pl-[248px]" aria-hidden="true">
      <div className="hidden w-[248px] lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:border-r lg:border-hairline-soft lg:px-4 lg:py-6">
        <div className="h-9 w-32 animate-pulse rounded-md bg-surface-1" />
        <div className="mt-8 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-md bg-surface-1" />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1200px] animate-pulse px-5 pt-6 sm:px-8 lg:pt-10">
        <div className="h-9 w-64 max-w-full rounded-md bg-surface-1" />
        <div className="mt-2 h-4 w-40 rounded bg-surface-1" />
        <div className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[92px] rounded-xl bg-surface-1" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, error, refresh } = useSession();

  useEffect(() => {
    // Only bounce to /login on a real 401. CORS / network failures have
    // no status (fetch throws) — treating them as "signed out" is what
    // made Ctrl+Shift+R look like a logout when the API CORS was stale.
    if (!loading && !session && error?.status === 401) signOutAndLogin(router);
  }, [loading, session, error, router]);

  if (loading) return <ShellSkeleton />;
  if (!session) {
    // Network/CORS — don't log out, let the user retry once the API is redeployed.
    if (error && error.status !== 401) {
      return (
        <div className="min-h-screen bg-canvas lg:pl-[248px]">
          <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 sm:px-8">
            <p className="text-[14px] leading-5 text-danger">
              Can&apos;t reach the API ({error?.message ?? "network error"}). Check Render CORS / FRONTEND_URL and retry.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="Nox-focus mt-4 inline-flex min-h-[36px] items-center rounded-pill bg-white px-4 text-[14px] font-medium text-black"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <ShellSkeleton />;
  }

  return (
    <SessionContext.Provider value={{ session, loading: false, refresh }}>
      <div className="min-h-screen bg-canvas font-body text-ink lg:pl-[248px]">
        <Sidebar user={session.user} pathname={pathname} />
        <MobileTop user={session.user} />
        <main className="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-28 sm:px-8 lg:pt-10 lg:pb-16">
          {children}
        </main>
        <TabBar user={session.user} pathname={pathname} />
      </div>
    </SessionContext.Provider>
  );
}
