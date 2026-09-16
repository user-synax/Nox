# Nox — Product Requirements Document

**Product:** Nox  
**Domain:** `Nox.synax.me`  
**Status:** MVP Planning  
**Document Version:** 1.1  
**Last Updated:** 2026-09-16  
**Owner:** Ayush / Synax

---

## 1. Product Summary

### 1.1 What is Nox?

Nox is a developer practice and competitive platform focused on **real-world debugging**.

Instead of asking developers to write a solution from scratch, Nox gives them intentionally broken code and asks them to understand the existing implementation, identify the root cause, fix it, and prove the fix with automated tests.

The core product loop is:

```text
Discover challenge
      ↓
Read broken code
      ↓
Understand the failure
      ↓
Edit code
      ↓
Run tests
      ↓
Iterate
      ↓
Submit
      ↓
Automatic evaluation
      ↓
Score + XP + rating
      ↓
Profile progress
      ↓
Share solution
```

### 1.2 Product thesis

> Developers spend significant time debugging existing systems, but most coding practice platforms primarily test greenfield problem solving.

Nox focuses on the skill of entering an existing codebase, understanding what is wrong, fixing it, and validating the result.

### 1.3 Product positioning

**Nox — Practice the skill developers use every day: debugging.**

Alternative positioning:

> Find the bug. Fix the code. Prove the fix.

---

# 2. Goals

## 2.1 MVP goals

1. Give developers a reliable environment for practicing debugging.
2. Support intentionally broken coding challenges with hidden tests.
3. Execute untrusted submissions inside isolated environments.
4. Provide immediate and understandable evaluation results.
5. Build a persistent developer profile around solved debugging challenges.
6. Introduce lightweight competitive progression through XP, rating, ranks, streaks, and leaderboards.
7. Let solved challenges become community knowledge through shared solutions.
8. Establish an architecture that can later support additional languages, multi-file projects, security challenges, and company assessments.

## 2.2 Non-goals for MVP

The MVP will **not** attempt to become:

- A general-purpose IDE.
- A collaborative coding platform.
- A generic competitive programming clone.
- A full social network.
- A recruitment/assessment SaaS.
- An AI coding assistant.
- A marketplace for paid challenges.

---

# 3. Target Users

## 3.1 Primary users

### Student / beginner developers

Need a practical way to learn debugging instead of only solving algorithmic exercises.

### Junior developers

Want realistic practice with bugs, failing tests, existing code, APIs, and implementation mistakes.

### Intermediate developers

Want harder debugging, performance, security, concurrency, and production-style scenarios.

## 3.2 Secondary users — future

- Engineering recruiters.
- Companies creating technical assessments.
- Bootcamps and coding schools.
- Challenge authors.
- Developer communities.

---

# 4. Core User Experience

## 4.1 New user flow

```text
Landing page
    ↓
Sign up / login
    ↓
Choose interests/languages
    ↓
Complete profile
    ↓
Browse challenges
    ↓
Open first challenge
```

## 4.2 Challenge solving flow

```text
Challenge page
    ↓
Read description
    ↓
Inspect starter code
    ↓
Open editor
    ↓
Run visible tests
    ↓
Receive result
    ↓
Modify code
    ↓
Run again
    ↓
Submit
    ↓
Run hidden tests
    ↓
Pass / fail
    ↓
Score calculation
    ↓
XP + rating + profile update
```

## 4.3 Post-solve flow

After a successful submission, the user can:

- View score.
- View test results.
- View execution metrics.
- View time taken.
- Earn XP.
- Gain/lose competitive rating according to the rating system.
- Earn achievements when applicable.
- View other accepted solutions if the challenge rules permit it.
- Share a solution with an explanation.
- Continue to the next challenge.

---

# 5. MVP Feature Scope

## 5.1 Authentication

### Required

