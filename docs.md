# Nox — Documentation

> **Nox** is a developer practice and competitive platform focused on real-world debugging.
> Fix intentionally broken code, pass hidden tests, earn XP and ratings, and build a public developer profile.

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.3.5 | React framework (App Router) |
| React | 19.2.8 | UI library |
| Tailwind CSS | v4 | Utility-first styling |
| shadcn/ui | base-nova | One Button vendored; UI otherwise bespoke |
| Monaco Editor | @monaco-editor/react 4.7.0 | In-browser editor (`Nox-dark` theme) |
| socket.io-client | 4.8.3 | Community realtime fan-out |
| Lucide React | 1.46.0 | Icons |
| Geist / Geist Mono | — | Typography (code + display) |
| Inter | — | Body typography |
| tw-animate-css | 1.4.0 | Animation utilities |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | v18+ | Runtime |
| Express.js | 4.21.2 | HTTP framework |
| Hand-rolled sessions | — | Opaque tokens + scrypt passwords, Google OAuth code flow (no auth deps) |
| MongoDB | 6.12.0 | Database (native driver) |
| Zod | 3.23.8 | Schema validation |
| Helmet | 8.0.0 | Security headers |
| CORS | 2.8.5 | Cross-origin resource sharing |
| Multer | 2.4.0 | Multipart file uploads |
| node-appwrite | 29.0.0 | Avatar storage |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| MongoDB-backed queue | Execution jobs (`runs`: atomic claim, leases, sweep) — Redis/BullMQ deliberately dropped |
| Worker processes | `bun workers/runner.js` (JS + Python runners, temp dirs, heartbeats) |
| Appwrite | Avatar file storage |
| Socket.IO | Live solution/comment events (challenge + solution rooms) |
| Container sandboxing | Code execution hardening (planned; temp dirs today) |

### Dev Tooling

| Tool | Purpose |
|------|---------|
| Bun | Package manager + runtime |
| ESLint | Linting |
| PostCSS | CSS processing |

---

## Current Features (Available in App)

### Authentication

