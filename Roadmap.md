# Nox Roadmap — Feature Plan

**Product:** Nox (Nox.synax.me)  
**Niche:** Real-world debugging practice platform — developers fix intentionally broken code, pass hidden tests, earn XP/rating, and build a public debugging profile.  
**Current Status:** Late alpha — core loop complete (auth, catalog, Monaco workspace, visible runs, hidden-submit judging, XP/rating/ranks, leaderboards, streaks, daily challenge, solutions + realtime, landing, discovery, settings). Open: TS execution, notifications, moderation/reports/bookmarks, admin UI, achievements, email delivery, sandbox hardening.  
**Last Updated:** 2026-09-16

---

## What's already on the app

### Core loop (working)
- **Auth:** email/password (Better Auth), Google OAuth code-complete (enabled by env, credentials being configured), sessions (7-day DB, daily refresh, 5-min cookie cache), logout, verify-email + password-reset endpoints and pages (enforcement OFF — signup signs straight in, links go to a dev-only outbox until a real provider is wired), domain allow-list, rate-limited auth attempts, `make-admin.js` role script.
- **User profiles:** public `/u/[username]` pages (stats, languages/interests, solutions, activity tabs); own-profile edit + `/settings` page, avatar upload (JPEG/PNG/WebP ≤ 2MB via Appwrite), onboarding wizard (3 steps: profile → languages/interests → links).
- **Challenge catalog:** admin CRUD (ADMIN+, API only — no admin UI), publish/unpublish, hidden-test management, version auto-bump, slugs, tags, difficulty, category (all 8 incl. `newbies`), kind (`bug-fix`, `logic-error`, `runtime-error`, `api-bug`), time/memory limits, starter files, visible + hidden tests, testContext injection, entry file + entry function.
- **Solving flow:** `/challenges/[slug]/solve` — Monaco editor (Nox-dark theme), multi-file tab switching, autosave drafts to IndexedDB, reset-to-starter, run visible tests (POST `/challenges/:id/run` → 202 `{runId}`), submit for hidden judging (POST `/challenges/:id/submit` → 202 `{submissionId}`), poll for verdict, score/XP/rating breakdown UI, solved-state read-only lock, share-solution deep link.
- **Judging + progression:** hidden tests are the acceptance gate; stored results keep `{name, passed, error?}` only. Scoring 70/15/10/5, first-accept XP 50/100/200/350 (repeats 10), Elo K=32 vs difficulty anchors, rejected −2 rating, level = 1 + floor(xp/250), backend-owned rank ladder (Bronze → Grandmaster) exposed at `GET /leaderboard/ranks`. Streaks keyed on UTC day.
- **Leaderboards:** global, level, weekly (+ language/category filters), per-language and per-category XP races, own-position endpoint — plus a full frontend page, dashboard mini widget, and rank badges.
- **Daily challenge:** `GET /daily-challenge[?date=]` — deterministic UTC auto-rotation over published challenges (no admin step), hidden tests stripped, dashboard widget with solved state. Normal progression, no bonus.
- **Community:** solved-gated solution posts, likes (solutions + comments), single-thread comments, recent feed (`/community`), solution detail (`/solutions/[id]`), author/own lists. Socket.IO rooms (`challenge:<id>`, `solution:<id>`) fan out solution/comment events. No bookmarks, reports, or notifications.
- **Execution:** separate worker process (`bun workers/runner.js`, concurrency/poll/heartbeat env), MongoDB-backed queue (claim/lease/sweep — Redis/BullMQ deliberately dropped), per-language runners — JavaScript (`node --max-old-space-size=256` + harness) and Python (import harness), temp dirs, cleanup, protocol parsing (`NOX_RESULT:` line + `_result.json`), timeouts, runtime errors, system errors, deep-equal results. TypeScript is metadata-only (422).
- **Seed data:** 59 published challenges (37 JS + 22 Python; 30 easy / 16 medium / 10 hard / 3 expert) across all 8 categories.

### UX / presentational
- Dark-canvas design system, Geist + Inter fonts, transitions-dev-style panel reveals, tab pills, sidebar (lg) + mobile top bar + bottom tab bar.
- Landing page built: hero, interactive broken/fixed demo, how-it-works, example challenge, scoring, progression, profiles, community, FAQ.
- Challenge discovery: `/challenges` catalog (Recommended/All/Newest/Trending, search + filters + pagination) and `/challenges/[slug]` overview (description, starter code, visible tests, solved-gated solutions tab).
- Auth pages (login/signup) with field-level shake errors, domain allow-list, Google button stub (disabled until OAuth live).

---

## What's clearly missing / next

These are ordered roughly by dependency and upside. Each has a short "why" and a concrete starting shape.

### 1. Hidden-test submission + scoring (the "Submit" milestone) — DONE (2026-09-16)
**Was:** The solve page had a disabled "Submit" button and only visible tests ran.

**Shape:**
- New endpoint `POST /challenges/:id/submit` (owner-only, rate-limited) that snapshots files, locks the challenge version, enqueues a job that runs **hiddenTests** (not just visibleTests), writes an immutable submission record, and returns a runId/status.
- Submission model in MongoDB: `userId`, `challengeId`, `challengeVersion`, `language`, `files` snapshot, `status`, `testsPassed`, `testsTotal`, `executionTimeMs`, `score`, `xpAwarded`, `ratingDelta`, `createdAt`. Keep it immutable.
- Result page / in-place expand: show hidden-test outcome, score breakdown (correctness/efficiency/speed/quality per PRD §13), XP gain, rating change, time taken, execution metrics.
- Gate sharing/solution posts on `submission.status === "passed"` for that challenge.
- Bump `attemptCount` on submission (not just on visible-run infra), track first-pass vs. retries for success-rate stats.

