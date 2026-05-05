# Padel Platform

A web platform for padel players in Romania — find compatible partners, discover clubs, participate in Americano/Mexicano tournaments, and track a dynamic Glicko-2 rating. Built as a final-year university thesis project.

---

## Tech Stack

| Layer     | Technology                                                                |
| --------- | ------------------------------------------------------------------------- |
| Backend   | Node.js (LTS) · Express 5 · TypeScript · Prisma · SQLite (dev)            |
| Frontend  | React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router v6 |
| Shared    | `@padel/shared` — types, Zod schemas, constants                           |
| Tooling   | ESLint · Prettier · Husky · lint-staged                                   |
| Future DB | PostgreSQL + pgvector (Phase 4)                                           |

---

## Folder Structure

```
padel-platform/
├── apps/
│   ├── api/          # Express backend (port 3001)
│   │   ├── src/
│   │   │   ├── config/       # env vars
│   │   │   ├── lib/          # prisma client, logger
│   │   │   ├── middleware/   # error handler
│   │   │   └── routes/       # /api/health
│   │   └── prisma/           # schema.prisma, seed.ts
│   └── web/          # React frontend (port 5173)
│       └── src/
│           ├── components/ui/  # shadcn/ui components
│           ├── pages/          # Landing, HealthPage
│           ├── lib/            # axios client, utils
│           └── styles/         # Tailwind globals
├── packages/
│   └── shared/       # @padel/shared — types & schemas
├── .eslintrc.cjs
├── .prettierrc
├── tsconfig.base.json
├── docker-compose.yml
└── package.json      # npm workspaces root
```

---

## Running Locally

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### 1. Clone & install

```bash
git clone <repo-url>
cd padel-platform
npm install
```

### 2. Set up environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` — the defaults work for local development.

### 3. Run database migration

```bash
npm run db:migrate -w apps/api
```

### 4. (Optional) Seed the database

```bash
npm run db:seed -w apps/api
```

### 5. Start development servers

```bash
npm run dev
```

- API: http://localhost:3001
- Web: http://localhost:5173

---

## Available Scripts

Run from the **repo root** with `npm run <script>`:

| Script         | Description                                |
| -------------- | ------------------------------------------ |
| `dev`          | Start API + web with hot reload (parallel) |
| `build`        | Build all packages/apps                    |
| `lint`         | Lint all TypeScript/JavaScript files       |
| `lint:fix`     | Lint and auto-fix                          |
| `typecheck`    | TypeScript type-check all packages/apps    |
| `format`       | Prettier write all files                   |
| `format:check` | Prettier check (CI)                        |

Run from **`apps/api`** with `npm run <script> -w apps/api`:

| Script       | Description           |
| ------------ | --------------------- |
| `db:migrate` | Run Prisma migrations |
| `db:seed`    | Seed the database     |
| `db:studio`  | Open Prisma Studio    |

---

## Development Phases

| Phase                          | Scope                                             |
| ------------------------------ | ------------------------------------------------- |
| **0 — Foundation** _(current)_ | Monorepo, tooling, health endpoint                |
| 1 — Auth                       | JWT auth, user registration/login, Zod validation |
| 2 — Clubs & Matching           | Club CRUD, AI partner-matching algorithm          |
| 3 — Tournaments                | Americano/Mexicano formats, live scoring          |
| 4 — Rating & AI                | Glicko-2 rating, RAG chatbot, Postgres migration  |

---

_This project is developed as part of a Bachelor's thesis at [University Name], academic year 2025–2026._
