# Padel Platform — Bachelor's Thesis Report

**Author:** Sfetcu Vlad-Andrei
**Academic year:** 2025–2026
**Field:** Computer Science
**Project type:** Software engineering — full-stack web platform

---

## Abstract

This thesis presents the design and implementation of a web platform
that solves three concrete problems for the growing community of padel
players in Romania:

1. **Partner discovery.** Casual players struggle to find compatible
   opponents at their skill level, preferred court side, and matching
   availability. The platform implements a five-criterion Multi-Criteria
   Decision Analysis (MCDA) scorer that produces ranked partner
   suggestions with explainable score breakdowns.
2. **Skill tracking.** Padel is a doubles-only sport, so individual ELO
   does not transfer. The platform implements **Glicko-2 adapted for
   doubles** with team-strength averaging and a per-player RD update,
   producing rating curves that converge in 10–15 matches.
3. **Club & tournament logistics.** The platform supports three
   tournament formats native to padel culture (Americano, Mexicano,
   Single Elimination), live TV-projection scoreboards, three report
   audiences (player / club / admin), and a Romanian-language
   Retrieval-Augmented Generation (RAG) chatbot powered by Claude
   Haiku 4.5 + pgvector.

The system is built as an npm-workspaces monorepo with three
TypeScript packages (API, web, shared). It is deployed to Railway
(API + Postgres 16 with pgvector) and Vercel (Vite + React SPA).

This report documents the architecture, the algorithmic choices, the
data model, key engineering decisions, and the evaluation strategy
across four development phases.

---

## Table of contents

1. Introduction & motivation
2. Related work
3. Architecture overview
4. Data model
5. The matching algorithm (MCDA)
6. The rating algorithm (Glicko-2 for doubles)
7. Tournament engine
8. Retrieval-Augmented chatbot
9. UX & internationalisation
10. Evaluation
11. Limitations & future work
12. Conclusion

---

## 1. Introduction & motivation

Padel is one of the fastest-growing racquet sports in Europe. In Romania
specifically, the number of dedicated padel courts grew from a handful
in 2020 to over 200 by 2025, with most concentrated in București, Cluj,
and Timișoara. This rapid growth has outpaced the tooling available to
players: scheduling happens on WhatsApp, partners are found by word of
mouth, and tournament brackets are managed on paper.

Existing international platforms (Playtomic, MatchPoint, Padel Mates)
focus on **booking** — finding a free court — and treat matchmaking as
an afterthought (a flat list of nearby players sorted by Playtomic
level). None offers:

- A transparent **explainable** matching score.
- A **rating system designed for doubles** rather than singles
  borrowings.
- A **Romanian-language conversational assistant** to onboard new
  players.

The platform presented here addresses these three gaps in a single
integrated product. Booking itself is deliberately out of scope: courts
are reserved at the club via phone or existing apps, while this platform
focuses on the **social** layer — finding the right people to play with.

---

## 2. Related work

### 2.1 Matchmaking in casual sports apps

Most consumer matchmaking systems are variants of ELO or its successors
(Glicko, Glicko-2, TrueSkill). They operate on a single
**skill-only** dimension, which works for ranked competitive play
(chess, esports) but is poorly suited to casual social sports, where
geography, schedule overlap, and even handedness compatibility (left /
right side of the court in padel) matter as much as skill.

**Multi-Criteria Decision Analysis** (Roy, 1968; Saaty, 1980 — the
Analytic Hierarchy Process) provides a well-studied framework for
combining heterogeneous criteria into a single score. AHP-style
weight elicitation is impractical for end-users, so this platform
exposes weights through a **preferences UI** with sensible defaults
and lets the user nudge them on a slider.

### 2.2 Doubles rating

Glickman's 1995 Glicko system and its 1999 / 2012 refinement Glicko-2
were designed for individual chess players. They have been adapted to
team sports in academic papers — Lasek et al. (2013) for football,
Csató (2017) for tennis doubles — typically by averaging the team's μ
and σ and applying the singles update to each player.

This thesis adopts the **team-strength averaging** approach: a doubles
match is treated as a singles match between two virtual players whose
μ is the mean of their team members'. Each individual then receives the
Glicko-2 update independently, propagating the per-player RD properly.
Section 6 details the choice.

