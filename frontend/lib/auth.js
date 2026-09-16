/**
 * Auth API client — talks to the Nox API (default http://localhost:4000).
 * Override with NEXT_PUBLIC_API_URL when the API lives elsewhere.
 *
 * All requests send cookies (credentials: "include") so the httpOnly
 * session cookie set on register-verify/login flows along automatically.
 */

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

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
  /**
   * Google OAuth kickoff → { url, redirect }. Redirect the browser to `url`
   * (Google), which returns to `callbackURL` for returning users,
   * `newUserCallbackURL` for fresh signups, or `errorCallbackURL` with
   * ?error= on failure. Full-page redirect — no popup to block.
   * Paths are relative frontend paths ("/dashboard"); the API prefixes
   * FRONTEND_URL itself.
   */
  googleAuthURL: ({ callbackURL, newUserCallbackURL, errorCallbackURL, loginHint } = {}) =>
    request("/api/auth/sign-in/social", {
      method: "POST",
      body: { provider: "google", callbackURL, newUserCallbackURL, errorCallbackURL, loginHint },
    }),
  me: () => request("/auth/me"),
  /** Verify the 6-digit signup code → session. */
  verifyOtp: (email, otp) =>
    request("/auth/verify-email", { method: "POST", body: { email, otp } }),
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
  /** Queue a visible-test run → 202 { runId }. files: [{ path, content }]. */
  runTests: (ref, files) =>
    request(`/challenges/${encodeURIComponent(ref)}/run`, {
      method: "POST",
      body: { files },
    }),
  /** Poll a run — owner or admin only. */
  getRun: (runId) => request(`/runs/${encodeURIComponent(runId)}`),
  /** Submit for hidden judging → 202 { submissionId }. */
  submitChallenge: (ref, files) =>
    request(`/challenges/${encodeURIComponent(ref)}/submit`, {
      method: "POST",
      body: { files },
    }),
  /** Poll a submission verdict — owner or admin only. */
  getSubmission: (id) => request(`/submissions/${encodeURIComponent(id)}`),
  /** Own submission history, newest first. */
  mySubmissions: (page = 1, limit = 20) =>
    request(`/users/me/submissions?page=${page}&limit=${limit}`),
  /** Leaderboard — type: global | level | weekly | language | category.
   *  params: { limit, page, language, category }. Language boards need
   *  `language`, category boards need `category`, weekly accepts both
   *  as optional filters. */
  listLeaderboard: (type = "global", params = {}) => {
    const allowed = ["global", "level", "weekly", "language", "category"];
    const board = allowed.includes(type) ? type : "global";
    const qs = new URLSearchParams();
    for (const k of ["limit", "page", "language", "category"]) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const suffix = qs.toString();
    return request(`/leaderboard/${board}${suffix ? `?${suffix}` : ""}`);
  },
  /** Own position on a board — 401 when signed out (callers treat as “—”). */
  myBoardPosition: (type = "global", params = {}) => {
    const qs = new URLSearchParams({ type });
    for (const k of ["language", "category"]) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    return request(`/leaderboard/me?${qs.toString()}`);
  },
  /** Rank ladder + XP tuning (source of truth lives in backend scoring). */
  ranksConfig: () => request("/leaderboard/ranks"),
  // ── Community solutions (solved-only reads) ──
  /** List a challenge's solutions — sort: newest | top. */
  listSolutions: (ref, params = {}) => {
    const qs = new URLSearchParams();
    for (const k of ["sort", "page", "limit"]) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const suffix = qs.toString();
    return request(`/challenges/${encodeURIComponent(ref)}/solutions${suffix ? `?${suffix}` : ""}`);
  },
  /** Share a write-up — { title, body, code, language, tags[] }. */
  shareSolution: (ref, data) =>
    request(`/challenges/${encodeURIComponent(ref)}/solutions`, {
      method: "POST",
      body: data,
    }),
  /** Full post + code. 403 when the viewer hasn't solved the challenge. */
  getSolution: (id) => request(`/solutions/${encodeURIComponent(id)}`),
  /** Author/admin edit — partial { title, body, code, language, tags }. */
  editSolution: (id, data) =>
    request(`/solutions/${encodeURIComponent(id)}`, { method: "PATCH", body: data }),
  /** Author/admin delete (removes thread + likes). */
  deleteSolution: (id) =>
    request(`/solutions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  /** Toggle like → { liked, likeCount }. */
  toggleSolutionLike: (id) =>
    request(`/solutions/${encodeURIComponent(id)}/like`, { method: "POST" }),
  /** Thread — oldest first. */
  listComments: (id, params = {}) => {
    const qs = new URLSearchParams();
    for (const k of ["page", "limit"]) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const suffix = qs.toString();
    return request(`/solutions/${encodeURIComponent(id)}/comments${suffix ? `?${suffix}` : ""}`);
  },
  /** Reply → { comment, commentCount }. */
  postComment: (id, body) =>
    request(`/solutions/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      body: { body },
    }),
  /** Author/admin comment edit. */
  editComment: (id, body) =>
    request(`/comments/${encodeURIComponent(id)}`, { method: "PATCH", body: { body } }),
  /** Author/admin comment delete → { deleted, commentCount }. */
  deleteComment: (id) =>
    request(`/comments/${encodeURIComponent(id)}`, { method: "DELETE" }),
  /** Toggle comment like → { liked, likeCount }. */
  toggleCommentLike: (id) =>
    request(`/comments/${encodeURIComponent(id)}/like`, { method: "POST" }),
  /** Own posts, newest first. */
  mySolutions: (page = 1, limit = 20) =>
    request(`/users/me/solutions?page=${page}&limit=${limit}`),
  /** Community feed — newest write-ups from challenges you solved. */
  recentSolutions: (page = 1, limit = 20) =>
    request(`/solutions/recent?page=${page}&limit=${limit}`),
  /** Author posts visible to the viewer (solved-only filtering server-side). */
  authorSolutions: (username, page = 1, limit = 20) =>
    request(`/users/${encodeURIComponent(username)}/solutions?page=${page}&limit=${limit}`),
  /** Challenge catalog — filters: q, difficulty, language, category, tag, sort, page, limit. */
  listChallenges: (params = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const suffix = qs.toString();
    return request(`/challenges${suffix ? `?${suffix}` : ""}`);
  },
  /** Challenge detail — starter files + visible tests (hidden stripped server-side). */
  getChallenge: (slug) => request(`/challenges/${encodeURIComponent(slug)}`),
  /** Achievement catalog + viewer's unlocked keys (anonymous: catalog only). */
  achievementsCatalog: () => request("/achievements"),
  /** Daily challenge — today's canonical pick (UTC auto-rotation).
   *  Optional date: "YYYY-MM-DD" for a historic day. */
  getDailyChallenge: (date) =>
    request(`/daily-challenge${date ? `?date=${encodeURIComponent(date)}` : ""}`),
};

