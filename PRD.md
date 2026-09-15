# Nox — Product Requirements Document

**Product:** Nox  
**Domain:** `Nox.synax.me`  
**Status:** MVP Planning  
**Document Version:** 1.0  
**Last Updated:** 2026-09-15  
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
- Google OAuth.
- Email verification.
- Session management.
- Logout.
- Password reset.
- Basic account security controls.

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

- JavaScript.
- Node JS

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
                               Queue
                                  │
                         ┌────────▼────────┐
                         │ Execution Queue │
                         └────────┬────────┘
                                  │
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                  ▼
        ┌────────────┐     ┌────────────┐     ┌────────────┐
        │ JS Worker  │     │ TS Worker  │     │ Py Worker  │
        │ Sandbox    │     │ Sandbox    │     │ Sandbox    │
        └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
              └──────────────────┼──────────────────┘
                                 ▼
                         Test result / metrics
                                 │
                                 ▼
                              MongoDB
```

## 10.3 MVP sandbox controls

Execution environments must enforce, as applicable:

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

Rank thresholds should be configurable from the backend rather than hardcoded into the frontend.

---

# 16. Leaderboards

## MVP

### Global leaderboard

Rank users by competitive rating.

### Weekly leaderboard

Rank by rating progression or challenge score during the current weekly period.

### Optional filtered leaderboards

- Language.
- Category.

The backend should support filters even if only global and weekly views are exposed initially.

---

# 17. Streaks

MVP includes a simple activity streak.

A streak is maintained when a user successfully completes at least one challenge during the applicable day.

Track:

- Current streak.
- Longest streak.
- Last active date.

Do not make streaks the primary product value.

---

# 18. Daily Challenge

A single highlighted challenge is presented each day.

### Requirements

- One canonical challenge per day.
- Globally consistent challenge for all users.
- Challenge can be configured by admins.
- Daily challenge results contribute to normal progression.

Future versions may add separate daily challenge variants by language or skill level.

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

- Like.
- Comment.
- Bookmark.
- Report.

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
Daily
Trending
New
```

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

Socket.IO should be used for live notification delivery when the user is connected.

Persist notifications in MongoDB so they remain available after reconnect.

---

# 22. Admin System

Nox requires an admin surface from the beginning because challenge quality and execution safety cannot depend entirely on user-generated content.

## MVP admin features

- User search.
- User details.
- Suspend/ban user.
- Challenge CRUD.
- Publish/unpublish challenge.
- Challenge preview.
- Hidden test management.
- Submission inspection.
- Solution moderation.
- Comment moderation.
- Report management.
- Basic execution queue visibility.
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

- Submission state.
- Test execution state.
- Notification delivery.
- Leaderboard updates where useful.
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

- Next.js.
- JavaScript.
- App Router.
- Tailwind CSS.
- shadcn/ui.
- Framer Motion.
- Monaco Editor.

## Backend

- Node.js.
- Express.js.
- JavaScript.
- Socket.IO.

## Database

- MongoDB.
- Mongoose or equivalent MongoDB ODM/data-access layer.

## Queue / execution infrastructure

- Redis.
- BullMQ or equivalent queue system.
- Isolated execution workers.
- Container-based sandboxing.

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
rating
xp
level
currentStreak
longestStreak
solvedCount
acceptedCount
attemptCount
successRate
hardestSolvedChallengeId
preferredLanguages[]
skills{}
updatedAt
```

## Challenge

```text
_id
slug
title
description
language
category
tags[]
difficulty
starterFiles[]
visibleTests[]
hiddenTestConfig
constraints
timeLimitMs
memoryLimitMb
authorId
status
version
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
challengeVersion
language
sourceSnapshot
status
score
testsPassed
testsTotal
executionTimeMs
memoryUsedMb
ratingDelta
xpAwarded
createdAt
completedAt
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

## Challenges

```text
GET    /challenges
GET    /challenges/:slug
GET    /challenges/:slug/tests/visible
```

## Submissions

```text
POST   /challenges/:id/run
POST   /challenges/:id/submit
GET    /submissions/:id
GET    /users/me/submissions
```

## Solutions

