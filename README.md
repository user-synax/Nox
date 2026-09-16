<p align="center">
  <img src="frontend/public/Nox-logo.png" alt="Nox Logo" width="120" />
</p>

<h1 align="center">Nox</h1>

<p align="center">
  <strong>Find the bug. Fix the code. Prove the fix.</strong>
</p>

<p align="center">
  A competitive debugging platform where developers practice fixing broken code, run automated tests, and build a public developer profile.
</p>

<p align="center">
  <a href="https://nox.synax.me">Website</a> ·
  <a href="https://nox.synax.me/challenges">Challenges</a> ·
  <a href="https://nox.synax.me/leaderboard">Leaderboard</a>
</p>

---

## About

Nox is a developer practice and competitive platform focused on real-world debugging. Instead of asking developers to write solutions from scratch, Nox gives them intentionally broken code and challenges them to understand the existing implementation, identify the root cause, fix it, and prove the fix with automated tests. Practice the skill developers use every day — debugging.

## Features

- **Debugging Challenges** — Find and fix bugs in intentionally broken code across multiple categories
- **Hidden Tests** — Prove your fix with automated test validation, not just visible examples
- **Isolated Execution** — Code runs in separate worker processes with temp-dir isolation (container sandboxing planned)
- **Monaco Editor** — Full-featured code editor in the browser
- **Developer Profiles** — Public profiles with XP, ratings, ranks, streaks, and stats
- **Leaderboards** — Global and weekly competitive rankings
- **Daily Challenge** — A new challenge every day for the entire community
- **Solution Sharing** — Publish explanations and code after solving a challenge
- **Ratings & XP** — Elo-like competitive rating plus progression-based XP
- **Streaks** — Track daily activity and maintain your solve streak

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui, Monaco Editor |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB |
| Queue | MongoDB-backed job queue (no extra infra) |
| Auth | Better Auth (email/password + Google OAuth) |
| Execution | Isolated worker processes (JS + Python; containers planned) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) (v1.3+)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)

### Installation

```bash
# Clone the repository
git clone https://github.com/synax/nox.git
cd nox

# Install frontend dependencies
cd frontend
bun install

# Install backend dependencies
cd ../backend
bun install
```

### Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI, Redis URL, and auth secrets
```

### Running Locally

```bash
# Start backend + execution worker together
cd backend
bun run dev:all

# Or start each process separately (worker executes user code)
cd backend
bun run dev      # API on :4000
bun run worker   # execution worker (separate terminal)

# Start frontend (in a separate terminal)
cd frontend
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How It Works

```
Discover challenge
      ↓
Read broken code
      ↓
Understand the failure
      ↓
Edit code in browser
      ↓
Run visible tests
      ↓
Iterate on fix
      ↓
Submit solution
      ↓
Hidden tests validate
      ↓
Earn XP + rating
      ↓
Build your profile
```

## Repository Structure

```
nox/
├── frontend/          # Next.js application
├── backend/           # Express API server
├── PRD.md             # Product Requirements Document
├── DESIGN.md          # Design system specification
└── README.md
```

## Roadmap

- **Phase 1** — MVP: Auth, profiles, challenges, execution, judging, leaderboards
- **Phase 2** — Multi-file projects, better diagnostics, advanced scoring
- **Phase 3** — Seasons, divisions, tournaments, team competitions
- **Phase 4** — Community challenge creation and authoring tools
- **Phase 5** — Security challenges and production incident simulations
- **Phase 6** — AI-assisted learning and progressive hints
- **Phase 7** — Developer portfolio and skill verification
- **Phase 8** — Company assessments and B2B evaluation tools

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

MIT