| Feature | Status | Details |
|---------|--------|---------|
| Email/password registration | Available | Username, email, password with validation |
| Email/password login | Available | Session-based with httpOnly cookies |
| Logout | Available | Clears session cookie |
| Email verification | Available | Enforced 6-digit OTP — signup → `/verify` code screen → onboarding; login 403 until verified, with resend |
| Forgot password | Available | Emailed reset link (Resend; dev-outbox fallback) |
| Reset password | Available | Token-based password change |
| Email provider | Available | Resend (`RESEND_API_KEY`); dev outbox fallback when unset; prod boot fails without key |
| Google OAuth | Configured | Code-complete — enabled by `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env |
| Session management | Available | 7-day DB expiry, daily refresh, single-use email tokens |
| Domain allowlist | Available | Gmail, Proton, iCloud, Outlook, etc. |
| Rate limiting | Available | 20 req/min on auth endpoints |

### User Profiles

| Feature | Status | Details |
|---------|--------|---------|
| Public profile page | Available | `/u/[username]` — stats, bio, links |
| Profile editing | Available | Display name, bio, website, GitHub URL |
| Avatar upload | Available | JPEG/PNG/WebP, max 2MB, stored in Appwrite |
| Avatar fallback | Available | Colored circle with initial letter |
| Onboarding wizard | Available | 3-step: profile → focus/interests → links |
| Language preferences | Available | JavaScript, TypeScript, Python |
| Interest categories | Available | General Debugging, Algorithms, Frontend, Backend, Security, Database, Performance |

### Profile Stats

| Stat | Description |
|------|-------------|
| Rating | Competitive rating (starts at 1000) |
| XP | Experience points |
| Level | Derived from XP |
| Current streak | Days solved in a row |
| Longest streak | Best streak ever |
| Solved count | Total challenges solved |
| Success rate | Solved / attempted ratio |

### Challenge System (Backend)

| Feature | Status | Details |
|---------|--------|---------|
| Challenge catalog API | Available | Paginated, filterable, sortable |
| Challenge detail API | Available | Full challenge with starter files + visible tests |
| Text search | Available | Search by keyword |
| Filter by difficulty | Available | Easy, Medium, Hard, Expert |
| Filter by language | Available | JavaScript, TypeScript, Python |
| Filter by category | Available | 7 categories |
| Sort options | Available | Recommended, Newest, Trending, Popular |
| Recommended sort | Available | Personalized based on user preferences |
| Challenge versioning | Available | Auto-bumps version on content changes |

### Seeded Challenges (59 published — `bun scripts/seed-challenges.js`, safe to re-run)

| Language | Count |
|----------|-------|
| JavaScript | 37 |
| Python | 22 |

| Difficulty | Count |
|------------|-------|
| Easy | 30 |
| Medium | 16 |
| Hard | 10 |
| Expert | 3 |

| Category | Count |
|----------|-------|
| newbies | 14 |
| algorithms | 8 |
| backend | 8 |
| general | 7 |
| frontend | 6 |
| security | 6 |
| database | 5 |
| performance | 5 |

TypeScript is listed in language metadata but not executable (submissions return 422).

### Execution & Judging

| Feature | Status | Details |
|---------|--------|---------|
| Visible test runs | Available | `POST /challenges/:id/run` → 202 `{ runId}`, poll `GET /runs/:id` |
| Hidden-test submits | Available | `POST /challenges/:id/submit` → 202 `{ submissionId }`, immutable record, locked once solved |
| Acceptance rule | Available | Accepted ⇔ every hidden test passed; stored results keep `{ name, passed, error? }` only |
| Scoring | Available | 70 correctness / 15 efficiency / 10 speed / 5 quality |
| XP | Available | First accept 50/100/200/350 by difficulty; repeats 10 |
| Rating | Available | Elo K=32 vs difficulty anchors; rejected submits −2 |
| Level | Available | `1 + floor(xp / 250)` |
| Ranks | Available | Bronze → Grandmaster, backend-owned (`GET /leaderboard/ranks`) |
| Streaks | Available | Current/longest on UTC-day accepted solves |
| Solve workspace | Available | `/challenges/[slug]/solve` — Monaco, multi-file tabs, IDB drafts, reset, verdict UI |

### Leaderboards

| Board | Endpoint |
|-------|----------|
| Global (rating) | `GET /leaderboard/global` |
| Level (XP) | `GET /leaderboard/level` |
| Weekly (7-day delta, + language/category filters) | `GET /leaderboard/weekly` |
| Per-language XP race | `GET /leaderboard/language?language=` |
| Per-category XP race | `GET /leaderboard/category?category=` |
| Own position | `GET /leaderboard/me?type=` |
| Rank/XP tuning | `GET /leaderboard/ranks` |

Full frontend page (`/leaderboard`) + dashboard mini widget + rank badges. Per-track XP is credited by the judge, no extra collections.

### Daily Challenge

| Feature | Status | Details |
|---------|--------|---------|
| Canonical pick | Available | `GET /daily-challenge[?date=YYYY-MM-DD]` — deterministic UTC auto-rotation over published challenges, no admin step |
| Dashboard widget | Available | Title, date, difficulty/language, solved badge, deep link |
| Progression | Available | Standard submit flow — normal XP/rating/streak, no bonus |

### Solutions & Community

| Feature | Status | Details |
|---------|--------|---------|
| Solution posts | Available | Solved-gated reads (403 until viewer accepted), CRUD by author/admin |
| Comments | Available | Single thread per solution, CRUD + likes |
| Likes | Available | Toggle on solutions and comments |
| Community feed | Available | `/community` — recent write-ups from challenges you solved |
| Realtime | Available | Socket.IO `challenge:<id>` / `solution:<id>` rooms: `solution:new/updated/deleted/like`, `comment:new/updated/deleted/like` |
| Bookmarks | Planned | Not built |
| Reports / moderation | Planned | No endpoints; no audit log |

### Admin System (Backend)

| Feature | Status | Details |
|---------|--------|---------|
| Challenge CRUD | Available | API only (no admin UI) — create, read, update, delete |
| Publish/unpublish | Available | Toggle challenge visibility |
| Challenge preview | Available | Full challenge data including hidden tests (admin routes only) |
| User role management | Available | `make-admin.js` script (no user admin endpoints) |
| RBAC enforcement | Available | USER < MODERATOR < ADMIN < FOUNDER, enforced on API |
| Hidden test management | Available | Via admin challenge write endpoints; content edits bump `version` |

### Security

| Feature | Status | Details |
|---------|--------|---------|
| httpOnly cookies | Available | Session cookies with `Nox.` prefix |
| CORS | Available | Frontend origin only |
| Helmet headers | Available | Security headers on all responses |
| Input validation | Available | Zod schemas on all endpoints |
| Rate limiting | Available | Per-IP sliding window |
| RBAC | Available | Role-based access on admin routes |
| Hidden test protection | Available | Never exposed on public endpoints |
| Audit logging | Planned | Not yet implemented |

---

## Roadmap (Future Features)

### Phase 1 — MVP Completion

| Feature | Status | Priority |
|---------|--------|----------|
| Monaco code editor integration | Available | High |
| Visible test runner | Available | High |
| Hidden test execution | Available | High |
| Isolated code execution (temp-dir workers) | Available | High |
| Container sandboxing (hardening) | Not started | High |
| Submission system | Available | High |
| XP and rating calculation | Available | High |
| Rank system (Bronze → Grandmaster) | Available | High |
| Global leaderboard | Available | High |
| Weekly leaderboard (+ level/language/category) | Available | High |
| Streak tracking | Available | Medium |
| Daily challenge (auto-rotation + widget) | Available | Medium |
| Solution sharing | Available | Medium |
| Likes, comments | Available | Medium |
| Bookmarks | Not started | Low |
| TypeScript execution | Not started | Medium |
| In-app notifications | Not started | Medium |
| Admin dashboard (frontend) | Not started | High |
| Content moderation / reports | Not started | Medium |

### Phase 2 — Better Debugging

| Feature | Status |
|---------|--------|
| Multi-file project challenges | Not started |
| Broken Express API challenges | Not started |
| Broken React app challenges | Not started |
| Stack traces and logs | Not started |
| Environment variables in challenges | Not started |
| Database fixtures | Not started |
| Advanced scoring (root-cause quality) | Not started |

### Phase 3 — Competitive Nox

| Feature | Status |
|---------|--------|
| Seasons | Not started |
| Divisions | Not started |
| Promotion/relegation | Not started |
| Time-limited challenges | Not started |
| Challenge races | Not started |
| Regional/global rankings | Not started |
| Team competitions | Not started |
| Tournament brackets | Not started |
| Spectator mode | Not started |

### Phase 4 — Community Challenge Platform

| Feature | Status |
|---------|--------|
| User-created challenges | Not started |
| Challenge author tools | Not started |
| Test builder | Not started |
| Difficulty proposal | Not started |
| Challenge preview mode | Not started |
| Community challenge review | Not started |

### Phase 5 — Security & Production Debugging

| Feature | Status |
|---------|--------|
| Authentication bypass challenges | Not started |
| Injection flaw challenges | Not started |
| SSRF-style scenarios | Not started |
| Production incident simulations | Not started |
| Log analysis challenges | Not started |

### Phase 6 — AI-Assisted Learning

| Feature | Status |
|---------|--------|
| Progressive hints | Not started |
| Root-cause explanation after solve | Not started |
| Personalized learning recommendations | Not started |
| Post-solve code review | Not started |

### Phase 7 — Developer Portfolio

| Feature | Status |
|---------|--------|
| Shareable skill card | Not started |
| Verified skill badges | Not started |
| GitHub integration | Not started |
| Resume export | Not started |
| Public skill graph | Not started |

### Phase 8 — Company Assessments

| Feature | Status |
|---------|--------|
| Company assessment sets | Not started |
| Candidate invitations | Not started |
| Private challenge pools | Not started |
| Submission review | Not started |
| Skill reports | Not started |

---

## API Reference

### Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Email/password login |
| `POST` | `/auth/logout` | Clear session |
| `GET` | `/auth/me` | Current session |
| `POST` | `/auth/verify-email` | Verify 6-digit code (`{ email, otp }`) |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password with token |

### User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/me` | Full profile + stats (auth required) |
| `PATCH` | `/users/me` | Update profile |
| `POST` | `/users/me/avatar` | Upload avatar (needs full Appwrite config) |
| `POST` | `/users/me/onboarding` | Complete onboarding |
| `GET` | `/users/me/submissions` | Own submission history |
| `GET` | `/users/me/solutions` | Own write-ups |
| `GET` | `/users/:username` | Public profile |
| `GET` | `/users/:username/solutions` | Author write-ups (solved-only filtered) |