- Email/password authentication.
- Google OAuth (code-complete; enabled by setting `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, no code change needed).
- Email verification (endpoints + `/verify-email` page exist; enforcement is currently OFF — signup signs straight in and verification/reset links are captured to a dev-only outbox until a real email provider is wired).
- Session management (7-day DB sessions, daily refresh, 5-minute signed cookie cache).
- Logout.
- Password reset (same dev-outbox note as verification).
- Basic account security controls (domain allowlist, per-IP rate limits, RBAC).

### Future

- GitHub OAuth.
- Passkeys.
- Two-factor authentication.
- Enterprise SSO.

---

# 6. User Profiles

Every user gets a public developer profile.

### Public profile fields

- Username.
- Display name.
- Avatar.
- Bio.
- Website.
- GitHub.
- Joined date.
- Rating.
- Rank.
- XP / level.
- Challenges solved.
- Success rate.
- Current streak.
- Longest streak.
- Hardest solved challenge.
- Favorite languages.
- Skill/category breakdown.
- Achievements.
- Badges.
- Recent solved challenges.
- Shared solutions.

### Example

```text
Ayush
Full Stack Developer

Rating      1647
Rank        Diamond III
XP          42,850
Solved      187
Streak      14 days

JavaScript  92%
Node.js     88%
Security    81%
Debugging   95%
```

### Profile URL

```text
Nox.synax.me/u/[username]
```

---

# 7. Challenge System

Challenges are the core content unit of Nox.

## 7.1 Challenge model

Every challenge should support:

- Title.
- Slug.
- Description.
- Problem statement.
- Language.
- Difficulty.
- Category.
- Tags.
- Starter files.
- Public test cases.
- Hidden test cases.
- Expected behavior.
- Constraints.
- Optional hints.
- Time limit.
- Memory limit.
- Challenge author.
- Published state.
- Created timestamp.
- Updated timestamp.
- Estimated solve time.

## 7.2 MVP challenge types

### Bug Fix

Find and fix one or more incorrect behaviors.

### Logic Error

The program executes but produces incorrect output.

### Runtime Error

The program crashes under specific conditions.

### API / Backend Bug

A service behaves incorrectly under defined inputs.

For MVP, these can share the same execution model even if the UI labels differ.

## 7.3 MVP categories

- General Debugging.
- Algorithms / Logic.
- Frontend.
- Backend.
- Security.
- Database.
- Performance.

The challenge catalog should launch with a smaller curated subset rather than attempting to populate every category immediately.

## 7.4 Difficulty

MVP levels:

- Easy.
- Medium.
- Hard.
- Expert.

Difficulty is initially manually assigned by challenge authors/admins.

Future versions can dynamically calibrate difficulty from user performance.

---

# 8. Programming Languages

## 8.1 MVP

- JavaScript (executable).
- Python (executable).
- TypeScript (present in language metadata, **not** executable yet — submissions return 422).

## 8.2 Language architecture requirement

Language execution must be modular.

Adding a new language should primarily require:

1. Runtime image / execution environment.
2. Compiler/interpreter command configuration.
3. Resource limits.
4. Language metadata.
5. Test harness configuration.

Core API, database, submissions, and frontend should not require major rewrites.

## 8.3 Future languages

Potential roadmap:

- C++.
- Java.
- Go.
- Rust.
- C#.
- PHP.
- Kotlin.
- Swift.

---

# 9. Code Editor

## MVP

Use **Monaco Editor**.

### Required capabilities

- Syntax highlighting.
- Multiple tabs/files if the challenge contains more than one file.
- Search.
- Line numbers.
- Auto indentation.
- Basic autocomplete.
- Keyboard shortcuts.
- Dark theme.
- Reset to starter code.
- Save local draft.

### UX layout

```text
┌───────────────────────────────────────────────────────────────┐
│ Challenge title                  Difficulty        Timer      │
├───────────────┬──────────────────────────────┬───────────────┤
│ Files         │ Code Editor                  │ Tests         │
│               │                              │               │
│ index.js      │                              │ ✓ 3/5         │
│ utils.js      │                              │ ✗ 2/5         │
│ tests/        │                              │               │
│               │                              │ [Run Tests]   │
├───────────────┴──────────────────────────────┴───────────────┤
│ Output / Execution / Submission result                       │
└───────────────────────────────────────────────────────────────┘
```

---

# 10. Code Execution and Sandboxing

This is the most security-sensitive part of Nox.

## 10.1 Requirement

**Never execute arbitrary user code directly inside the Next.js app, API process, or database environment.**

## 10.2 Target execution architecture

```text
                         ┌─────────────────┐
                         │     Next.js     │
                         └────────┬────────┘
                                  │
                               HTTPS
                                  │
                          ┌────────▼────────┐
                          │      API        │
                          └────────┬────────┘
                                   │
                     MongoDB-backed queue (`runs`
                     collection — no Redis/BullMQ;
                     atomic claim, leases, sweep)
                                   │
                          ┌────────▼────────┐
                          │ Worker pool     │
                          │ (separate procs,│
                          │ never the API)  │
                          └────────┬────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                ▼                  ▼                  ▼
         ┌────────────┐     ┌────────────┐     ┌────────────┐
         │ JS runner  │     │ Py runner  │     │ (future)   │
         │ temp dir   │     │ temp dir   │     │ containers │
         └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
               └──────────────────┼──────────────────┘
                                  ▼
                          Test result / metrics
                                  │
                                  ▼
                               MongoDB
```

## 10.3 MVP sandbox controls

Current state (2026-09-16): workers run in throwaway temp directories in a
separate process with timeouts, output caps, stripped env, and no app
secrets. Full container isolation below is the hardening milestone
(Roadmap §11), not current behavior.

Target execution environments must enforce, as applicable:

- CPU limit.
- Memory limit.
- Wall-clock timeout.
- Process count limit.
- Filesystem isolation.
- Temporary filesystem.
- Network disabled by default.
- No host filesystem access.
- No host Docker socket access.
- No secrets from the application environment.
- Non-root execution where possible.
- Maximum output size.
- Maximum submission size.
- Queue-level concurrency limits.

## 10.4 Execution lifecycle

```text
CREATED
   ↓
QUEUED
   ↓
RUNNING
   ↓
PASSED / FAILED / TIMEOUT / RUNTIME_ERROR / SYSTEM_ERROR
```

The execution service must be idempotent enough that retrying a failed infrastructure job does not create duplicate submission state.

---

# 11. Testing Model

Each challenge contains:

### Visible tests

Shown to the user while debugging.

Purpose:

- Faster iteration.
- Understand expected behavior.
- Learn the interface.

### Hidden tests

Not shown before successful submission.

Purpose:

- Prevent hardcoding visible examples.
- Validate edge cases.
- Maintain challenge integrity.

### Submission result

Example:

```text
Accepted

Tests          18 / 18
Execution      42 ms
Memory         18 MB
Time           08:42
Score          94

+125 XP
+21 Rating
```

---

# 12. Submission System

A submission is immutable once created.

## Submission data

- User ID.
- Challenge ID.
- Language.
- Source snapshot.
- Challenge version.
- Status.
- Tests passed.
- Tests failed.
- Execution time.
- Memory usage.
- Score.
- Created timestamp.
- Evaluation metadata.

The platform must retain enough information to reproduce or inspect a result later without relying on mutable challenge data.

---

# 13. Scoring System

MVP scoring should remain understandable.

### Suggested score model

```text
Base correctness: 70 points
Efficiency:       15 points
Completion speed: 10 points
Code quality:      5 points
------------------------------
Maximum:          100 points
```

However, hidden tests are the source of truth for acceptance. A user should not receive a "successful" submission merely because the score is high.

### Important MVP rule

**Correctness comes first.**

A submission that does not satisfy all required hidden tests is not an accepted solution.

### Implemented values (`backend/workers/scoring.js`)

First-accept XP: easy 50 / medium 100 / hard 200 / expert 350; repeat solves 10 XP. Elo `K = 32` against difficulty anchors (easy 800 / medium 1200 / hard 1600 / expert 2000); rejected submits cost 2 rating. Level = `1 + floor(xp / 250)`. Stored hidden-test results keep `{ name, passed, error? }` only, so reading your own submission cannot leak hidden data.

---

# 14. Competitive Rating

Nox separates **rating** from **XP**.

## Rating

Represents competitive debugging performance.

Suggested starting rating:

```text
1000
```

Rating changes based primarily on:

- Challenge difficulty.
- Successful/failed submission.
- Relative performance.
- User's current rating.

Exact algorithm can begin as a simplified Elo-like system and evolve later.

## XP

Represents activity/progression.

XP may come from:

- Solving challenges.
- Daily challenge completion.
- Achievements.
- Community contributions.
- Educational milestones.

XP should not directly determine competitive skill rating.

---

# 15. Ranks

Initial rank system:

```text
Bronze
Silver
Gold
Platinum
Diamond
Master
Grandmaster
```

Rank thresholds are defined in the backend (`workers/scoring.js`: Grandmaster 2200 / Master 2000 / Diamond 1800 / Platinum 1600 / Gold 1400 / Silver 1200 / Bronze below) and exposed via `GET /leaderboard/ranks`; the frontend mirrors them and must never be the source of truth.

---

# 16. Leaderboards

## MVP

### Global leaderboard

Rank users by competitive rating. Implemented (`GET /leaderboard/global` + frontend page).

### Weekly leaderboard

Rank by rating progression over the last 7 days (sourced from `ratingEvents`). Implemented (`GET /leaderboard/weekly`, optional `?language=` / `?category=` filters).

### Additional implemented boards

- Level board (total XP): `GET /leaderboard/level`.
- Per-language XP race: `GET /leaderboard/language?language=`.
- Per-category XP race: `GET /leaderboard/category?category=`.
- Own position on any board: `GET /leaderboard/me?type=&language=&category=`.
- Rank/XP tuning for clients: `GET /leaderboard/ranks`.

Per-track XP is credited by the judge on each accepted solve (`xpByLanguage` / `xpByCategory` on `profileStats`), so no extra collections are needed.

---

# 17. Streaks

MVP includes a simple activity streak.

A streak is maintained when a user successfully completes at least one challenge during the applicable day.

Track:

- Current streak.
- Longest streak.
- Last active date (stored as UTC `YYYY-MM-DD` string).

Implemented in the submit judge: an accepted solve on a new UTC day extends the streak (same-day solves leave it untouched). Do not make streaks the primary product value.

---

# 18. Daily Challenge

A single highlighted challenge is presented each day. Implemented (2026-09-16).

### Requirements

- One canonical challenge per day.
- Globally consistent challenge for all users.
- Day boundary is UTC (`YYYY-MM-DD`), matching streak accounting.
- Selection is deterministic auto-rotation over published challenges ordered by slug (`day-index mod count`) — no admin step, no new collection. Served by `GET /daily-challenge[?date=]`, mounted at both `/` and `/api`.
- Past days resolve with the same function and link to normal challenge pages, so they stay solvable.
- Daily challenge results contribute to normal progression (no bonus XP/rating; solves go through the standard submit flow).
- Surfaced on the dashboard widget; hidden tests are stripped exactly like the challenge detail route.

Future versions may add admin overrides, archives, or separate daily challenge variants by language or skill level.

---

# 19. Community / Solution Sharing

Users who have successfully solved a challenge can publish a solution post.

## Solution post

Contains:

- Title.
- Challenge reference.
- Explanation.
- Solution code.
- Language.
- Tags.
- Author.
- Created date.
- Likes.
- Comments.
- Bookmarks.

### Visibility rule

Solutions for a challenge should remain hidden from users who have not yet completed the challenge successfully, unless the platform explicitly marks the challenge as discussion mode.

This protects challenge integrity.

## MVP community interactions

- Like (solutions and comments). Implemented.
- Comment (single thread per solution). Implemented.
- Bookmark. Not built.
- Report. Not built.

Solution visibility rule is enforced server-side (403 until the viewer has an accepted submission). Realtime fan-out covers solution/comment create/update/delete/like events.

Not included in MVP:

- Direct messaging.
- Groups.
- Following feed.
- Private communities.

---

# 20. Search and Discovery

Users should be able to find challenges by:

- Keyword.
- Difficulty.
- Language.
- Category.
- Tags.
- Solved/unsolved.
- Newest.
- Popular/trending.

### Challenge discovery tabs

```text
Recommended
All
Newest
Trending
```

(Implemented tabs on `/challenges`. There is no separate Daily tab — the daily challenge lives on the dashboard widget.)

Recommendation logic may start simple:

- User interests.
- Previously solved categories.
- Preferred languages.
- Difficulty proximity.

A full recommendation engine is not required for MVP.

---

# 21. Notifications

## MVP

In-app notifications for:

- Solution comment.
- Solution like milestone where applicable.
- Achievement unlocked.
- Rating/rank milestone.
- Challenge publication from followed/selected interests if later enabled.

Notifications should have read/unread state.

### Realtime requirement

Socket.IO is live and used for community fan-out (solution/comment events on `challenge:<id>` and `solution:<id>` rooms) with best-effort session attach; sockets only ever receive, all writes go through REST.

There is no notification center yet, so there is nothing to persist or deliver. Submission/run progress is REST polling (`GET /runs/:id`, `GET /submissions/:id`), not sockets.

---

# 22. Admin System

Nox requires an admin surface from the beginning because challenge quality and execution safety cannot depend entirely on user-generated content.

## MVP admin features

Implemented today (API only, ADMIN+; there is no admin UI — admins work via API/scripts, plus a `make-admin.js` script for role grants):

- Challenge CRUD.
- Publish/unpublish challenge.
- Challenge preview (full docs including hidden tests, admin routes only).
- Hidden test management (via the challenge write endpoints; content edits auto-bump `version`).

Not built yet:

- User search / details / suspend / ban.
- Submission inspection.
- Solution / comment moderation.
- Report management (no report endpoints exist).
- Execution queue visibility beyond `GET /api/health` counters (queued/running + workers online).
- Audit log.

## Roles

At minimum:

```text
USER
MODERATOR
ADMIN
FOUNDER
```

RBAC must be enforced on the API, not only in the frontend.

---

# 23. Moderation

> Status (2026-09-16): not implemented. No report, hide, remove, warn, suspend, or ban endpoints exist, and no audit log is written. The only integrity gates in place are solved-only solution visibility and author/admin ownership checks on edit/delete.

## User-generated content requiring moderation

- Solution posts.
- Comments.
- Challenge submissions if community authorship is introduced later.
- Profile text.

## MVP moderation actions

- Report.
- Hide.
- Remove.
- Warn.
- Suspend.
- Ban.

All administrative moderation actions should generate an audit log entry.

---

# 24. Anti-Cheat Strategy

MVP should prioritize mechanisms that materially protect challenge integrity without trying to detect every possible cheating method.

### MVP

- Hidden tests.
- Submission rate limiting.
- Execution quotas.
- Challenge version locking.
- Basic suspicious-submission signals.
- Source similarity analysis where practical.

### Not required for initial release

- Full browser surveillance.
- Webcam monitoring.
- Aggressive tab-switch enforcement.
- DevTools blocking.

Nox should avoid creating a hostile assessment experience before it becomes an assessment product.

---

# 25. Realtime Architecture

Solo solving does not eliminate realtime requirements.

## MVP realtime use cases

- Submission state. (Current: REST polling.)
- Test execution state. (Current: REST polling.)
- Solution/comment create, update, delete, and like events. (Live via Socket.IO rooms.)
- Notification delivery. (Deferred — no notification center.)
- Leaderboard updates where useful. (Deferred — boards are fetched via REST.)
- Challenge counters / aggregate activity if later enabled.

## Proposed stack

- Socket.IO.
- Redis adapter if horizontal scaling becomes necessary.
- MongoDB for persistent notification and submission state.

### Example event lifecycle

```text
client → POST /submissions
              ↓
          queue job
              ↓
       submission:queued
              ↓
       submission:running
              ↓
       submission:completed
```

---

# 26. Recommended Technology Stack

## Frontend

- Next.js 16 (App Router).
- JavaScript.
- Tailwind CSS v4.
- shadcn/ui (one Button component vendored; the UI is otherwise bespoke).
- Monaco Editor (`@monaco-editor/react`, `Nox-dark` theme).
- socket.io-client (community fan-out).
- Framer Motion: not used — motion is hand-rolled CSS transitions.

## Backend

- Node.js.
- Express.js.
- JavaScript.
- Socket.IO.

## Database

- MongoDB.
- Mongoose or equivalent MongoDB ODM/data-access layer.

## Queue / execution infrastructure

- MongoDB-backed queue (`runs` collection: atomic claim, leases, startup sweep) — replaces Redis/BullMQ; no extra infrastructure to install.
- Separate worker processes (`bun workers/runner.js`, configurable concurrency/poll interval, heartbeats).
- Throwaway temp-dir execution for JavaScript (`node`) and Python runners. Container-based sandboxing is deferred to hardening (Roadmap §11).

## Authentication

Recommended: Better Auth or another mature session/auth library that supports email/password + OAuth and secure session handling.

## Search

Start with MongoDB indexes / Atlas Search if available. Introduce a dedicated search engine only if actual scale requires it.

## Deployment

Application deployment may use Vercel for the frontend and a separate backend/worker-capable environment for API, Redis, and code execution.

**Do not place code execution workers inside a serverless frontend runtime.**

---

# 27. Repository Architecture

Recommended monorepo:

```text
Nox/
├── apps/
│   ├── web/
│   └── api/
│
├── workers/
│   ├── executor/
│   └── judge/
│
├── packages/
│   ├── db/
│   ├── types/
│   ├── config/
│   ├── validation/
│   └── ui/
│
├── challenges/
│   ├── javascript/
│   ├── JavaScript/
│   └── python/
│
├── docs/
│
├── package.json
└── README.md
```

The exact monorepo tooling can be selected during implementation.

---

# 28. Core Data Model

The following are the initial primary collections/entities.

## User

```text
_id
email
username
displayName
avatarUrl
bio
website
githubUrl
roles[]
emailVerified
createdAt
updatedAt
```

## ProfileStats

```text
userId
rating                 # starts at 1000
xp
level                  # 1 + floor(xp / 250)
xpByLanguage{}         # per-track XP powering language leaderboards
xpByCategory{}         # per-track XP powering category leaderboards
solvesByLanguage{}
solvesByCategory{}
currentStreak
longestStreak
lastActiveDate         # UTC YYYY-MM-DD string
solvedCount            # distinct challenges accepted
acceptedCount
attemptCount
submissionCount
successRate
hardestSolvedChallengeId
preferredLanguages[]
skills{}
createdAt
updatedAt
```

## Challenge

```text
_id
slug
title
description
kind                   # bug-fix | logic-error | runtime-error | api-bug
language               # javascript | typescript | Python
category
tags[]
difficulty
starterFiles[]         # [{ path, content }]
visibleTests[]         # [{ name, description?, input, expected }]
hiddenTests[]          # same shape; never leaves the server except admin routes
entryFile
entryFunction
testContext{}          # judge-injected trailing args, admin-authored
constraints
hints[]
timeLimitMs
memoryLimitMb
estimatedSolveMinutes
authorId
status                 # draft | published
version                # auto-bumps on content edits
solveCount
attemptCount
createdAt
updatedAt
```

## Submission

```text
_id
userId
challengeId
challengeSlug
challengeTitle
challengeVersion       # locks the judged version
difficulty
language
category
files[]                # immutable source snapshot [{ path, content }]
status                 # pending → accepted | rejected | timeout | runtime-error | system-error
testsPassed
testsTotal             # hidden suite size
results[]              # [{ name, passed, error? }] — no hidden input/expected/actual
score
scoreBreakdown{}       # { correctness, efficiency, speed, quality }
xpAwarded
ratingDelta
executionTimeMs
error
createdAt
completedAt
```

## Run (visible-test execution)

```text
_id
kind                   # run | submit
userId
challengeId (+ slug/title/version/difficulty/language/category snapshot)
entryFile / entryFunction / testContext / tests (visible suite for runs)
files[]                # merged user code over starters
status                 # queued → running → passed | failed | timeout | runtime-error | system-error
testsPassed / testsTotal / results[] (full input/expected/actual — visible tests only)
executionTimeMs / error / output
attempts (retry budget for system-error)
workerId / leaseUntil / startedAt / completedAt
createdAt
```

## RatingEvent (leaderboard + activity feed source)

```text
_id
userId
challengeId / challengeSlug / challengeTitle / difficulty
language / category
accepted
score
ratingDelta
xpAwarded
createdAt
```

## SolutionPost / Comment / Like (no bookmarks, reports, or notifications yet)

```text
Solution: _id, authorId, challengeId, title, body, code, language,
          tags[], likeCount, commentCount, status, createdAt, updatedAt
Comment:  _id, solutionId, authorId, body, likeCount, createdAt, updatedAt
Like:     { targetType, targetId, userId } (unique) — solutions + comments share it
```

## SolutionPost

```text
_id
authorId
challengeId
title
body
code
language
tags[]
likeCount
commentCount
bookmarkCount
status
createdAt
updatedAt
```

## Comment

```text
_id
postId
authorId
body
status
createdAt
updatedAt
```

## Achievement

```text
_id
key
name
description
icon
requirements
```

## UserAchievement

```text
_id
userId
achievementId
unlockedAt
```

## Notification

```text
_id
userId
type
actorId
entityType
entityId
readAt
createdAt
```

## Report

```text
_id
reporterId
entityType
entityId
reason
description
status
reviewedBy
reviewedAt
createdAt
```

## AuditLog

```text
_id
actorId
action
entityType
entityId
metadata
createdAt
```

---

# 29. API Surface — MVP

The exact endpoint naming can evolve, but the API should cover these capabilities.

## Auth

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/verify-email
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me
```

## Users

```text
GET    /users/:username
Nox  /users/me
GET    /users/me/stats
```

All routes below are mounted at both `/` and `/api`. Run/submit return `202` with an id; clients poll for the verdict.

## Challenges

```text
GET    /challenges                 # published only, filterable + paginated
GET    /challenges/:slug           # detail; solved users also get their accepted snapshot
```

## Daily challenge

```text
GET    /daily-challenge[?date=YYYY-MM-DD]   # UTC auto-rotation (PRD §18)
```

## Runs (visible tests)

```text
POST   /challenges/:id/run        # 202 { runId }
GET    /runs/:id                   # owner/admin only
```

## Submissions (hidden judging)

```text
POST   /challenges/:id/submit     # 202 { submissionId }; locked once solved
GET    /submissions/:id            # owner/admin only
GET    /users/me/submissions       # own history, newest first
```

## Users

```text
GET    /users/:username            # public profile
GET    /users/me                   # session user + stats + onboarding flag
Nox  /users/me                   # profile fields, languages, interests
POST   /users/me/avatar            # JPEG/PNG/WebP ≤ 2MB (needs full Appwrite config)
POST   /users/me/onboarding        # final onboarding save
GET    /users/me/solutions         # own write-ups
GET    /users/:username/solutions  # author write-ups (solved-only filtered)
```

## Solutions

```text
POST   /challenges/:id/solutions  # gated on accepted submission
GET    /challenges/:id/solutions  # 403 until viewer has solved (sort newest|top)
GET    /solutions/recent           # community feed (challenges you solved)
GET    /solutions/:id
Nox  /solutions/:id
DELETE /solutions/:id
POST   /solutions/:id/like        # toggle → { liked, likeCount }
```

(Bookmarks and reports are not built.)

## Comments

```text
GET    /solutions/:id/comments    # oldest first
POST   /solutions/:id/comments
Nox  /comments/:id
DELETE /comments/:id
POST   /comments/:id/like         # toggle
```

## Leaderboards

```text
GET /leaderboard/global            # rating ladder
GET /leaderboard/level             # XP race
GET /leaderboard/weekly[?language=][?category=]   # 7-day rating progression
GET /leaderboard/language?language=               # per-language XP race
GET /leaderboard/category?category=               # per-category XP race
GET /leaderboard/me?type=[global|level|weekly|language|category]
GET /leaderboard/ranks             # rank ladder + XP tuning (client mirror source)
```

## Notifications

Not built — no endpoints, no notification center.

## Admin (ADMIN+, API only — no admin UI)

```text
GET    /admin/challenges
POST   /admin/challenges
Nox  /admin/challenges/:id       # partial update; content edits bump version
POST   /admin/challenges/:id/publish
POST   /admin/challenges/:id/unpublish
DELETE /admin/challenges/:id
```

(No user, submission, or report admin endpoints yet.)

## Ops

```text
GET    /api/health                 # { ok, time, queue: { queued, running }, workersOnline }
GET    /auth/dev/outbox?email=     # dev-only: last verification/reset links (never in prod)
```

---

# 30. WebSocket Events — MVP

Suggested event namespace:

```text
solution:new
solution:updated
solution:deleted
solution:like
comment:new
comment:updated
comment:deleted
comment:like
```

(Planned but not emitted: `submission:queued/running/completed/failed`, `notification:new`, `leaderboard:updated` — clients poll the corresponding REST endpoints instead.)

The client must not treat realtime messages as the source of truth for durable state. On reconnect, the client should fetch authoritative state from the API.

---

# 31. Frontend Pages

## Public

```text
/
/challenges                        # catalog (also the authed shell)
/challenges/[slug]                 # overview + solutions tab
/challenges/[slug]/solve           # Monaco workspace (signed in to run/submit)
/leaderboard                       # global / level / weekly / language / category
/community                         # solution feed (signed in)
/solutions/[id]                    # solution thread + comments
/u/[username]                      # public profile
/login
/signup
/forgot-password
/reset-password
/verify-email
/privacy, /terms, /cookies
```

## Authenticated

```text
/dashboard                         # stats, checklist, daily widget, activity, rank rail
/onboarding                        # 3-step wizard
/settings                          # profile editor
```

There are no `/submissions`, `/notifications`, `/profile`, or `/admin` pages. Auth is enforced by middleware plus an authed app-shell gate.

## Admin

API only (see §29). No admin pages exist.

---

# 32. Landing Page

Built: hero ("Debug code. Build skill. Prove it."), interactive broken/fixed demo, how-it-works steps, example challenge, scoring breakdown, progression, profiles, community, FAQ — in the dark-canvas system.

The landing page should immediately explain the difference from traditional coding platforms.

### Hero

> **Debug code. Build skill. Prove it.**

Supporting text:

> Practice real-world debugging by fixing intentionally broken code, passing hidden tests, and building a developer profile that shows what you can actually debug.

Primary CTA:

> Start Noxing

Secondary CTA:

> Explore Challenges

### Supporting sections

1. How Nox works.
2. Example broken-code challenge.
3. Competitive progression.
4. Developer profiles.
5. Community solutions.
6. Supported languages.
7. CTA.

---

# 33. Design System

## Design direction

**Dark-first, technical, minimal, competitive without looking like an esports dashboard.**

The interface should feel like a serious developer tool with subtle game mechanics.

## Recommended colors

```text
Background:        #080B0F
Surface:           #11161C
Surface Elevated:  #171D24
Primary:           #4BA9E1
Primary Hover:     #3D99D0
Text Primary:      #F5F7FA
Text Secondary:    #98A2B3
Border:            #222A33
Success:           #36D399
Warning:           #F5C451
Danger:            #F45D6F
```

The primary blue is intentionally similar to the Synax/CampusZen visual language but Nox should remain independently recognizable.

## Typography

Recommended:

- Geist Sans for interface text.
- Geist Mono for code, metrics, and technical UI.

## UI characteristics

- Dense enough for developers.
- Strong hierarchy.
- Subtle borders.
- Minimal gradients.
- Small motion feedback.
- Avoid excessive glassmorphism.
- Avoid excessive neon/cyberpunk aesthetics.
- Code and test results should remain the visual focus.

---

# 34. Accessibility

MVP requirements:

- Keyboard navigable primary flows.
- Visible focus states.
- Sufficient text contrast.
- Accessible form labels.
- Accessible dialogs.
- Screen-reader labels for icon-only controls.
- Reduced-motion support.
- Errors must be communicated through text, not color alone.

---

# 35. Security Requirements

Security is a core product requirement because Nox intentionally executes untrusted source code.

## Application security

- Secure HTTP-only sessions/cookies.
- CSRF protection where applicable.
- Input validation.
- Output encoding.
- Rate limiting.
- Brute-force protection.
- RBAC.
- Secure headers.
- Audit logs for privileged actions.
- Secrets stored outside source control.
- Principle of least privilege.

## Execution security

- Isolated runtime.
- No direct host access.
- No arbitrary outbound network access by default.
- CPU quotas.
- Memory quotas.
- Timeouts.
- Process limits.
- Output size limits.
- Temporary filesystem.
- Worker identity with minimal permissions.

## Challenge integrity

- Hidden tests.
- Immutable challenge version for submissions.
- Signed or integrity-checked execution packages if required.
- No hidden test data in client bundles.

---

# 36. Observability

MVP should provide enough visibility to operate execution infrastructure safely.

Track:

- API request errors.
- Authentication failures.
- Queue depth.
- Job duration.
- Worker failures.
- Sandbox failures.
- Submission failure rate.
- Test execution latency.
- Database latency.
- WebSocket connection failures.

Each submission should receive a traceable internal execution ID.

---

# 37. Rate Limits and Quotas

Protect the platform from abuse and runaway compute costs.

Examples:

```text
Run tests:     configurable per minute
Submissions:   configurable per minute
Comments:      configurable per minute
Solution posts: configurable per hour
Auth attempts: strict rate limit
```

Limits must be configurable by role/tier and stored centrally rather than hardcoded across routes.

---

# 38. Analytics

Track product behavior without collecting unnecessary personal information.

### MVP metrics

- Signups.
- Activated users.
- First challenge started.
- First challenge solved.
- Daily active users.
- Weekly active users.
- Challenge attempts.
- Challenge acceptance rate.
- Average solve time.
- Daily challenge participation.
- Day-1 / Day-7 retention.
- Solution posts.
- Comments.

### Challenge quality metrics

- Start → completion rate.
- Average attempts.
- Failure rate.
- Median solve time.
- Language distribution.
- Difficulty calibration signal.

---

# 39. Performance Requirements

Initial targets:

### Web application

- Fast initial page load.
- Challenge pages should remain usable on moderate hardware.
- Monaco should lazy-load where appropriate.

### API

Target p95 latency for ordinary read endpoints:

```text
< 300 ms
```

excluding execution requests.

### Code execution

A normal challenge should begin execution quickly enough that users perceive the platform as interactive.

The API should acknowledge a queued execution immediately and stream status rather than blocking the request until completion.

---

# 40. Failure Handling

The product should distinguish:

### User error

Example:

```text
Tests failed.
```

### Code/runtime error

Example:

```text
Runtime error: TypeError...
```

### Resource limit

Example:

```text
Execution exceeded the 2.0 second limit.
```

### Infrastructure failure

Example:

```text
We couldn't run this submission right now. No rating penalty was applied.
```

Infrastructure failures must never unfairly punish users.

---

# 41. MVP Acceptance Criteria

Status as of 2026-09-16 (`[x]` done, `[~]` partial, `[ ]` open). Nox MVP is considered complete when a new user can:

1. [x] Create an account.
2. [~] Verify the account. (Endpoints + page exist; enforcement OFF until a real email provider is wired.)
3. [x] Create a public profile.
4. [x] Browse and filter challenges.
5. [x] Open a challenge.
6. [x] Read the problem and expected behavior.
7. [x] Edit code in the browser (Monaco, multi-file tabs, drafts, reset).
8. [x] Run visible tests.
9. [x] Receive execution output.
10. [x] Submit code.
11. [x] Have the submission evaluated against hidden tests.
12. [x] Receive a final result and score.
13. [x] Gain XP and rating on success.
14. [~] See challenge history. (API + dashboard activity; no dedicated `/submissions` page.)
15. [x] See progress on the public profile.
16. [x] Appear on a leaderboard.
17. [x] Publish a solution after successful completion.
18. [x] Comment on another solution.
19. [ ] Receive an in-app notification.
20. [~] Have admins manage challenges and moderate content. (Challenge admin via API only; no moderation endpoints or admin UI.)

---

# 42. MVP Release Scope

## Build for V1

Built (2026-09-16):

- Authentication (verification enforcement deferred to email delivery).
- Public profiles.
- Challenge catalog.
- JavaScript support.
- Python support (the duplicated "JavaScript support" line above meant TypeScript — still pending).
- Monaco editor.
- Visible tests.
- Hidden tests.
- Isolated execution (separate worker processes + temp dirs; containers deferred).
- Submission queue (MongoDB-backed; Redis/BullMQ dropped).
- Automatic judging.
- XP.
- Rating.
- Ranks.
- Global leaderboard.
- Weekly leaderboard (plus level / language / category boards).
- Streaks.
- Daily challenge (UTC auto-rotation, dashboard widget).
- Solution sharing.
- Likes.
- Comments.
- Rate limits.
- Security/observability baseline (`/api/health`, worker heartbeats).

Explicitly still deferred:

- TypeScript execution.
- Bookmarks.
- Reports.
- In-app notifications.
- Admin dashboard.
- Basic moderation.
- Audit logs.

## Explicitly defer

- Realtime collaboration.
- Spectator mode.
- Session replay.
- User-created challenges.
- Company assessments.
- AI debugger.
- AI challenge generation.
- Advanced recommendation engine.
- Full recruiter platform.
- Native mobile applications.

---

# 43. Roadmap

## Phase 1 — MVP

Core debugging practice platform.

```text
Auth
Profiles
Challenges
Execution
Testing
Judging
Rating
XP
Leaderboards
Solutions
Moderation
```

## Phase 2 — Better Debugging

### Multi-file real-world projects

Challenges become small repositories instead of isolated files.

Examples:

- Broken Express API.
- Broken React application.
- Broken CLI tool.
- Broken database service.

### Better challenge diagnostics

- Stack traces.
- Logs.
- Environment variables.
- Request traces.
- Database fixtures.

### Advanced scoring

- Root-cause quality.
- Efficiency.
- Nox size.
- Regression protection.

---

## Phase 3 — Competitive Nox

- Seasons.
- Divisions.
- Promotion/relegation.
- Time-limited challenges.
- Challenge races.
- Regional/global rankings.
- Team competitions.
- Tournament brackets.
- Spectator mode.

---

## Phase 4 — Community Challenge Platform

Allow trusted users to create challenges.

### Challenge author tools

- Starter repository upload.
- Test builder.
- Hidden test management.
- Difficulty proposal.
- Preview mode.
- Version control.
- Publishing workflow.

### Moderation

Community challenges require review before publication.

---

## Phase 5 — Security & Production Debugging

Expand Nox beyond generic debugging.

### Security challenges

- Authentication bypasses.
- Authorization bugs.
- Injection flaws.
- SSRF-style scenarios.
- Insecure deserialization.
- Cryptographic misuse.
- Secrets exposure.

### Production incidents

Users investigate realistic incident simulations:

```text
500 errors increased 38%
     ↓
Inspect logs
     ↓
Find failing dependency
     ↓
Trace request path
     ↓
Fix bug
     ↓
Validate recovery
```

This can become a major differentiator.

---

## Phase 6 — AI-assisted learning

AI should complement debugging rather than replace it.

Potential features:

- Progressive hints.
- Root-cause explanation after solve.
- Personalized learning recommendations.
- Post-solve code review.
- Explain why the accepted solution works.

AI must be designed carefully so users cannot simply ask an agent to solve the challenge before earning the result.

---

## Phase 7 — Developer Portfolio

Turn Nox profiles into stronger professional artifacts.

Potential features:

- Shareable skill card.
- Verified skill badges.
- Challenge certificates.
- GitHub integration.
- Resume export.
- Public skill graph.
- Portfolio embeds.

Potential profile concept:

```text
Nox Profile

Debugging        95
Backend          88
Security         82
Performance      74

Verified by 214 completed challenges
```

---

## Phase 8 — Company Assessments

A future B2B product layer.

Companies could:

- Create assessment sets.
- Invite candidates.
- Set time windows.
- Create private challenges.
- Review submissions.
- Compare candidates.
- Generate skill reports.

This transforms Nox from a practice platform into a developer evaluation product.

---

# 44. Future Feature Backlog

These are intentionally excluded from MVP but may become valuable later.

### Developer experience

- GitHub repository import.
- VS Code extension.
- CLI.
- Local challenge runner.
- Git integration.
- Offline practice.

### Social

- Following.
- Personalized feed.
- Developer groups.
- Direct messages.
- Teams.
- Community events.

### Competitive

- Head-to-head mode.
- Tournaments.
- Team leagues.
- Seasonal rewards.
- Spectator mode.

### Debugging depth

- Multi-file projects.
- Logs.
- Network traces.
- Database inspection.
- Environment configuration.
- Dependency failures.
- Concurrency bugs.
- Distributed-system incidents.

### Learning

- Learning paths.
- Personalized curriculum.
- Skill graphs.
- Guided debugging lessons.
- Hint systems.

### Monetization

- Premium challenge packs.
- Advanced analytics.
- Company assessments.
- Sponsored challenges.
- Education licensing.

---

# 45. Open Product Decisions

These items can be changed without rewriting the overall PRD.

| Decision | Current Default |
|---|---|
| Product name | Nox |
| Domain | Nox.synax.me |
| Product model | Developer practice + competition |
| Primary interaction | Solo debugging |
| MVP languages | JS + Python executable; TS metadata-only (422) |
| Frontend | Next.js 16 + JavaScript |
| UI | Tailwind v4 + bespoke components (one shadcn Button vendored) |
| Editor | Monaco (`@monaco-editor/react`) |
| Backend | Node.js + Express (Bun runtime) |
| Database | MongoDB (native driver) |
| Realtime | Socket.IO (community events; submissions poll REST) |
| Queue | MongoDB-backed `runs` queue (Redis/BullMQ dropped) |
| Execution | Separate worker processes + temp dirs (containers deferred) |
| Authentication | Mature session/auth library |
| Design | Dark-first, minimal developer tool |
| Primary color | #4BA9E1 |
| Typography | Geist + Geist Mono |
| MVP rating | Elo-like |
| MVP progression | XP + ranks |
| Community | Solution sharing + comments |
| AI | Deferred |
| Collaboration | Deferred |
| Recruiter platform | Deferred |

---

# 46. Success Metrics

## Product activation

- Percentage of signups who start a challenge.
- Percentage of users who solve one challenge in first session.
- Time to first accepted submission.

## Retention

- Day-1 retention.
- Day-7 retention.
- Day-30 retention.
- Weekly active solvers.

## Engagement

- Challenges solved per active user.
- Attempts per challenge.
- Daily challenge participation.
- Solution posts per solver.
- Comments per solution.

## Challenge quality

- Completion rate.
- Median solve time.
- Failed submission ratio.
- Challenge abandonment.
- User reports.

## Infrastructure

- Median execution latency.
- p95 execution latency.
- Sandbox failure rate.
- Queue wait time.
- API error rate.

---

# 47. Product Principles

1. **Debugging over typing.** The core skill is understanding existing code.
2. **Correctness over gamification.** Badges should never distract from engineering skill.
3. **Security by design.** Untrusted code execution is a first-class threat model.
4. **Fast feedback.** Users should know quickly whether their reasoning is working.
5. **Real-world relevance.** Prefer bugs developers actually encounter.
6. **Progress should be visible.** Users should build a measurable developer identity over time.
7. **Community should teach.** Shared solutions should help people learn without destroying challenge integrity.
8. **Architecture should scale by capability.** New languages and challenge types should not require rewriting the product.

---

# 48. Recommended Initial Build Order

```text
1.  Monorepo + project foundations                        [x]
2.  Authentication + user model                           [x] (verification enforcement deferred)
3.  Challenge schema + admin CRUD                         [x]
4.  Challenge catalog + challenge page                    [x]
5.  Monaco editor                                         [x]
6.  Execution queue (MongoDB-backed, not Redis)           [x]
7.  Sandbox worker for JavaScript                         [x]
8.  Visible tests                                         [x]
9.  Hidden tests + judging                                [x]
10. Submission history (API + dashboard; no /submissions) [~]
11. XP + rating + ranks                                   [x]
12. Public profile                                        [x]
13. Leaderboards (+ level / language / category)          [x]
14. Daily challenge + streaks                             [x]
15. Solution posts                                        [x]
16. Comments/likes (bookmarks deferred)                   [~]
17. Notifications + Socket.IO (community events only)     [~]
18. Moderation + reports                                  [ ]
19. Security hardening (containers)                       [ ]
20. Observability + production testing                    [~] (health + heartbeats live)
21. Add JavaScript and Python workers                     [x]
22. MVP launch                                            [ ]
```

---

# 49. Launch Definition

Nox is ready for an initial public beta when:

- At least one complete challenge category is well-curated.
- JavaScript execution is reliable.
- JavaScript/Python execution is stable enough for beta users.
- Hidden tests cannot be accessed from the browser.
- Code execution is isolated from the core application.
- Ratings are deterministic and auditable.
- User profiles display reliable statistics.
- Report/moderation flows work.
- Execution failures do not unfairly affect rating.
- Basic monitoring exists for API and worker failures.
- The first-time user journey can be completed without manual intervention.

---

# 50. Final Product Definition

Nox is a **solo, competitive debugging platform** where developers practice fixing broken code across multiple programming languages.

Its MVP focuses on:

```text
Broken code
    ↓
Debug
    ↓
Run tests
    ↓
Fix
    ↓
Submit
    ↓
Get judged
    ↓
Earn XP + rating
    ↓
Build profile
    ↓
Share knowledge
```

The long-term vision is broader:

> **Nox becomes a platform for proving practical software engineering skill through debugging, security, performance, and production-style engineering challenges.**

---

# Changelog

## v1.1 — 2026-09-16

- Reconciled the PRD with the codebase (was written pre-implementation).
- Daily challenge specified as built: UTC auto-rotation + dashboard widget, no admin step, normal progression.
- Queue specified as MongoDB-backed; Redis/BullMQ dropped. Sandbox specified as worker temp dirs; containers deferred.
- TypeScript marked metadata-only (422 on execution). JS + Python executable.
- Leaderboards expanded to the five implemented boards + `/me` + `/ranks`.
- Realtime scoped to community events; submissions poll REST. Notifications/moderation/bookmarks/reports/admin-UI marked not built.
- Data model and §29 API surface rewritten to match the implementation. Acceptance criteria and build order annotated with status.

## v1.0 — 2026-09-15

- Initial PRD.
- Product renamed from working name "Forge" to "Nox".
- Defined solo debugging-first product model.
- Defined MVP scope.
- Defined execution/sandbox architecture.
- Defined profile, ranking, community, moderation, and roadmap foundations.