/** Rank ladder mirror — source of truth is backend workers/scoring.js. */
const RANK_STEPS = [
  [2200, "Grandmaster"],
  [2000, "Master"],
  [1800, "Diamond"],
  [1600, "Platinum"],
  [1400, "Gold"],
  [1200, "Silver"],
  [-Infinity, "Bronze"],
];

export function rankFor(rating) {
  return RANK_STEPS.find(([min]) => (rating ?? 1000) >= min)?.[1] ?? "Bronze";
}

/** Progress within the current rank toward the next one (dashboard card). */
export function rankProgress(rating) {
  const r = rating ?? 1000;
  const asc = [...RANK_STEPS].sort((a, b) => a[0] - b[0]);
  let idx = 0;
  asc.forEach(([min], i) => {
    if (r >= min) idx = i;
  });
  const current = asc[idx];
  const next = asc[idx + 1] ?? null;
  if (!next) return { current: current[1], next: null, nextMin: null, remaining: 0, pct: 100 };
  const floor = Number.isFinite(current[0]) ? current[0] : 0;
  const span = Math.max(1, next[0] - floor);
  const into = Math.max(0, r - floor);
  return {
    current: current[1],
    next: next[1],
    nextMin: next[0],
    remaining: Math.max(0, next[0] - r),
    pct: Math.min(100, Math.round((into / span) * 100)),
  };
}

/** MVP languages (PRD §8) with display labels. */
export const LANGUAGES = [
  { slug: "javascript", label: "JavaScript" },
  { slug: "typescript", label: "TypeScript" },
  { slug: "Python", label: "Python" },
];

/** Challenge categories as onboarding interests (PRD §7.3). */
export const INTERESTS = [
  { slug: "newbies", label: "Newbies" },
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