**MVP rule:** hidden tests are the acceptance gate; a high score without passing all hidden tests is not accepted.

### 2. Rating, ranks, XP, and leaderboards (competitive layer) — DONE (2026-09-16)
**Was:** The profile showed rating/XP/level/streak stubs, but nothing computed them.

**Shape:**
- `profileStats` collection already exists (seeded at signup with `defaultProfileStats`). Add fields: `rating`, `xp`, `level`, `currentStreak`, `longestStreak`, `lastActiveAt`, `successRate`, `solvedCount`, `attemptCount`, `preferredLanguages`, `categoryBreakdown`.
- After a passing submission: compute XP (per challenge difficulty/estimated time), compute rating delta (simplified Elo: expected = f(userRating, challengeDifficultyRating), delta = K * (actual - expected)), update stats atomically, touch streak (reset if gap > 1 day, increment otherwise), recompute level from XP thresholds.
- Ranks as backend-configurable thresholds (not frontend-hardcoded): store rank thresholds in a small config collection or env, expose on profile + leaderboard cards.
- Leaderboard endpoints: `/leaderboard/global?period=weekly|alltime`, `/leaderboard/language?lang=javascript`, `/leaderboard/category?category=security` — paginated, cached briefly.
- Frontend: leaderboard page (disabled in sidebar today with a "Soon" badge — wire it up).

### 3. Daily challenge — DONE (2026-09-16, as UTC auto-rotation)
**Decision:** pure auto-rotation, no admin step, normal progression only, backend + dashboard widget scope.

- No `dailyChallenges` collection. `GET /daily-challenge[?date=YYYY-MM-DD]` picks deterministically (`days-since-epoch mod published-count` over slug order); UTC day boundary matches streak accounting. Briefly cacheable (`max-age=60`).
- Frontend: dashboard widget wired to today's challenge (solved state, deep link). No landing hero widget, no Daily catalog tab, no archive UI — `?date=` covers historic days and past dailies stay solvable via normal challenge pages.
- Solves go through the standard submit flow (XP, rating, streak) — no bonus, no double-count.
- Future: admin overrides, archive UI, per-language/level variants (PRD §18).

### 4. Landing page real content (conversion surface) — DONE (2026-09-16)
**Was:** The landing page was a navbar + empty `<main>`.

**Shape:**
- Hero: "Find the bug. Fix the code. Prove the fix." + subhead + primary CTA ("Start Noxing" → /signup or /challenges if logged in).
- Short "how it works" 3-step strip (read broken code → run tests → submit).
- Featured/challenging challenges strip (public catalog API).
- Maybe a small testimonial / community stat line once there's data.
- Keep the dark Framer-style design language already in DESIGN.md.

### 5. Challenge discovery: list + filter + search page — DONE (2026-09-16)
**Was:** `GET /challenges` existed but no `/challenges` browse page was wired.

**Shape:**
- `/challenges` page: grid/list of published challenges with title, difficulty chip, language, category, kind, estimated time, solve count, tags.
- Filter bar: search text, difficulty, language, category, tag, sort (recommended/newest/trending/popular).
- Pagination or infinite scroll.
- "Continue" from recent challenges (IndexedDB already records recent views).
- Deep link to `/challenges/[slug]` (overview) → then "Solve" → `/challenges/[slug]/solve`.

### 6. Challenge overview page (read before solve) — DONE (2026-09-16)
**Was:** The solve page was the only entry point, with no read-first overview.

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

### 8. Solution sharing / community posts (after hidden-test pass) — DONE except bookmarks (2026-09-16)
**Was:** No community surface existed.

**Shape:**
- New collection `solutions`: `{ challengeId, userId, title, explanation, code, language, tags, createdAt, likedBy, commentCount, bookmarkedBy }`.
- Visibility rule: a solution is visible to a user only if that user has a passing submission for that challenge (or the challenge is marked discussion-mode).
- Endpoints: `POST /solutions`, `GET /solutions?challenge=slug`, `POST /solutions/:id/like`, `POST /solutions/:id/bookmark`, comments later.
- Frontend: "Share solution" button on the post-solve result, solution tab on public profile (already stubbed as empty), solution feed on challenge overview ("accepted solutions" when you've passed).

### 9. Settings page + profile editor (complete the account surface) — DONE (2026-09-16)
**Was:** `/settings` was linked but unbuilt.

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
- `/admin` page (ADMIN+ only): challenge list with status, search, quick edit, publish toggle, hidden-test editor. (No daily scheduler needed — daily is auto-rotation; an override UI only if admin curation is ever wanted.)
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

- ~~Hidden-test submission (#1) is the gating item~~ — landed; gamification (#2), daily (#3), and solution sharing (#8) are live on top of it.
- Remaining independent tracks: TypeScript execution (#7), achievements (#10), multi-file authoring (#15).
- Security hardening (#11) and email delivery (#12) are operational; they can progress on their own schedule. Email delivery gates turning verification enforcement back ON.
- Suggested next: #10 achievements (cheap retention, hooks into the passing-submission path), #12 email delivery (unblocks verification), #14 admin UI (challenge list + daily override now that rotation exists), then #7 TypeScript.

---

## How to use this doc

Treat the numbered sections as a rough priority order, not a rigid sequence. Items marked DONE describe what landed and what was deliberately cut (e.g. daily admin UI, bookmarks) so future work doesn't re-litigate them.