```text
POST   /challenges/:id/solutions
GET    /challenges/:id/solutions
GET    /solutions/:id
POST   /solutions/:id/like
POST   /solutions/:id/bookmark
POST   /solutions/:id/report
```

## Comments

```text
GET    /solutions/:id/comments
POST   /solutions/:id/comments
DELETE /comments/:id
```

## Leaderboards

```text
GET /leaderboard/global
GET /leaderboard/weekly
```

## Notifications

```text
GET    /notifications
POST   /notifications/:id/read
POST   /notifications/read-all
```

## Admin

```text
GET    /admin/users
GET    /admin/challenges
POST   /admin/challenges
Nox  /admin/challenges/:id
POST   /admin/challenges/:id/publish
GET    /admin/submissions
GET    /admin/reports
Nox  /admin/reports/:id
```

---

# 30. WebSocket Events — MVP

Suggested event namespace:

```text
submission:queued
submission:running
submission:completed
submission:failed
notification:new
leaderboard:updated
```

The client must not treat realtime messages as the source of truth for durable state. On reconnect, the client should fetch authoritative state from the API.

---

# 31. Frontend Pages

## Public

```text
/
/challenges
/challenges/[slug]
/leaderboard
/solutions/[id]
/u/[username]
/login
/signup
```

## Authenticated

```text
/dashboard
/challenges
/challenges/[slug]
/submissions
/profile
/settings
/notifications
```

## Admin

```text
/admin
/admin/users
/admin/challenges
/admin/submissions
/admin/reports
/admin/audit-logs
```

---

# 32. Landing Page

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

Nox MVP is considered complete when a new user can:

1. Create an account.
2. Verify the account.
3. Create a public profile.
4. Browse and filter challenges.
5. Open a challenge.
6. Read the problem and expected behavior.
7. Edit code in the browser.
8. Run visible tests.
9. Receive execution output.
10. Submit code.
11. Have the submission evaluated against hidden tests.
12. Receive a final result and score.
13. Gain XP and rating on success.
14. See challenge history.
15. See progress on the public profile.
16. Appear on a leaderboard.
17. Publish a solution after successful completion.
18. Comment on another solution.
19. Receive an in-app notification.
20. Have admins manage challenges and moderate content.

---

# 42. MVP Release Scope

## Build for V1

- Authentication.
- Public profiles.
- Challenge catalog.
- JavaScript support.
- JavaScript support.
- Python support.
- Monaco editor.
- Visible tests.
- Hidden tests.
- Isolated execution.
- Submission queue.
- Automatic judging.
- XP.
- Rating.
- Ranks.
- Global leaderboard.
- Weekly leaderboard.
- Streaks.
- Daily challenge.
- Solution sharing.
- Likes.
- Comments.
- Bookmarks.
- Reports.
- In-app notifications.
- Admin dashboard.
- Basic moderation.
- Rate limits.
- Audit logs.
- Security/observability baseline.

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
| MVP languages | JS / TS / Python |
| Frontend | Next.js + JavaScript |
| UI | Tailwind + shadcn/ui |
| Editor | Monaco |
| Backend | Node.js + Express |
| Database | MongoDB |
| Realtime | Socket.IO |
| Queue | Redis + BullMQ or equivalent |
| Execution | Isolated workers/containers |
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
1. Monorepo + project foundations
2. Authentication + user model
3. Challenge schema + admin CRUD
4. Challenge catalog + challenge page
5. Monaco editor
6. Execution queue
7. Sandbox worker for JavaScript
8. Visible tests
9. Hidden tests + judging
10. Submission history
11. XP + rating + ranks
12. Public profile
13. Leaderboards
14. Daily challenge + streaks
15. Solution posts
16. Comments/likes/bookmarks
17. Notifications + Socket.IO
18. Moderation + reports
19. Security hardening
20. Observability + production testing
21. Add JavaScript and Python workers
22. MVP launch
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

## v1.0 — 2026-09-15

- Initial PRD.
- Product renamed from working name "Forge" to "Nox".
- Defined solo debugging-first product model.
- Defined MVP scope.
- Defined execution/sandbox architecture.
- Defined profile, ranking, community, moderation, and roadmap foundations.
