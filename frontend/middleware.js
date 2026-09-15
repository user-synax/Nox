import { NextResponse } from "next/server";

/**
 * Auth gating at the edge.
 *
 * The session cookie is httpOnly on the API origin, so middleware can only
 * check PRESENCE (Nox.*), not validity — pages re-verify via /users/me and
 * clear stale cookies with signOutAndLogin() (lib/auth.js), which is what
 * keeps an expired cookie from ping-ponging between /login and /dashboard.
 */

const SESSION_COOKIE_PREFIX = "Nox.";
const AUTH_PAGES = new Set(["/", "/login", "/signup"]);
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/settings"];

function hasSession(req) {
  return req.cookies
    .getAll()
    .some((c) => c.name.startsWith(SESSION_COOKIE_PREFIX));
}

function isProtected(pathname) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const loggedIn = hasSession(req);

  // Logged-in users never see landing / auth pages.
  if (loggedIn && AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  // Logged-out users never enter the app shell.
  if (!loggedIn && isProtected(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/dashboard",
    "/dashboard/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
