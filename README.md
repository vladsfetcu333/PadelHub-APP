# Padel Platform

A web platform for padel players in Romania — find compatible partners, discover clubs, participate in Americano/Mexicano tournaments, and track a dynamic Glicko-2 rating. Built as a final-year university thesis project.

---

## Tech Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Backend  | Node.js 20+ · Express 5 · TypeScript · Prisma · SQLite (Postgres in P4) |
| Auth     | JSON Web Tokens (7-day) · bcryptjs · Zod validation                     |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · Zustand       |
| Forms    | react-hook-form + @hookform/resolvers + Zod                             |
| Map      | Leaflet + OpenStreetMap (no API key)                                    |
| Shared   | `@padel/shared` — Zod schemas · types · enums · Romanian i18n           |
| Tooling  | ESLint · Prettier · Husky · lint-staged                                 |

---

## Folder Structure

```
padel-platform/
├── apps/
│   ├── api/          # Express backend (port 3001)
│   │   ├── prisma/   # schema.prisma · migrations · seed.ts
│   │   └── src/
│   │       ├── config/       # env loader
│   │       ├── lib/          # prisma · logger · jwt · password · httpError · geo · DTO mappers
│   │       ├── middleware/   # auth · validate · errorHandler
│   │       ├── routes/       # health · auth · users · clubs
│   │       └── services/     # authService · userService · clubService
│   └── web/          # React frontend (port 5173)
│       └── src/
│           ├── components/
│           │   ├── ui/       # shadcn primitives (Button, Input, Tabs, Dialog…)
│           │   ├── padel/    # PadelLevelBadge · PreferredSideIndicator · CourtTypeBadge
│           │   ├── clubs/    # ClubCard · ClubsMap
│           │   ├── profile/  # EditProfileForm · AvailabilityEditor · MatchingPreferencesForm
│           │   ├── Layout.tsx
│           │   └── RouteGuards.tsx
│           ├── pages/        # Landing · HealthPage · auth/ · clubs/ · profile/
│           ├── store/        # Zustand auth store
│           ├── lib/          # axios client · utils
│           └── styles/       # globals.css (Tailwind + CSS variables)
├── packages/
│   └── shared/       # @padel/shared
│       └── src/
│           ├── constants/    # enums (Gender, PreferredSide, PADEL_LEVELS, MAX_FAVORITE_CLUBS…)
│           ├── schemas/      # auth · profile · club Zod schemas
│           ├── types/        # PublicUserDto · SelfUserDto · ClubDto · AuthResponse…
│           └── i18n/ro.ts    # Romanian copy strings
├── docker-compose.yml # Postgres+pgvector (Phase 4 only)
├── tsconfig.base.json
└── package.json       # npm workspaces root
```

---

## Running Locally

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### 1. Clone & install

```bash
git clone <repo-url>
cd Lucrare_Licenta_Sfetcu_Vlad_Andrei
npm install
```

### 2. Set up environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The defaults work for local development. The only file you really need is the API `.env` (the web app reads its `VITE_API_URL` directly from `.env.example` defaults if omitted).

### 3. Database migration + seed

From the **API workspace** (`apps/api`):

```bash
npm run db:migrate -w apps/api    # apply the Phase 1 migration
npm run db:seed     -w apps/api    # idempotent seed (admin + 5 players + 10 clubs)
```

### 4. Start dev servers

From the **repo root**:

```bash
npm run dev
```

- **API:** http://localhost:3001 (hot reload via `tsx watch`)
- **Web:** http://localhost:5173 (Vite HMR)

### Seeded accounts

| Account               | Email                | Password     | Role   |
| --------------------- | -------------------- | ------------ | ------ |
| Admin                 | `admin@padel.local`  | `admin1234`  | ADMIN  |
| Andrei Bratu          | `andrei@padel.local` | `player1234` | PLAYER |
| Maria Constantin      | `maria@padel.local`  | `player1234` | PLAYER |
| Radu Popa (Cluj)      | `radu@padel.local`   | `player1234` | PLAYER |
| Ioana Dumitrescu (BV) | `ioana@padel.local`  | `player1234` | PLAYER |
| Mihai Vasile (TM)     | `mihai@padel.local`  | `player1234` | PLAYER |

The seed also creates 10 real-sounding Bucharest-area clubs with 2–4 courts each.

---

## API Reference (Phases 1 + 2)

### Auth

| Method | Path                       | Body                       | Auth | Description          |
| ------ | -------------------------- | -------------------------- | ---- | -------------------- |
| POST   | `/api/auth/register`       | RegisterSchema             | —    | Create account + JWT |
| POST   | `/api/auth/login`          | LoginSchema                | —    | Get JWT              |
| POST   | `/api/auth/logout`         | —                          | JWT  | Client-side discard  |
| GET    | `/api/auth/me`             | —                          | JWT  | Self DTO             |
| POST   | `/api/auth/me/password`    | ChangePasswordSchema       | JWT  | Change password      |
| POST   | `/api/auth/password-reset` | RequestPasswordResetSchema | —    | Stub (TODO email)    |

### Users

| Method | Path                                   | Auth | Description                                |
| ------ | -------------------------------------- | ---- | ------------------------------------------ |
| PATCH  | `/api/users/me`                        | JWT  | Update profile (partial)                   |
| GET    | `/api/users/me/availabilities`         | JWT  | List my weekly slots                       |
| POST   | `/api/users/me/availabilities`         | JWT  | Add slot                                   |
| PATCH  | `/api/users/me/availabilities/:id`     | JWT  | Update slot                                |
| DELETE | `/api/users/me/availabilities/:id`     | JWT  | Remove slot                                |
| GET    | `/api/users/me/favorite-clubs`         | JWT  | My favorites                               |
| POST   | `/api/users/me/favorite-clubs/:clubId` | JWT  | Add favorite (max 3 → 400 with msg)        |
| DELETE | `/api/users/me/favorite-clubs/:clubId` | JWT  | Remove favorite                            |
| GET    | `/api/users/:identifier`               | opt  | Public profile by id/username + visibility |