### Challenge Endpoints (Public)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/challenges` | List challenges (paginated, filterable) |
| `GET` | `/challenges/:slug` | Challenge detail with starter files |
| `GET` | `/daily-challenge[?date=]` | Canonical daily pick (UTC auto-rotation) |

### Run & Submission Endpoints (auth, 202 + poll)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/challenges/:id/run` | Queue visible-test run → `{ runId }` |
| `GET` | `/runs/:id` | Run state (owner/admin) |
| `POST` | `/challenges/:id/submit` | Hidden judging → `{ submissionId }` |
| `GET` | `/submissions/:id` | Verdict + breakdown (owner/admin) |

### Leaderboard Endpoints (public)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/leaderboard/global` | Rating ladder |
| `GET` | `/leaderboard/level` | XP race |
| `GET` | `/leaderboard/weekly` | 7-day progression (+ `language`/`category` filters) |
| `GET` | `/leaderboard/language?language=` | Per-language XP race |
| `GET` | `/leaderboard/category?category=` | Per-category XP race |
| `GET` | `/leaderboard/me?type=` | Own position |
| `GET` | `/leaderboard/ranks` | Rank ladder + XP tuning |

### Solution & Comment Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/challenges/:id/solutions` | Publish write-up (requires accepted submission) |
| `GET` | `/challenges/:id/solutions` | List (403 until viewer solved) |
| `GET` | `/solutions/recent` | Community feed |
| `GET` | `/solutions/:id` | Full post + code |
| `PATCH` / `DELETE` | `/solutions/:id` | Author/admin edit/delete |
| `POST` | `/solutions/:id/like` | Toggle like |
| `GET` / `POST` | `/solutions/:id/comments` | Thread (oldest first) / reply |
| `PATCH` / `DELETE` | `/comments/:id` | Author/admin edit/delete |
| `POST` | `/comments/:id/like` | Toggle like |

