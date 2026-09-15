# Nox Roadmap — Feature Plan

**Product:** Nox (Nox.synax.me)  
**Niche:** Real-world debugging practice platform — developers fix intentionally broken code, pass hidden tests, earn XP/rating, and build a public debugging profile.  
**Current Status:** Alpha / MVP-ish (auth, challenge catalog, visible-test runs, JS + Python execution, drafts, onboarding, public profiles).  
**Last Updated:** 2026-09-15

---

## What's already on the app

### Core loop (mostly working)
- **Auth:** email/password (Better Auth), Google OAuth wired but dormant until credentials set, sessions (7-day DB), logout, password reset (dev-stubbed), rate-limited auth attempts.
- **User profiles:** public `/u/[username]` pages with rating, XP, solved count, streak, level, languages, interests, bio, links; own-profile edit, avatar upload (JPEG/PNG/WebP ≤ 2MB), onboarding wizard (3 steps: profile → languages/interests → links).
- **Challenge catalog:** admin CRUD (ADMIN+), publish/unpublish, hidden-test management, slugs, tags, difficulty, category, kind (`bug-fix`, `logic-error`, `runtime-error`, `api-bug`), time/memory limits, starter files, visible + hidden tests, testContext injection, entry file + entry function.
- **Solving flow:** `/challenges/[slug]/solve` — Monaco editor (Nox-dark theme), multi-file tab switching, autosave drafts to IndexedDB, reset-to-starter, run visible tests (POST `/challenges/:id/run` → 202 `{runId}`), poll for result, test verdict UI with expected/actual diff.
- **Execution:** separate worker process (`bun workers/runner.js`), MongoDB-backed queue (claim/lease/sweep), per-language runners — JavaScript (`node --max-old-space-size=256` + harness) and Python (import harness), sandbox env, temp dirs, cleanup, protocol parsing (`NOX_RESULT:` line + `_result.json`), timeouts, runtime errors, system errors, deep-equal results.
- **Seed data:** 10 curated JS + Python debugging challenges (off-by-one, falsy trap, floating promises, reference trap, binary search bounds, stringly typed, indentation, floor division, etc.).

### UX / presentational
- Dark-canvas design system, Geist + Inter fonts, transitions-dev-style panel reveals, tab pills, sidebar (lg) + mobile top bar + bottom tab bar.
- Landing page skeleton (wordmark, nav, session-aware cluster, mobile hamburger) — landing hero content still TODO.
- Auth pages (login/signup) with field-level shake errors, domain allow-list, Google button stub.

---

## What's clearly missing / next

These are ordered roughly by dependency and upside. Each has a short "why" and a concrete starting shape.

### 1. Hidden-test submission + scoring (the "Submit" milestone)
**Why:** The solve page has a disabled "Submit" button and the PRD describes hidden tests as the source of truth for acceptance. Right now only visible tests run; a user can't actually complete a challenge.

**Shape:**
- New endpoint `POST /challenges/:id/submit` (owner-only, rate-limited) that snapshots files, locks the challenge version, enqueues a job that runs **hiddenTests** (not just visibleTests), writes an immutable submission record, and returns a runId/status.
- Submission model in MongoDB: `userId`, `challengeId`, `challengeVersion`, `language`, `files` snapshot, `status`, `testsPassed`, `testsTotal`, `executionTimeMs`, `score`, `xpAwarded`, `ratingDelta`, `createdAt`. Keep it immutable.
- Result page / in-place expand: show hidden-test outcome, score breakdown (correctness/efficiency/speed/quality per PRD §13), XP gain, rating change, time taken, execution metrics.
- Gate sharing/solution posts on `submission.status === "passed"` for that challenge.
- Bump `attemptCount` on submission (not just on visible-run infra), track first-pass vs. retries for success-rate stats.

**MVP rule:** hidden tests are the acceptance gate; a high score without passing all hidden tests is not accepted.

