import { NextResponse } from "next/server";

/**
 * Auth gating at the edge.
 *
 * NOTE (cross-origin production): the session cookie (Nox.session) is
 * httpOnly on the API origin (e.g. https://nox-aaqu.onrender.com), so
 * this middleware — running on the FRONTEND origin — can never see it.
 * req.cookies only contains frontend-origin cookies.
 *
 * That means presence checks here are always "logged out" in production,
 * which used to bounce every verified user /onboarding → /login and make
 * login look broken (API login 200s, then GET /users/me 401s because the
 * old SameSite=Lax cookie was never sent cross-site either).
 *
 * So the edge does NOT gate protected routes. Client-side gates own auth:
 * (app)/layout.js + /onboarding via useSession()/auth.meFull() (401 →
 * signOutAndLogin → /login, loop-safe). This middleware stays as an
 * explicit pass-through so the intent is documented where future
 * same-origin fast-paths would go.
 */

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/dashboard",
    "/dashboard/:path*",
    "/challenges",
    "/challenges/:path*",
    "/community",
    "/community/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
