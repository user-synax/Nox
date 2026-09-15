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
| shadcn/ui | base-nova | Component library |
| Monaco Editor | — | In-browser code editor |
| Lucide React | 1.46.0 | Icons |
| Geist / Geist Mono | — | Typography (code + display) |
| Inter | — | Body typography |
| tw-animate-css | 1.4.0 | Animation utilities |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | v18+ | Runtime |
| Express.js | 4.21.2 | HTTP framework |
| Better Auth | 1.3.x | Authentication (email/password, OAuth) |
| MongoDB | 6.12.0 | Database (native driver) |
| Zod | 3.23.8 | Schema validation |
| Helmet | 8.0.0 | Security headers |
| CORS | 2.8.5 | Cross-origin resource sharing |
| Multer | 2.4.0 | Multipart file uploads |
| node-appwrite | 29.0.0 | Avatar storage |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Redis | Queue system (planned) |
| BullMQ | Job queue (planned) |
| Appwrite | Avatar file storage |
| Socket.IO | Real-time events (planned) |
| Container sandboxing | Code execution (planned) |

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
| Email verification | Available | Token-based via email link |
| Forgot password | Available | Email-based reset link |
| Reset password | Available | Token-based password change |
| Google OAuth | Configured | Dormant — requires `GOOGLE_CLIENT_ID` env |
| Session management | Available | 7-day expiry, daily refresh |
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

### Challenge Types (Seeded)

| Challenge | Difficulty | Category | Description |
|-----------|-----------|----------|-------------|
| Off by One: Cart Total | Easy | Algorithms | Loop boundary bug |
| Falsy Trap: Compact IDs | Easy | General | JS falsy value trap |
| Floating Promises: Batch Usernames | Medium | Backend | Unawaited promises |
| Reference Trap: Dedupe Users | Medium | Backend | Object reference equality |
| Blind Spot: Binary Search Bounds | Hard | Algorithms | Off-by-one in binary search |

### Admin System (Backend)

| Feature | Status | Details |
|---------|--------|---------|
| Challenge CRUD | Available | Create, read, update, delete challenges |
| Publish/unpublish | Available | Toggle challenge visibility |
| Challenge preview | Available | Full challenge data including hidden tests |
| User role management | Available | `make-admin.js` script |
| RBAC enforcement | Available | USER < MODERATOR < ADMIN < FOUNDER |
| Hidden test management | Available | Via admin challenge write endpoints |

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
| Monaco code editor integration | Not started | High |
| Visible test runner | Not started | High |
| Hidden test execution | Not started | High |
| Isolated code execution (sandboxing) | Not started | High |
| Submission system | Not started | High |
| XP and rating calculation | Not started | High |
| Rank system (Bronze → Grandmaster) | Not started | High |
| Global leaderboard | Not started | High |
| Weekly leaderboard | Not started | High |
| Streak tracking | Not started | Medium |
| Daily challenge | Not started | Medium |
| Solution sharing | Not started | Medium |
| Likes, comments, bookmarks | Not started | Medium |
| In-app notifications | Not started | Medium |
| Admin dashboard (frontend) | Not started | High |
| Content moderation | Not started | Medium |

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
| `POST` | `/auth/verify-email` | Verify email with token |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password with token |

### User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/me` | Full profile (auth required) |
| `PATCH` | `/users/me` | Update profile |
| `POST` | `/users/me/avatar` | Upload avatar |
| `POST` | `/users/me/onboarding` | Complete onboarding |
| `GET` | `/users/:username` | Public profile |

### Challenge Endpoints (Public)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/challenges` | List challenges (paginated, filterable) |
| `GET` | `/challenges/:slug` | Challenge detail with starter files |

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

### Health Check

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{ ok: true, time: "..." }` |

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
| `level` | number | 1 |
| `currentStreak` | number | 0 |
| `longestStreak` | number | 0 |
| `lastActiveDate` | Date | null |
| `solvedCount` | number | 0 |
| `acceptedCount` | number | 0 |
| `attemptCount` | number | 0 |
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

---

## Frontend Pages

### Public Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, features, CTA |
| `/login` | Login | Email/password form |
| `/signup` | Signup | Registration form |
| `/forgot-password` | Forgot Password | Email input |
| `/reset-password` | Reset Password | New password form |
| `/verify-email` | Verify Email | Token verification |
| `/u/[username]` | Public Profile | User stats and info |

### Authenticated Pages

| Route | Page | Description |
|-------|------|-------------|
| `/onboarding` | Onboarding | 3-step new user wizard |
| `/dashboard` | Dashboard | Stats, checklist, activity |
| `/settings` | Settings | Profile editing |

### Planned Pages (Not Yet Built)

| Route | Page |
|-------|------|
| `/challenges` | Challenge catalog |
| `/challenges/[slug]` | Challenge solving (editor + tests) |
| `/leaderboard` | Global/weekly rankings |
| `/submissions` | Submission history |
| `/solutions/[id]` | Solution detail |
| `/notifications` | In-app notifications |
| `/admin` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/challenges` | Challenge management |
| `/admin/submissions` | Submission review |
| `/admin/reports` | Report management |

---

## Component Reference

| Component | File | Purpose |
|-----------|------|---------|
| `Sidebar` | `components/AppNav.js` | Desktop sidebar navigation |
| `MobileTop` | `components/AppNav.js` | Mobile sticky header |
| `TabBar` | `components/AppNav.js` | Mobile bottom tab bar |
| `Avatar` | `components/Avatar.js` | User avatar with initial fallback |
| `AvatarPicker` | `components/AvatarPicker.js` | Click-to-upload avatar |
| `SelectChip` | `components/SelectChip.js` | Multi-select pill toggle |
| `SessionNav` | `components/SessionNav.js` | Landing page auth navigation |
| `SessionContext` | `components/SessionScope.js` | Auth session context provider |
| `StatNumber` | `components/Stat.js` | Animated number display |
| `Toast` | `components/Toast.js` | Bottom-center notification |
| `Button` | `components/ui/button.jsx` | shadcn Button (available, unused) |

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
| `smoke.js` | `backend/scripts/` | Full integration test suite |
| `seed-challenges.js` | `backend/scripts/` | Seed 5 JS debugging challenges |
| `make-admin.js` | `backend/scripts/` | Grant role to user by email |

### Usage

```bash
# Run smoke tests
cd backend && bun run smoke

# Seed challenges
cd backend && bun scripts/seed-challenges.js --author user@example.com

# Make user admin
cd backend && bun scripts/make-admin.js user@example.com ADMIN
```