#### Query Parameters for `GET /challenges`

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Text search |
| `difficulty` | string | easy, medium, hard, expert |
| `language` | string | javascript, typescript, Python |
| `category` | string | general, algorithms, frontend, backend, security, database, performance |
| `tag` | string | Filter by tag |
| `sort` | string | recommended, newest, trending, popular |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page |

### Admin Endpoints (ADMIN/FOUNDER role required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/challenges` | List all challenges (any status) |
| `POST` | `/admin/challenges` | Create challenge |
| `PATCH` | `/admin/challenges/:id` | Update challenge |
| `POST` | `/admin/challenges/:id/publish` | Publish challenge |
| `POST` | `/admin/challenges/:id/unpublish` | Unpublish challenge |
| `DELETE` | `/admin/challenges/:id` | Delete challenge |

### Health Check & Dev

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | `{ ok, time, queue: { queued, running }, workersOnline }` |
| `GET` | `/auth/dev/outbox?email=` | Dev-only: last verification codes + reset links (never in prod) |

All routes are mounted at both `/` and `/api`.

---

## Database Models

### User

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `email` | string | Unique |
| `emailVerified` | boolean | |
| `name` | string | Synced with displayName |
| `image` | string | Synced with avatarUrl |
| `password` | string | Hashed |
| `username` | string | Unique (partial index) |
| `displayName` | string | |
| `bio` | string | Max 160 chars |
| `website` | string | URL |
| `githubUrl` | string | URL |
| `avatarUrl` | string | |
| `avatarFileId` | string | Appwrite file ID |
| `interests` | string[] | Category slugs |
| `onboardingCompletedAt` | Date | |
| `roles` | string[] | Default: `["USER"]` |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### ProfileStats

| Field | Type | Default |
|-------|------|---------|
| `userId` | string | Unique |
| `rating` | number | 1000 |
| `xp` | number | 0 |
| `level` | number | 1 (`1 + floor(xp/250)`) |
| `xpByLanguage` | object | Per-track XP (language boards) |
| `xpByCategory` | object | Per-track XP (category boards) |
| `solvesByLanguage` | object | Per-track solve counts |
| `solvesByCategory` | object | Per-track solve counts |
| `currentStreak` | number | 0 |
| `longestStreak` | number | 0 |
| `lastActiveDate` | string | UTC `YYYY-MM-DD` or null |
| `solvedCount` | number | Distinct challenges accepted |
| `acceptedCount` | number | 0 |
| `attemptCount` | number | 0 |
| `submissionCount` | number | 0 |
| `successRate` | number | 0 |
| `hardestSolvedChallengeId` | string | null |
| `preferredLanguages` | string[] | [] |
| `skills` | object | {} |