### 2. Rating, ranks, XP, and leaderboards (competitive layer)
**Why:** The PRD defines rating (Elo-like, start 1000), XP, ranks (Bronze → Grandmaster), weekly + global leaderboards, and streak tracking. The profile already shows rating/XP/level/streak stubs, but nothing computes them yet.

**Shape:**
- `profileStats` collection already exists (seeded at signup with `defaultProfileStats`). Add fields: `rating`, `xp`, `level`, `currentStreak`, `longestStreak`, `lastActiveAt`, `successRate`, `solvedCount`, `attemptCount`, `preferredLanguages`, `categoryBreakdown`.
- After a passing submission: compute XP (per challenge difficulty/estimated time), compute rating delta (simplified Elo: expected = f(userRating, challengeDifficultyRating), delta = K * (actual - expected)), update stats atomically, touch streak (reset if gap > 1 day, increment otherwise), recompute level from XP thresholds.
- Ranks as backend-configurable thresholds (not frontend-hardcoded): store rank thresholds in a small config collection or env, expose on profile + leaderboard cards.
- Leaderboard endpoints: `/leaderboard/global?period=weekly|alltime`, `/leaderboard/language?lang=javascript`, `/leaderboard/category?category=security` — paginated, cached briefly.
- Frontend: leaderboard page (disabled in sidebar today with a "Soon" badge — wire it up).

### 3. Daily challenge
**Why:** PRD §18 — one canonical challenge per day, globally consistent, admin-configurable, contributes to normal progression. Good engagement hook and onboarding destination.

**Shape:**
- Collection `dailyChallenges`: `{ date: "YYYY-MM-DD", challengeId, challengeSlug }`. One per day, admin-settable (admin UI or script).
- Public endpoint `GET /daily-challenge` returns today's challenge (or 404 if none configured). Cache briefly.
- Frontend: landing hero + dashboard widget linking to today's challenge; "yesterday/future" niceties optional for MVP.
- Treat solves identically to normal challenges (XP, rating, streak) — don't double-count.

### 4. Landing page real content (conversion surface)
**Why:** The landing page is currently a navbar + empty `<main>`. For an alpha this is fine, but the app needs a real value proposition, social proof, and a clear "start" path to convert visitors.

**Shape:**
- Hero: "Find the bug. Fix the code. Prove the fix." + subhead + primary CTA ("Start Noxing" → /signup or /challenges if logged in).
- Short "how it works" 3-step strip (read broken code → run tests → submit).
- Featured/challenging challenges strip (public catalog API).
- Maybe a small testimonial / community stat line once there's data.
- Keep the dark Framer-style design language already in DESIGN.md.

### 5. Challenge discovery: list + filter + search page
**Why:** There's a `GET /challenges` endpoint with filters (q, difficulty, language, category, tag, sort, page, limit) and a public catalog, but no `/challenges` browse page is wired yet. Users need a way to find work.

**Shape:**
- `/challenges` page: grid/list of published challenges with title, difficulty chip, language, category, kind, estimated time, solve count, tags.
- Filter bar: search text, difficulty, language, category, tag, sort (recommended/newest/trending/popular).
- Pagination or infinite scroll.
- "Continue" from recent challenges (IndexedDB already records recent views).
- Deep link to `/challenges/[slug]` (overview) → then "Solve" → `/challenges/[slug]/solve`.

### 6. Challenge overview page (read before solve)
**Why:** The solve page lets you jump straight in, but there's no dedicated overview that shows the full description, constraints, hints, starter files preview, visible vs hidden test explanation, and "Start solving" CTA. Good for SEO and comprehension.

**Shape:**
- `/challenges/[slug]` page: full description, kind + difficulty + category chips, constraints, hints (collapsible), starter file list, visible tests count, "Run tests" vs "Submit" explanation, author, estimated time, tags.
- Existing `GET /challenges/[slug]` returns the challenge (visibleTests included, hidden stripped server-side) — reuse it.