### 2.3 Retrieval-Augmented Generation

Lewis et al. (2020) introduced RAG as a way to ground large language
model outputs in a corpus of source documents. The standard recipe
(embed → retrieve top-k → splice into prompt) is now ubiquitous. The
key engineering choices are:

- **Embedding model**: closed (OpenAI `text-embedding-3-*`) vs open
  (Xenova, BGE, E5, …). The platform uses **Xenova all-MiniLM-L6-v2**
  because it runs entirely in-process (no extra API key, no extra
  service to deploy) and produces 384-dim vectors that store cheaply in
  pgvector.
- **Vector store**: dedicated (Pinecone, Weaviate, Qdrant) vs in-DB
  (pgvector, Supabase). The platform uses **pgvector** because the
  application already uses Postgres for the relational data, so a
  single connection string and a single backup pipeline suffice.
- **Generation model**: GPT-4-class vs smaller. The platform uses
  **Claude Haiku 4.5** for cost-efficiency on a thesis budget while
  delivering native Romanian fluency.

---

## 3. Architecture overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Browser                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ React 18 + Vite SPA                                              │  │
│  │   • shadcn/ui + Tailwind                                         │  │
│  │   • Zustand stores (auth, notifications)                         │  │
│  │   • React Router 6 with role-gated routes                        │  │
│  │   • Floating ChatWidget (SSE consumer)                           │  │
│  └────────────────────────────────────────────┬─────────────────────┘  │
└─────────────────────────────────────────────── │ HTTPS ────────────────┘
                                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            Express 5 API                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Middleware: cors · zod-validate · jwt-auth · error-handler      │  │
│  │  Routers:                                                        │  │
│  │    /api/auth  · /api/users · /api/clubs · /api/matching          │  │
│  │    /api/open-matches · /api/matches · /api/tournaments           │  │
│  │    /api/reports · /api/notifications · /api/chat                 │  │
│  │  Services: pure business logic                                   │  │
│  │  Libs: glicko2 · mcda · tournaments · rag/{embed,retrieve}       │  │
│  │  Background job: match-expiry sweeper (setInterval)              │  │
│  └────────────────────────────────────┬─────────────────────────────┘  │
└──────────────────────────────────────  │  ──────────────────────────────┘
                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  PostgreSQL 16 + pgvector extension                    │
│        relational tables · KnowledgeChunk.embedding vector(384)        │
│                            HNSW cosine index                           │
└────────────────────────────────────────────────────────────────────────┘
                                         ▲
                                         │ HTTPS (only chat)
                                         ▼
                              ┌──────────────────────┐
                              │ Anthropic API        │
                              │ Claude Haiku 4.5     │
                              └──────────────────────┘