### Challenge

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `title` | string | 3-100 chars |
| `slug` | string | Unique, kebab-case |
| `description` | string | 10-20,000 chars |
| `kind` | enum | bug-fix, logic-error, runtime-error, api-bug |
| `language` | enum | javascript, typescript, Python |
| `difficulty` | enum | easy, medium, hard, expert |
| `category` | enum | general, algorithms, frontend, backend, security, database, performance |
| `tags` | string[] | Max 10 |
| `starterFiles` | object[] | `{ path, content }` |
| `visibleTests` | object[] | `{ name, description, input, expected }` |
| `hiddenTests` | object[] | Never exposed publicly |
| `constraints` | string | Max 2000 chars |
| `hints` | string[] | Max 10 |
| `timeLimitMs` | number | Default: 2000 |
| `memoryLimitMb` | number | Default: 64 |
| `estimatedSolveMinutes` | number | Default: 15 |
| `status` | enum | draft, published |
| `version` | number | Auto-increments on content changes |
| `authorId` | string | |
| `solveCount` | number | |
| `attemptCount` | number | |

Plus `kind`, `entryFile`, `entryFunction`, `testContext{}`, `hints[]`, `estimatedSolveMinutes` (see PRD §28).

### Submission

Immutable once judged. Locks `challengeVersion`; `files[]` is the source snapshot; `results[]` keeps `{ name, passed, error? }` only; `scoreBreakdown` is `{ correctness, efficiency, speed, quality }`. Statuses: `pending → accepted | rejected | timeout | runtime-error | system-error`.

### Run / RatingEvent / Solution / Comment / Like

- **Run:** visible-test job + result (`queued → running → passed | failed | timeout | runtime-error | system-error`, up to 3 attempts on infra faults). Doubles as the queue row.
- **RatingEvent:** per judged submit (feeds weekly boards + activity).
- **Solution:** author + challenge ref, title/body/code/language/tags, like/comment counts.
- **Comment:** single thread per solution. **Like:** unique `{ targetType, targetId, userId }` shared by solutions + comments.

---

## Frontend Pages

### Public Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, live broken/fixed demo, how-it-works, scoring, progression, FAQ |
| `/login` | Login | Email/password form + Continue with Google |
| `/signup` | Signup | Registration form |
| `/forgot-password` | Forgot Password | Email input |
| `/reset-password` | Reset Password | New password form |
| `/verify` | Verify | 6-digit code screen (email prefilled via `?email=`) |
| `/u/[username]` | Public Profile | Stats, languages/interests, solutions, activity |
| `/leaderboard` | Leaderboards | Global / level / weekly / language / category + own position |
| `/solutions/[id]` | Solution Detail | Post, code, likes, comment thread (solved-gated) |
| `/privacy`, `/terms`, `/cookies` | Legal | Static policy pages |

### Authenticated Pages

| Route | Page | Description |
|-------|------|-------------|
| `/onboarding` | Onboarding | 3-step new user wizard |
| `/dashboard` | Dashboard | Stats, checklist, daily widget, activity, rank rail |
| `/settings` | Settings | Profile editing + avatar |
| `/challenges` | Challenge catalog | Tabs, search, filters, pagination |
| `/challenges/[slug]` | Challenge overview | Description, starter code, visible tests, solutions tab |
| `/challenges/[slug]/solve` | Solve workspace | Monaco, run/submit, verdict UI |
| `/community` | Community feed | Recent solutions with live updates |

### Planned Pages (Not Yet Built)

| Route | Page |
|-------|------|
| `/submissions` | Submission history (API + dashboard activity exist) |
| `/notifications` | In-app notifications (no backend yet) |
| `/admin` | Admin dashboard (API only today) |

---

## Component Reference

| Component | File | Purpose |
|-----------|------|---------|
| `Sidebar` | `components/AppNav.js` | Desktop nav: dashboard, challenges, leaderboard, community, profile, settings |
| `MobileTop` | `components/AppNav.js` | Mobile sticky header |
| `TabBar` | `components/AppNav.js` | Mobile bottom tab bar |
| `CodeEditor` | `components/CodeEditor.js` | Monaco wrapper (`Nox-dark`, per-file models) |
| `DifficultyBadge`, `KIND_LABEL` | `components/ChallengeBits.js` | Challenge chips + formatting |
| `Leaderboard*`, `RankBadge` | `components/Leaderboard.js` | Boards, rows, mini widget, rank badges |
| `SolutionCard`, `SolutionComposer`, `LikeButton` | `components/Solutions.js` | Community UI |
| `Avatar` | `components/Avatar.js` | User avatar with initial fallback |
| `AvatarPicker` | `components/AvatarPicker.js` | Click-to-upload avatar |
| `SelectChip` | `components/SelectChip.js` | Multi-select pill toggle |
| `SessionNav` | `components/SessionNav.js` | Landing page auth navigation |
| `SessionContext` | `components/SessionScope.js` | Auth session context provider |
| `StatNumber` | `components/Stat.js` | Animated number display |
| `Toast` | `components/Toast.js` | Bottom-center notification |
| `Button` | `components/ui/button.jsx` | shadcn Button (available, unused) |