### 7. TypeScript execution (language expansion)
**Why:** TypeScript is listed in `LANGUAGES` and `INTERESTS` but `EXECUTABLE_LANGUAGES` only includes `javascript` and `Python`. TypeScript submissions currently return 422. PRD §8.2 wants modular language addition.

**Shape:**
- Add a TS runner (likely compile with `tsc`/esbuild/swc to JS in the temp dir, then run via the JS harness, or run `node --loader` with a TS loader). Decide on one approach; document the compile step in the harness.
- Add TypeScript to `EXECUTABLE_LANGUAGES`.
- Runner concurrency, sandbox, time/memory limits all reuse `common.js` — only the harness + command differ.
- Optional: add a language metadata register so the frontend can list "available" vs "coming soon" cleanly.

### 8. Solution sharing / community posts (after hidden-test pass)
**Why:** PRD §19 — solved users can publish a write-up (title, challenge ref, explanation, solution code, language, tags, likes, comments, bookmarks). Hidden until the challenge is solved by the viewer unless discussion mode. Good retention + community knowledge.

**Shape:**
- New collection `solutions`: `{ challengeId, userId, title, explanation, code, language, tags, createdAt, likedBy, commentCount, bookmarkedBy }`.
- Visibility rule: a solution is visible to a user only if that user has a passing submission for that challenge (or the challenge is marked discussion-mode).
- Endpoints: `POST /solutions`, `GET /solutions?challenge=slug`, `POST /solutions/:id/like`, `POST /solutions/:id/bookmark`, comments later.
- Frontend: "Share solution" button on the post-solve result, solution tab on public profile (already stubbed as empty), solution feed on challenge overview ("accepted solutions" when you've passed).

### 9. Settings page + profile editor (complete the account surface)
**Why:** Sidebar + mobile nav both link to `/settings` (disabled "Soon"-less now), and the PRD wants profile editing. Onboarding sets basics; settings should let you update display name, bio, website, GitHub, languages, interests, avatar, and maybe privacy/notification toggles.

**Shape:**
- `/settings` page: prefilled form from `GET /users/me`, PATCH back via `auth.updateProfile`, avatar re-upload, inline validation.
- Future: password change, email change (with re-verify), connected accounts (Google), session list, delete account.

### 10. Achievements / badges (light gamification)
**Why:** PRD §6 lists achievements + badges on the profile; they're currently absent. They're a low-cost retention tool if kept simple.

**Shape:**
- Collection `achievements`: define a small set (first solve, 7-day streak, hard solved, Python solver, 1000 rating, etc.) with icon + label + description.
- Award on event (passing submission, streak milestone, difficulty milestone). Store `user.achievements[]` or a join collection.
- Show on profile + maybe toast on earn.

### 11. Better sandboxing for execution (security hardening)
**Why:** Today the JS runner uses `node --max-old-space-size=256` and a temp dir, and Python uses a temp dir + import harness. That's a reasonable MVP, but the PRD §10 wants CPU limits, process-count limits, network disabled, no host access, non-root, max output size, etc. As the platform opens up, this matters.

**Shape (incremental):**
- Short-term: enforce `resourceLimits` where the runtime supports it (Node `maxOldSpaceSize`, `timeoutMs`), cap stdout/stderr tail, reject runaway process trees if possible.
- Medium-term: move language runners into Docker containers or a sandboxed runtime (gVisor/firejail/seccomp) so each job is isolated beyond a temp dir. The queue protocol already isolates workers, so swapping in Docker workers later is a runner change, not a core rewrite.
- Keep network disabled, no env leakage (sandbox env already strips most), no secrets in job payloads.

### 12. Email delivery in production (remove dev stubs)
**Why:** Password reset and email verification both use a dev outbox (log + persist to `devOutbox`) guarded by `isProd`. To ship real verification + reset flows, wire a real provider (Resend is mentioned in comments).

**Shape:**
- Replace `recordDevOutbox` / console.log with a real send via Resend (or similar) in production; keep dev outbox for local dev/smoke.
- Flip `requireEmailVerification` to true when ready; the frontend verify-email page + resend flow are already scaffolded.
- Add SMTP/provider config to env, test the full reset + verify loops in smoke.

### 13. Google OAuth activation + future GitHub OAuth
**Why:** Google OAuth config is in place (conditional on `GOOGLE_CLIENT_ID`/`SECRET`), and the frontend has Google buttons (stubbed "coming soon"). GitHub OAuth is listed as a future auth method in PRD §5.

**Shape:**
- Set Google credentials in env → OAuth comes live with no code changes.
- Add GitHub OAuth as a social provider later (PRD §5 future), link by verified email (account linking already enabled for google).

### 14. Admin experience: challenge list UI + daily challenge admin
**Why:** Admin routes exist (list, create, update, publish/unpublish, delete), but there's no admin UI in the frontend — admins work via API or scripts. A lightweight admin surface speeds content authoring and daily-challenge scheduling.

**Shape:**
- `/admin` page (ADMIN+ only): challenge list with status, search, quick edit, publish toggle, hidden-test editor, daily-challenge scheduler (pick today's challenge).
- Keep it simple and guarded; nothing fancier than needed.

### 15. Multi-file + larger project challenges (beyond single entry)
**Why:** MVP is single-entry-function challenges. The PRD §8.2 mentions multi-file projects as a future direction, and the editor already supports multiple files (starterFiles array, tab switching). The runner already stages multiple files. The gap is challenge authoring + test harnesses that span files.

**Shape:**
- Allow challenges with multiple starter files and a harness that imports several modules; the existing `stageJob` already writes all files.
- For more complex scenarios (APIs, multi-module), consider a per-challenge harness template or a Docker-based worker later.

### 16. Rate limits, abuse defenses, and observability (operate confidently)
**Why:** Auth rate limits exist (Better Auth customRules). Run endpoint has `strictAuthLimit`. But general submission abuse, queue abuse, and operational visibility are light.

**Shape:**
- Per-user submission caps (e.g., runs/submissions per minute), IP-level soft limits, max concurrent runs per user.
- Basic observability: structured logs for run lifecycle, queue depth metric, worker health (lease leases, in-flight count), failed-run alerting.
- Cleanup jobs: old runs pruning, draft cleanup, session TTL (already in place).

---

## Bigger / later bets (after the above land)

- **Security + database + performance challenge categories** — the catalog already has these categories seeded; add representative challenges and any special harness needs (e.g., a local server under test for API bugs, DB fixture injection via testContext).
- **Company assessments / private challenges** — private challenge sets, team invites, admin-curated assessments; separate from the public catalog.
- **Multi-language rankboards and per-category leaderboards** — once enough data exists.
- **Code review / diff view on solution posts** — show what changed vs starter.
- **Download/export solution, shareable result cards** — social spread.
- **Mobile apps / PWA hardening** — the app is already fairly mobile-aware; a PWA manifest + offline drafts could make it a genuine on-the-go practice tool.

---

## Dependency notes

- Hidden-test submission (#1) is the gating item for "actually completing a challenge"; most gamification (#2), daily challenge (#3), solution sharing (#8), and achievements (#10) depend on it.
- Discovery pages (#5, #6) and the landing page (#4) are independent frontend work that can land in parallel.
- TypeScript execution (#7) is independent of the submission flow but reuses the runner/queue plumbing.
- Security hardening (#11) and email delivery (#12) are operational; they can progress on their own schedule.

---

## How to use this doc

Treat the numbered sections as a rough priority order, not a rigid sequence. Pick the next item that unblocks the most user value or the most downstream items — usually #1 (hidden-test submission + scoring), then #4/#5/#6 (discovery + landing), then #2 (rating/leaderboards) once real completions exist.