### Clubs

| Method | Path                         | Auth        | Description                                                          |
| ------ | ---------------------------- | ----------- | -------------------------------------------------------------------- |
| GET    | `/api/clubs`                 | —           | List with `?city=&type=&indoor=&lat=&lng=&radiusKm=&page=&pageSize=` |
| GET    | `/api/clubs/:slug`           | —           | Detail with courts                                                   |
| POST   | `/api/clubs`                 | ADMIN/OWNER | Create (OWNER → unverified)                                          |
| PATCH  | `/api/clubs/:id`             | owner/ADMIN | Update                                                               |
| DELETE | `/api/clubs/:id`             | ADMIN       | Delete                                                               |
| POST   | `/api/clubs/:id/verify`      | ADMIN       | Mark verified                                                        |
| POST   | `/api/clubs/:id/courts`      | owner/ADMIN | Add court                                                            |
| PATCH  | `/api/clubs/courts/:courtId` | owner/ADMIN | Update court                                                         |
| DELETE | `/api/clubs/courts/:courtId` | owner/ADMIN | Remove court                                                         |

### Matching (Phase 2)

| Method | Path                                           | Auth | Description                                                    |
| ------ | ---------------------------------------------- | ---- | -------------------------------------------------------------- |
| GET    | `/api/matching/partners`                       | JWT  | Top compatible partners with score + breakdown (MCDA weighted) |
| GET    | `/api/matching/full-match`                     | JWT  | Suggested 2v2 formations from your top partners pool           |
| GET    | `/api/matching/open-match/:id/recommendations` | JWT  | Best fillers for an open match slot                            |

Cached for 60 s per `(userId, queryString)`. Invalidated on any open-match write.

### Open Matches (Phase 2)

| Method | Path                          | Auth | Description                                                |
| ------ | ----------------------------- | ---- | ---------------------------------------------------------- |
| GET    | `/api/open-matches`           | —    | List (filters: city, dateFrom/To, levelMin/Max, status)    |
| GET    | `/api/open-matches/:id`       | —    | Detail with participants                                   |
| POST   | `/api/open-matches`           | JWT  | Create — creator auto-added as participant #1              |
| POST   | `/api/open-matches/:id/join`  | JWT  | Join (eligibility-checked); 4th join → status FULL + Match |
| DELETE | `/api/open-matches/:id/leave` | JWT  | Leave (creator must cancel instead; blocked when FULL)     |
| DELETE | `/api/open-matches/:id`       | JWT  | Creator cancels (only while OPEN)                          |

### Matches (Phase 2)

| Method | Path                       | Auth | Description                                                          |
| ------ | -------------------------- | ---- | -------------------------------------------------------------------- |
| GET    | `/api/matches/me`          | JWT  | My matches, filterable by `?status=`                                 |
| GET    | `/api/matches/:id`         | JWT  | Match detail                                                         |
| POST   | `/api/matches/:id/score`   | JWT  | Enter score → PENDING_CONFIRMATION; auto-confirms entrant            |
| POST   | `/api/matches/:id/confirm` | JWT  | Confirm score; on 4th confirm → VALIDATED + Glicko-2 ratings applied |
| POST   | `/api/matches/:id/dispute` | JWT  | Flag dispute (admin resolution tools deferred to Phase 3)            |

Background job: rows in `PENDING_CONFIRMATION` older than 48 h → `EXPIRED` (no rating change). Cron runs hourly via `setInterval` in `startMatchExpiryJob`.

---

## Available Scripts

Run from the **repo root** with `npm run <script>`:

| Script         | Description                                |
| -------------- | ------------------------------------------ |
| `dev`          | Start API + web with hot reload (parallel) |
| `build`        | Build shared → api → web                   |
| `lint`         | Lint all TS/JS                             |
| `lint:fix`     | Lint and auto-fix                          |
| `typecheck`    | TypeScript check across all workspaces     |
| `format`       | Prettier write everything                  |
| `format:check` | Prettier check (CI)                        |

Run from **`apps/api`** with `npm run <script> -w apps/api`:

| Script       | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `db:migrate` | Run Prisma migrations                                               |
| `db:seed`    | Seed the database                                                   |
| `db:studio`  | Open Prisma Studio                                                  |
| `db:reset`   | **DESTRUCTIVE** — reset DB                                          |
| `test`       | Run Vitest unit tests (Glicko-2 + compatibility scoring — 49 tests) |
| `test:watch` | Vitest watch mode                                                   |

---

## Development Phases

| Phase | Scope                                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| 0     | Foundation — monorepo, tooling, health endpoint                                       |
| 1     | Auth, profiles, clubs, geolocation, role gating                                       |
| **2** | **Compatibility scoring (MCDA), open matches, match recording, Glicko-2** _(current)_ |
| 3     | Americano / Mexicano tournaments, live scoring, admin dispute tools                   |
| 4     | RAG chatbot, Postgres + pgvector migration                                            |

See `PHASE0_REPORT.md`, `PHASE1_REPORT.md`, `PHASE2_REPORT.md` for per-phase implementation notes.

---

_This project is developed as part of a Bachelor's thesis, academic year 2025–2026._