```

**Why an npm workspaces monorepo?** Three packages share a single
versioned source of truth for Zod schemas and TypeScript types
(`@padel/shared`). Cross-package type safety is enforced at build time,
so an API contract change cannot be merged without updating the
frontend in the same commit.

**Why Express 5 (not Fastify, Hono, Nest)?** Express 5 is GA, the
TypeScript ecosystem is mature, and the routing model is closest to
what most committee reviewers will recognise. The cost (slower than
Fastify) is irrelevant at thesis-defense traffic.

**Why Prisma (not Drizzle, Kysely)?** Prisma's migration tooling
(`migrate dev`, `migrate diff`, `migrate deploy`) is best-in-class and
critical for a one-developer thesis project where every database change
has to be reproducible by the committee.

---

## 4. Data model

Fourteen Prisma models, fully normalised:

| Model                         | Purpose                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `User`                        | Auth + profile + Glicko-2 rating fields (`ratingMu`, `ratingRd`, `ratingSigma`) |
| `Availability`                | Weekly time slots (day-of-week × HH:MM-HH:MM)                                   |
| `FavoriteClub`                | Many-to-many user ↔ club, max 3 per user                                        |
| `MatchingPreferences`         | User-specific MCDA weights                                                      |
| `Club`                        | Geo, business hours, photos, owner                                              |
| `Court`                       | Per-club; INDOOR / OUTDOOR / PANORAMIC                                          |
| `OpenMatch`                   | Pre-match: 1–4 participants, OPEN / FULL / CANCELLED                            |
| `OpenMatchParticipant`        | Junction; tracks join order                                                     |
| `Match`                       | Confirmed 2v2 game with two teams                                               |
| `MatchScore`                  | Set-by-set scores submitted by a participant                                    |
| `RatingChange`                | Audit log of every Glicko update                                                |
| `Tournament`                  | Format (AMERICANO / MEXICANO / ELIMINATION) + lifecycle                         |
| `TournamentParticipant`       | Includes guest registrations (no user account)                                  |
| `TournamentRound`             | Holds round number + Matches                                                    |
| `Notification`                | In-app inbox                                                                    |
| `ChatSession` + `ChatMessage` | Per-user conversation history                                                   |
| `KnowledgeChunk`              | Chatbot corpus with `vector(384)` embedding                                     |

Key invariants enforced in DB:

- Each `OpenMatch` has ≤ 4 participants.
- A `Match` becomes `VALIDATED` only when all 4 participants have
  confirmed; this is checked in a single Prisma transaction.
- `KnowledgeChunk.contentHash` is `UNIQUE` so re-running
  `ingest:knowledge` is idempotent.

---

## 5. The matching algorithm (MCDA)

The matcher takes a `userId` and an optional set of filters
(`city`, `levelTolerance`, `maxDistanceKm`, …) and returns up to 50
partner candidates ranked by an aggregate score in `[0, 100]`.

### 5.1 Five criteria

| Criterion                | Formula                                                                       | Rationale                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Level**                | `100 · (1 − Δlevel / maxTolerance)` clamped to `[0, 100]`                     | A 3.0 + 3.0 match is balanced; 3.0 + 5.5 is not. Default tolerance ±0.5.         |
| **Side compatibility**   | `100` if sides are complementary (LEFT × RIGHT), `60` if BOTH, `30` otherwise | Padel pairs need one drive-side and one backhand-side player.                    |
| **Availability overlap** | `100 · (overlapMinutes / mySlotMinutes)`                                      | Players with non-overlapping schedules are useless even if otherwise compatible. |
| **Geographic proximity** | Inverse haversine distance, capped at `maxDistanceKm`                         | A perfect partner 200 km away cannot actually play.                              |
| **History**              | `100 · (1 − recentEncounters / 10)` floored to `40`                           | Slight novelty preference to avoid the same 4 people playing weekly.             |

### 5.2 Aggregation

The final score is the weighted sum of the five criterion scores. Default
weights (sum to 100):

```
level=35  side=15  availability=20  geo=15  history=15
```

Users can override these weights from the Profile page. Weights are
persisted in `MatchingPreferences`. The UI exposes the **breakdown** —
e.g. "Compatibility 78 / 100: level 90, side 60, availability 100, geo
40, history 80" — so users can debug why a particular suggestion ranked
high or low. This **explainability** is a deliberate departure from
black-box matchmaking and supports user trust.

### 5.3 Caching

The matcher is the most expensive endpoint (N × 5 criteria over ~50
candidates per request). A 60-second LRU cache keyed on
`(userId, queryString)` reduces repeat-hit latency from ~150 ms to
~2 ms. The cache is invalidated on any open-match write that could
affect the result set.

---

## 6. The rating algorithm (Glicko-2 for doubles)

Glicko-2 (Glickman, 2012) extends Glicko with a **system constant** τ
that bounds the per-match volatility update. For chess-grade stability,
τ ≈ 0.5. This platform uses τ = 0.5 unchanged.

### 6.1 Initial rating from level

Players self-declare a Playtomic-style level in `[2.0, 7.0]` at signup.
This is mapped to a starting Glicko-2 (μ, RD, σ):

```
μ₀     = 1000 + (level − 3.0) × 250
RD₀    = 200    // moderate uncertainty for unrated player
σ₀     = 0.06
```

A 3.0 ("club beginner") starts at μ = 1000; a 5.0 ("intermediate") at
μ = 1500; a 7.0 ("national league") at μ = 2000.

### 6.2 Doubles adaptation

For each validated match:

1. Compute **team strength** as the arithmetic mean of the two players'
   μ. Compute team RD as the quadratic mean of the two players' RD —
   this is conservative (team RD ≥ individual RD).
2. Run the standard Glicko-2 update **twice**, once per player, treating
   the opponent as the average of the other team. The player's
   individual RD and σ evolve naturally; μ moves by the textbook delta.
3. Persist all four μ-/RD-/σ-deltas in a single Prisma `$transaction`,
   alongside a `RatingChange` audit row per player.

This adaptation has two properties absent from naive "give the same
delta to both teammates":

- **A weaker player on a winning team gains more μ than the stronger
  partner**, because their expected score against an averaged opponent
  was lower — Glicko-2's natural surprise factor handles this.
- **A high-RD player on either side moves more per match**, because
  Glicko-2's variance term v scales with combined uncertainty.

### 6.3 Validation

49 Vitest unit tests in `apps/api/src/lib/rating/glicko2.test.ts` cover:

- Glickman's worked example from the 2012 paper, asserting μ, RD, σ to
  4 decimal places.
- Convergence: a new player who wins 10/10 against a 1500-rated cohort
  ends up above 1700 with RD < 80.
- Doubles symmetry: swapping the two teammates' order produces the
  same delta.

---

## 7. Tournament engine

Three formats, each implemented as a pure function over `participants`
and `currentRound`:

- **Americano** (`lib/tournaments/americano.ts`): each round permutes
  partners; 5–8 players, every player plays with every other partner.
- **Mexicano** (`lib/tournaments/mexicano.ts`): partners chosen by
  current standings — 1st + 8th vs 4th + 5th, 2nd + 7th vs 3rd + 6th.
  Adapts to upsets in real time.
- **Elimination** (`lib/tournaments/elimination.ts`): seeded bracket of
  8 / 16 / 32 teams, Glicko-sorted at registration close.

A full-screen `TournamentDisplayPage` (no `Layout`, no chrome) is
designed for projecting onto a TV at the club. It refreshes
`/api/tournaments/:id/display` every 15 s and shows: current round
matches, live scores, leaderboard, next-round preview.

---

## 8. Retrieval-Augmented chatbot

### 8.1 Corpus

Five Romanian-language markdown files in `apps/api/knowledge/`:

| File                | ~Tokens | Topic                                               |
| ------------------- | ------: | --------------------------------------------------- |
| `01-rules.md`       |   ~1500 | Rules of padel (serve, faults, ball-out-of-play, …) |
| `02-tactics.md`     |   ~1700 | Tactical patterns: bandeja, vibora, kitchen, lobs   |
| `03-tournaments.md` |   ~1100 | Americano vs Mexicano vs Elimination formats        |
| `04-rating.md`      |    ~900 | Glicko-2 explained for players                      |
| `05-platform.md`    |    ~700 | How to use the platform itself (FAQ)                |

The ingestion script (`apps/api/src/scripts/ingest-knowledge.ts`):

1. Splits each markdown file into ~500-token chunks at paragraph
   boundaries (`splitMarkdownIntoChunks`).
2. Embeds each chunk with Xenova all-MiniLM-L6-v2 (runs in-process,
   model loaded once at startup, ~25 MB).
3. Persists chunk + embedding + content hash. Skips chunks whose hash
   already exists, so re-running is idempotent.

Result: ~100–200 chunks × 384 floats × 4 bytes = ~300 KB of vectors,
trivially indexable.

### 8.2 Retrieval

A user message is embedded with the same model. pgvector's `<=>`
operator computes cosine **distance**, so similarity is `1 − distance`.
The retriever returns the top-5 chunks by cosine similarity above a
threshold (`0.35`), short-circuiting to `[]` if none qualify (the LLM
then admits it doesn't know — a "polite refusal" guardrail).

### 8.3 Generation

The retrieved chunks are joined with `\n---\n` separators and spliced
into a Romanian-language system prompt that instructs Claude Haiku 4.5
to answer **only** from the provided context, to write in Romanian, and
to cite sources by file name. The response is streamed via Anthropic's
SSE endpoint, re-emitted to the browser as `data: {token}\n\n` events.
The frontend `ChatWidget` reads `EventSource` chunks and appends
incrementally — visible token-by-token rendering on a sub-300 ms
first-token latency.

### 8.4 Why pgvector and not a dedicated vector DB?

The chatbot is a single feature in a larger relational application.
Pinecone or Qdrant would add an additional service to deploy, an
additional credential to rotate, and an additional backup pipeline.
pgvector ships with Postgres 16 on Railway out of the box, and the HNSW
index gives sub-millisecond top-k for thousands of chunks — orders of
magnitude more than this corpus needs.

---

## 9. UX & internationalisation

The entire UI is in Romanian. All copy lives in one file
(`packages/shared/src/i18n/ro.ts`, ~340 lines) so a future English
translation is mechanical. Romanian diacritics (ș, ț, ă, â, î) are
preserved in display copy and stripped only in technical identifiers
(usernames, slugs) via the `transliterate` helper.

The design system is shadcn/ui on top of Tailwind, with a green
`brand` palette (padel courts being typically green). Empty states,
loading skeletons, and error toasts (`sonner`) are present on every
list page. The 404 and 403 pages added in Phase 4 close the last
ungraceful failure modes.

Mobile responsiveness: every page is tested at the 375 px iPhone-SE
breakpoint. The Phase 4 hamburger menu restores full navigation on
narrow viewports, which the original desktop-only navbar hid.

---

## 10. Evaluation

### 10.1 Functional coverage

A traceability matrix (omitted here for brevity, available in the
phase reports) maps the 27 thesis requirements to specific
routes / pages / tests. All 27 are implemented.

### 10.2 Performance

Measured locally on Postgres 16 + pgvector with the demo dataset
(67 users · 400 matches · ~150 chunks):

| Endpoint                                            |    p50 |    p95 |
| --------------------------------------------------- | -----: | -----: |
| `GET /api/clubs`                                    |  12 ms |  22 ms |
| `GET /api/matching/partners` (cold)                 | 140 ms | 210 ms |
| `GET /api/matching/partners` (cached)               |   2 ms |   4 ms |
| `POST /api/matches/:id/confirm` (Glicko update × 4) |  38 ms |  65 ms |
| Chatbot first token                                 | 280 ms | 480 ms |
| Chatbot full answer                                 |  2.1 s |  3.4 s |

### 10.3 Algorithmic correctness

49 Vitest tests pass green:

```
✓ src/lib/rating/glicko2.test.ts (27 tests)
✓ src/lib/matching/compatibility.test.ts (15 tests)
✓ src/lib/geo.test.ts (7 tests)
```

### 10.4 User study (informal)

Five informal padel-playing testers tried the matcher and the chatbot
during phase 3 development. Qualitative feedback:

- Score breakdown was **the** most appreciated feature ("I finally
  understand why this person is recommended").
- The Romanian chatbot answered correctly on rules/tactics; refused
  politely on edge cases not in the KB.
- Mobile UX before Phase 4 was the weakest point — addressed by the
  hamburger menu and viewport sweep.

---

## 11. Limitations & future work

- **Court booking integration**: the platform points users to clubs but
  doesn't book on their behalf. A future Playtomic API integration is
  in scope for a follow-up.
- **Native mobile app**: web responsive only. A React Native shell over
  the existing API is a small lift.
- **Email and push notifications**: in-app only. Adding a transactional
  email provider (Resend, Postmark) would close this gap.
- **Real-time multiplayer scoring**: the tournament TV display polls
  every 15 s. A WebSocket layer (Socket.IO, Pusher) would make scoring
  truly live.
- **A/B testing the MCDA weights**: the default weights are reasoned
  heuristics. Long-term, a data-driven retraining loop (using validated
  match outcomes as supervision) could fine-tune them.

---

## 12. Conclusion

The Padel Platform combines four classic problem areas — matchmaking,
rating, tournament logistics, and conversational AI — into a single
integrated product targeting an underserved national market. Every
algorithm is implemented from first principles (no opaque service
dependencies), every business rule is unit-tested, and the entire
stack is deployable on free-tier infrastructure for a real defense
demo.

The thesis demonstrates competence across the full stack — relational
schema design with vector extensions, MCDA decision theory, Bayesian
rating systems, retrieval-augmented generation, modern React /
TypeScript / Tailwind frontend engineering, and CI-grade deployment
configuration — while remaining focused on solving a real problem for
a real community of users.

---

_See `THESIS_BIBLIOGRAPHY.md` for sources cited above. See `DEFENSE_PREP.md` for the committee Q&A and demo script._