Socket rooms are joined via `lib/socket.js` (`useLiveRooms`); session gating lives in `middleware.js` (cookie presence) + the `(app)` shell layout.

---

## Design System

### Colors

| Token | Value | Use |
|-------|-------|-----|
| `canvas` | #090909 | Page background |
| `surface-1` | #141414 | Cards, buttons |
| `surface-2` | #1c1c1c | Elevated surfaces |
| `ink` | #ffffff | Primary text |
| `ink-muted` | #999999 | Secondary text |
| `accent-blue` | #4ba9e1 | Links, focus rings |
| `success` | #22c55e | Success states |
| `danger` | #f45d6f | Error states |
| `gradient-violet` | #6a4cf5 | Spotlight cards |
| `gradient-magenta` | #d44df0 | Spotlight cards |
| `gradient-orange` | #ff7a3d | Spotlight cards |
| `gradient-coral` | #ff5577 | Spotlight cards |

### Typography

| Token | Font | Size | Use |
|-------|------|------|-----|
| Display | Geist | 32px | Section headings |
| Body | Inter | 15px | Default text |
| Body Sm | Inter | 14px | Dense data |
| Caption | Inter | 13px | Meta info |
| Mono | Geist Mono | — | Code, metrics |

### Motion

The app implements a comprehensive animation system with CSS transitions for:
- Dropdown open/close
- Icon crossfade (Menu/X, Eye/EyeOff)
- Sliding pill tabs
- Panel entrance (translate + blur + opacity)
- Form error shake
- Onboarding page slide
- Staggered text reveal
- Animated checkmark
- Skeleton loading
- Number pop-in
- Toast slide-up

All animations respect `prefers-reduced-motion`.

---

## Environment Variables

### Backend (`.env.example`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment |
| `PORT` | No | 4000 | Server port |
| `MONGODB_URI` | Yes | mongodb://127.0.0.1:27017/Nox | MongoDB connection |
| `BETTER_AUTH_SECRET` | Yes | — | HMAC secret (32+ chars) |
| `BETTER_AUTH_URL` | No | http://localhost:4000 | Auth base URL |
| `FRONTEND_URL` | No | http://localhost:3000 | Frontend origin |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth |
| `RESEND_API_KEY` | Prod only | — | Outbound email (verification + reset) |
| `EMAIL_FROM` | No | Nox <noreply@nox.synax.me> | Sender identity (verify domain in Resend) |
| `APPWRITE_ENDPOINT` | No | — | Appwrite endpoint |
| `APPWRITE_PROJECT_ID` | No | — | Appwrite project |
| `APPWRITE_BUCKET_AVATARS` | No | avatars | Storage bucket |
| `APPWRITE_API_KEY` | No | — | Appwrite API key |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | http://localhost:4000 | Backend API URL |

---

## Scripts

| Script | Location | Description |
|--------|----------|-------------|
| `smoke.js` | `backend/scripts/` | Integration suite vs running API (auth incl. enforced verification, profile, catalog, admin, execution, judging, boards) |
| `grandfather-verified.js` | `backend/scripts/` | One-off: mark pre-enforcement accounts verified (run once per DB, then retire) |
| `seed-challenges.js` | `backend/scripts/` | Seed 59 published JS + Python challenges (upsert by slug) |
| `make-admin.js` | `backend/scripts/` | Grant role to user by email |
| `dev-all.js` | `backend/scripts/` | Run API + worker together (`bun run dev:all`) |

### Usage

```bash
# Run API + worker together (worker executes code)
cd backend && bun run dev:all

# Or separately
cd backend && bun run dev        # API :4000
cd backend && bun run worker     # execution worker

# Run smoke tests (needs API + worker up)
cd backend && bun run smoke

# Seed challenges
cd backend && bun scripts/seed-challenges.js --author user@example.com

# Make user admin
cd backend && bun scripts/make-admin.js user@example.com ADMIN
```

Worker env: `WORKER_ID`, `WORKER_CONCURRENCY` (default 2), `WORKER_POLL_MS`, `NOX_PYTHON`.
