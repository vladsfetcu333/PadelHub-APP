# Padel Platform

> Bachelor's thesis project — a web platform for padel players in Romania.
> Players find compatible partners through MCDA scoring, discover clubs on
> a map, play Americano / Mexicano / Elimination tournaments, track a
> dynamic Glicko-2 rating, and ask a Romanian RAG chatbot about anything
> from positioning tactics to tournament formats.

---

## Quick start

```bash
git clone <repo-url>
cd Lucrare_Licenta_Sfetcu_Vlad_Andrei
npm install

# Start local Postgres + pgvector
docker compose up -d postgres

# API env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Schema + demo data
npm run db:migrate -w apps/api          # apply init migration
npm run db:seed:demo -w apps/api        # 67 users · 18 clubs · 400 matches
npm run ingest:knowledge -w apps/api    # embed chatbot KB (optional)

# Run both apps in parallel
npm run dev
```

- **API:** http://localhost:3001
- **Web:** http://localhost:5173
- **Demo login:** `andrei@padel.local` / `player1234`

For production deployment to Railway + Vercel see [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## What's inside

| Layer    | Technology                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Backend  | Node.js 20 · Express 5 · TypeScript · Prisma 6                                                           |
| Database | PostgreSQL 16 + `pgvector` extension (HNSW index, vector(384))                                           |
| Auth     | JWT (7-day) · bcryptjs · Zod validation · role gating (PLAYER / CLUB_OWNER / ADMIN)                      |
| Rating   | Glicko-2 for doubles (custom implementation, 49 unit tests)                                              |
| Matching | MCDA weighted scoring (level, side, availability, geo, history)                                          |
| Frontend | React 18 · Vite · Tailwind · shadcn/ui · Zustand · react-hook-form                                       |
| Map      | Leaflet + OpenStreetMap (no API key)                                                                     |
| Charts   | Recharts (player/club/admin reports)                                                                     |
| Chatbot  | Anthropic Claude Haiku 4.5 · Xenova all-MiniLM-L6-v2 embeddings · pgvector cosine search · SSE streaming |
| Shared   | `@padel/shared` — Zod schemas, types, enums, Romanian i18n                                               |
| Tooling  | ESLint · Prettier · Husky · lint-staged · Vitest                                                         |
| Deploy   | Railway (API + DB) · Vercel (web)                                                                        |

---

## Repository layout

```
padel-platform/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # 14 models + vector(384) on KnowledgeChunk
│   │   │   ├── migrations/        # init migration with HNSW index
│   │   │   ├── seed.ts            # minimal Phase 1 seed
│   │   │   └── seed-demo.ts       # 67 users · 18 clubs · 400 matches · 8 tournaments
│   │   ├── src/
│   │   │   ├── config/            # env loader (override:true on Windows)
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts      # singleton client
│   │   │   │   ├── jwt.ts password.ts logger.ts geo.ts dto.ts
│   │   │   │   ├── rating/        # glicko2.ts (doubles, with tests)
│   │   │   │   ├── matching/      # mcda compatibility scorer
│   │   │   │   ├── tournaments/   # Americano · Mexicano · Elimination
│   │   │   │   └── rag/           # embedder · retriever (pgvector raw SQL)
│   │   │   ├── middleware/        # auth · validate · errorHandler
│   │   │   ├── routes/            # 11 routers · all in /api/*
│   │   │   ├── services/          # business logic
│   │   │   └── scripts/           # ingest-knowledge.ts
│   │   └── knowledge/             # 5 Romanian markdown files (chatbot KB)
│   └── web/
│       └── src/
│           ├── components/
│           │   ├── ui/            # shadcn primitives
│           │   ├── padel/         # PadelLevelBadge · PreferredSideIndicator · CourtTypeBadge
│           │   ├── clubs/         # ClubCard · ClubsMap (Leaflet)
│           │   ├── matching/      # PartnerCard · ScoreBreakdown
│           │   ├── tournaments/   # RoundCard · BracketView · LiveScoreboard
│           │   ├── chat/          # ChatWidget (floating, SSE stream)
│           │   ├── NotificationBell.tsx · Layout.tsx · RouteGuards.tsx
│           ├── pages/             # 20+ pages (auth, clubs, matches, tournaments, reports, …)
│           ├── store/             # Zustand: auth · notifications
│           └── lib/               # axios client · utils
├── packages/
│   └── shared/
│       └── src/
│           ├── constants/         # enums, PADEL_LEVELS, MAX_FAVORITE_CLUBS, …
│           ├── schemas/           # Zod schemas (consumed by both apps)
│           ├── types/             # DTOs · request/response shapes
│           └── i18n/ro.ts         # all Romanian copy
├── docker-compose.yml             # Postgres 16 + pgvector
├── railway.toml                   # Railway service config
├── apps/web/vercel.json           # Vercel monorepo build
├── DEPLOYMENT.md                  # production runbook
└── PHASE{0,1,2,3,4}_REPORT.md     # per-phase implementation notes
```

---

## Feature tour

### Auth & profiles

- Email + password (bcrypt × 10 rounds), JWT in `localStorage`, 7-day expiry.
- Padel-specific profile fields: level (2.0–7.0 in 0.5 steps), preferred side
  (LEFT / RIGHT / BOTH), gender, dominant hand, year-of-birth, club city.
- Weekly availability slots (Mon–Sun × HH:MM).
- Favorite clubs (max 3 per user) for quicker matching.

### Clubs

- 18 hand-curated clubs across București (10), Cluj (2), Timișoara, Iași,
  Brașov, Constanța, Sibiu, Craiova.
- Each club has 2–6 courts (INDOOR / OUTDOOR / PANORAMIC), business hours,
  contact info, geo-coordinates, cover photo.
- Leaflet map view with city + court-type filters and a haversine
  radius search.

### Matching (MCDA)

- Five criteria scored 0–100 and combined with configurable weights
  (default: level 35 % · side 15 % · availability 20 % · geo 15 % · history
  15 %). Per-user weights persisted in `MatchingPreferences`.
- Three entry points:
  - **Top compatible partners** (1v1 partner search)
  - **Full match suggestions** (2v2 from the partner pool)
  - **Open-match fillers** (best 4th for an existing open match)
- 60-second LRU cache per `(userId, queryString)`.

### Open matches & match recording

- Anyone can post an open match (date, club, level range, format). The
  4th join atomically flips status to `FULL` and creates a `Match` row.
- After play, any participant enters the score → status flips to
  `PENDING_CONFIRMATION`. Once the 4th participant confirms, status flips
  to `VALIDATED` and **Glicko-2 doubles** ratings are applied to all 4
  players in a single transaction.
- Unconfirmed scores expire after 48 h (`startMatchExpiryJob`).

### Tournaments

- Three formats:
  - **Americano** — round-robin partner rotation, 5–8 players, ad-hoc
    teaming, points-per-game scoring.
  - **Mexicano** — same as Americano but partners chosen by current
    standings each round (1+8 vs 4+5, etc.).
  - **Single Elimination** — 8 / 16 / 32-bracket with seeding by Glicko
    rating.
- Owners can register guests (no account) for friendlies.
- Full-screen `TournamentDisplayPage` for projecting onto a club TV.

### Reports (Recharts)

- **Player report** — rating history, level distribution of opponents,
  club mix, top 5 partners / opponents.
- **Club report** — court utilization by day, level distribution of
  members, matches/week trend, top local players.
- **Admin report** — platform-wide KPIs (new registrations, matches
  validated, top clubs, …).

### Chatbot (RAG)

- Knowledge base: 5 Romanian markdown files (~100–200 chunks) covering
  rules, scoring, tactics, ratings, tournament formats.
- Embeddings: Xenova `all-MiniLM-L6-v2` (384-dim, runs in-process — no
  external embedding API).
- Storage: `KnowledgeChunk.embedding vector(384)` with an HNSW index
  (`vector_cosine_ops`) for sub-millisecond retrieval.
- Generation: Anthropic Claude Haiku 4.5 with retrieved context, SSE
  streamed token-by-token to the floating chat widget.

### Notifications

- In-app only (no email/push in scope).
- 8 notification types: match scheduled, score awaiting confirmation,
  rating updated, match recommendation, tournament invitation, welcome, …
- Header bell with unread count; full list at `/notifications`.

---

## Database

The schema lives in [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).
14 models:

`User · Club · Court · Availability · FavoriteClub · MatchingPreferences ·
OpenMatch · OpenMatchParticipant · Match · MatchScore · RatingChange ·
Tournament · TournamentParticipant · TournamentRound · Notification ·
ChatSession · ChatMessage · KnowledgeChunk`

Postgres-specific:

- The `vector` extension is declared in the schema and auto-installed
  by the init migration.
- `KnowledgeChunk.embedding` is `vector(384)` (Prisma `Unsupported<>`).
  Reads use `$queryRawUnsafe` with `embedding <=> $1::vector ORDER BY …`;
  writes use `$executeRaw` with `[0.1,0.2,…]::vector` literals.
- HNSW index on the embedding column for cosine similarity.

---

## Scripts

From the **repo root**:

| Script                            | Description                            |
| --------------------------------- | -------------------------------------- |
| `npm run dev`                     | API + web concurrently with hot reload |
| `npm run build`                   | Build shared → api → web (production)  |
| `npm run typecheck`               | TypeScript across all workspaces       |
| `npm run lint` / `lint:fix`       | ESLint across all workspaces           |
| `npm run format` / `format:check` | Prettier                               |

From `apps/api` (`-w apps/api`):

| Script             | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `db:migrate`       | `prisma migrate dev` (development)                      |
| `db:reset`         | DESTRUCTIVE — drop & recreate DB                        |
| `db:seed`          | Minimal seed (admin + 5 players + 10 clubs)             |
| `db:seed:demo`     | Full demo seed (67 users · 18 clubs · 400 matches · …)  |
| `db:studio`        | Prisma Studio (DB GUI on port 5555)                     |
| `ingest:knowledge` | Embed the chatbot knowledge base into Postgres          |
| `test`             | Vitest unit tests (Glicko-2 + compatibility — 49 tests) |
| `test:watch`       | Vitest watch mode                                       |

---

## Tests

```bash
npm run test -w apps/api
```

49 unit tests covering:

- Glicko-2 doubles rating updates against textbook examples
- Compatibility scoring across all five MCDA criteria
- Haversine geo distance
- Score-set parsing & validation

---

## Documentation

| Document                 | Audience                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| `README.md`              | Anyone trying to run the project                                      |
| `DEPLOYMENT.md`          | Step-by-step Railway + Vercel deploy                                  |
| `PHASE0_REPORT.md`       | Monorepo foundation                                                   |
| `PHASE1_REPORT.md`       | Auth, profiles, clubs                                                 |
| `PHASE2_REPORT.md`       | Matching algorithm + ratings + match recording                        |
| `PHASE3_REPORT.md`       | Tournaments, reports, chatbot, notifications                          |
| `PHASE4_REPORT.md`       | Postgres migration, demo data, deploy, polish                         |
| `THESIS_REPORT.md`       | Long-form thesis chapter (architecture, design decisions, evaluation) |
| `THESIS_BIBLIOGRAPHY.md` | APA-style sources                                                     |
| `DEFENSE_PREP.md`        | Anticipated committee questions + demo script                         |

---

## License & academic note

Developed as part of a Bachelor's thesis, academic year 2025–2026.
Source data (clubs, players) is synthetic. The author retains all rights
to the codebase.
