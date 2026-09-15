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
  const { session, loading, refresh } = useSession();

  useEffect(() => {
    if (!loading && !session) signOutAndLogin(router);
  }, [loading, session, router]);

  if (loading || !session) return <ShellSkeleton />;

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
