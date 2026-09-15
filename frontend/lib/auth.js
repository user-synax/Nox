/**
 * Auth API client — talks to the Nox API (default http://localhost:4000).
 * Override with NEXT_PUBLIC_API_URL when the API lives elsewhere.
 *
 * All requests send cookies (credentials: "include") so the httpOnly
 * session cookie set on register-verify/login flows along automatically.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Allowed email domains (anti-spam gate).
 * Mirrors ALLOWED_EMAIL_DOMAINS in backend/src/validation.js — the server
 * re-checks, this is just for instant client-side feedback.
 */
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "proton.me",
  "yahho.com",
  "icloud.com",
  "aol.com",
  "outlook.com",
  "hotmail.com",
];

export function emailDomainAllowed(email) {
  const domain =
    String(email ?? "")
      .trim()
      .toLowerCase()
      .split("@")[1] ?? "";
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function emailDomainMessage() {
  return `Use an email from: ${ALLOWED_EMAIL_DOMAINS.join(", ")}.`;
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON (empty logout body, proxies, …) */
  }
  if (!res.ok) {
    // Backend error shapes: Zod aliases → { error, issues? },
    // Better Auth passthrough → { message, code? }.
    const message =
      data?.error ?? data?.message ?? "Something went wrong. Try again.";
    const err = new Error(message);
    err.status = res.status;
    err.code = data?.code ?? null;
    err.issues = data?.issues ?? null;
    err.data = data;
    throw err;
  }
  return data;
}

/** Multipart variant (avatar upload) — the browser sets the boundary. */
async function requestForm(path, form) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = new Error(data?.error ?? data?.message ?? "Upload failed. Try again.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const auth = {
  register: ({ email, password, username, displayName }) =>
    request("/auth/register", {
      method: "POST",
      body: { email, password, username, displayName },
    }),
  login: ({ email, password }) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  verifyEmail: (token) =>
    request("/auth/verify-email", { method: "POST", body: { token } }),
  forgotPassword: (email) =>
    request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, password) =>
    request("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    }),
  // Better Auth default endpoint (no PRD alias needed) — re-sends the
  // verification link when a login is blocked as unverified.
  resendVerification: (email) =>
    request("/api/auth/send-verification-email", {
      method: "POST",
      body: { email, callbackURL: "/" },
    }),
  // ── Profile (PRD §6 / §28) ──
  /** Fresh session user + stats (includes onboarding flag). Null when signed out. */
  meFull: () => request("/users/me"),
  /** Partial profile save — displayName, bio, website, githubUrl, interests, preferredLanguages. */
  updateProfile: (data) =>
    fetch(`${API_BASE}/users/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (res) => {
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err = new Error(json?.error ?? "Could not save profile.");
        err.status = res.status;
        err.issues = json?.issues ?? null;
        throw err;
      }
      return json;
    }),
  /** Final onboarding save — stamps completion on first call. */
  completeOnboarding: (data) =>
    request("/users/me/onboarding", { method: "POST", body: data ?? {} }),
  /** Avatar upload (JPEG/PNG/WebP ≤ 2 MB) → { avatarUrl }. */
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("avatar", file);
    return requestForm("/users/me/avatar", form);
  },
  /** Public profile — no session needed. */
  publicProfile: (username) =>
    request(`/users/${encodeURIComponent(username)}`),
};

/** MVP languages (PRD §8) with display labels. */
export const LANGUAGES = [
  { slug: "javascript", label: "JavaScript" },
  { slug: "typescript", label: "TypeScript" },
  { slug: "Python", label: "Python" },
];

/** Challenge categories as onboarding interests (PRD §7.3). */
export const INTERESTS = [
  { slug: "general", label: "General Debugging" },
  { slug: "algorithms", label: "Algorithms / Logic" },
  { slug: "frontend", label: "Frontend" },
  { slug: "backend", label: "Backend" },
  { slug: "security", label: "Security" },
  { slug: "database", label: "Database" },
  { slug: "performance", label: "Performance" },
];

/**
 * Map a request() error onto { field, message } for the auth forms:
 * Zod issues carry a path; hook errors (taken username, …) are matched
 * by keyword. Returns null when it's a form-level error instead.
 */
export function toFieldError(err) {
  const issue = err?.issues?.[0];
  if (issue?.path) return { field: issue.path, message: issue.message };
  const msg = err?.message ?? "";
  if (/username/i.test(msg)) return { field: "username", message: msg };
  if (/email/i.test(msg)) return { field: "email", message: msg };
  if (/password/i.test(msg)) return { field: "password", message: msg };
  return null;
}

/**
 * Clears a stale server session, then sends the user to /login.
 * App-shell gates use this instead of a bare redirect: without it, an
 * expired (but still present) cookie would bounce /login → /dashboard
 * forever via middleware. signOut always clears cookies, even for dead
 * sessions, so the loop can never form.
 */
export async function signOutAndLogin(router) {
  try {
    await auth.logout();
  } catch {
    /* session already gone — the redirect is what matters */
  }
  router.replace("/login");
}
