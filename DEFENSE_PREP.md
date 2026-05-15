# Defense preparation

Anticipated committee questions, demo script, and last-minute checklist
for the thesis defense.

---

## 1. The 15-minute live demo script

### 1.1 Setup (before the defense starts)

- [ ] Open Railway dashboard in tab 1; both services show "active".
- [ ] Open `https://<vercel-domain>` in tab 2, logged out.
- [ ] Open `https://<vercel-domain>/login` ready to type
      `andrei@padel.local` / `player1234`.
- [ ] Open one of the in-progress tournaments at
      `/tournaments/:id/manage` (admin perspective) and another at
      `/tournaments/:id/display` (TV perspective) in tabs 3 and 4.
- [ ] Have `apps/api/knowledge/02-tactics.md` open in a code editor
      for the RAG fidelity demo.

### 1.2 Walkthrough (target 12 minutes; 3 minutes buffer)

**Minute 0–1: The problem.**
Open the Landing page. One sentence: "Padel is booming in Romania, but
the social layer — finding the right people to play with — is still on
WhatsApp. This thesis fills that gap."

**Minute 1–3: Authentication & profile.**
Register a brand-new test account in front of the committee (`@gmail.com`
for plausibility). Fill the padel-specific profile (level 4.0, left
side, weekday evenings). Highlight that **every field has a padel
reason** to exist.

**Minute 3–6: Matching with the new account.**
Log out, log back in as `andrei@padel.local`. Open `/matching`.
Show the **top 5 partner suggestions** with score breakdowns. Move the
"level" weight slider to 50 % and the geo to 5 % — observe the ranking
re-shuffle. Explain MCDA briefly (one sentence; section 5 of the thesis
has the math).

**Minute 6–8: Open match → match → rating.**
Open `/open-matches` → click a `PARTIAL` match → "Join". The match flips
to `FULL` and a `Match` row is created. (If pre-seeded data, instead
open a match in `PENDING_CONFIRMATION` from `/matches`.) Enter a score,
have a teammate confirm it (use a second browser/incognito as `maria@padel.local`).
On the 4th confirmation, point to **the rating delta on each player's
profile**.

**Minute 8–10: Tournaments.**
Switch to tab 3 — the admin view of an in-progress tournament. Show:

- Round 3 of 7 is current.
- Live scoreboard.
- Click "Start next round" → bracket regenerates per Mexicano logic.
  Switch to tab 4 — full-screen `/display` view. Explain that this is
  designed for projection onto a TV at the club.

**Minute 10–12: Chatbot.**
Open the floating chat widget. Ask: "Care e diferența între Americano
și Mexicano?" — watch the streamed Romanian answer. Then ask a deliberate
off-topic question: "Cine a câștigat Liga Campionilor în 2023?" — watch
the polite refusal ("nu pot răspunde din baza mea de cunoștințe").

If time permits, also ask "Ce este bandeja?" and side-by-side open
`02-tactics.md` to show the source the model is pulling from — proves
this isn't pretraining, it's retrieval.

---

## 2. Anticipated committee questions

Each question is followed by a 60-second answer.

### 2.1 Architecture & engineering

**Q: Why a monorepo and not three separate repos?**
_A:_ One source of truth for Zod schemas in `@padel/shared`. A breaking
API change can't be merged without updating both the frontend and the
backend in the same commit. With three repos this safety net disappears.

**Q: Why Prisma over a SQL builder like Drizzle or Kysely?**
_A:_ Migration tooling. `prisma migrate dev` and `prisma migrate deploy`
are the most mature in the Node ecosystem, which matters for a
one-developer project where every DB change has to be reproducible by
the committee. Trade-off: I lose typed access to the `vector` column
(`Unsupported<>`), which I handle with two raw-SQL helpers in
`retriever.ts` and `ingest-knowledge.ts`.

**Q: Why JWT in localStorage and not httpOnly cookies?**
_A:_ Simplicity for the thesis scope, and the frontend is a pure SPA so
the cookie cross-site issues don't apply. In production I would move to
httpOnly cookies with CSRF tokens; the JWT contents are identical, only
the transport changes.

**Q: How do you handle the "thundering herd" if 4 participants all
press 'confirm' at the same instant?**
_A:_ The `validateMatch` service wraps the four-confirmation check and
the Glicko-2 update in a single Prisma transaction with serializable
isolation. The first transaction to commit applies the ratings; the
other three see `status = VALIDATED` and short-circuit. There is no
double-application of rating deltas.

### 2.2 Algorithms

**Q: Why MCDA over a learned model?**
_A:_ Two reasons. First, **explainability** — a learned model gives a
single number, MCDA gives five labeled scores I can show the user.
Second, **cold-start** — there is no training data for a brand-new
platform. A weighted-sum starting point lets the system work on day
one and could be retrained later from real outcomes if needed.

**Q: How do you set the default MCDA weights?**
_A:_ They are reasoned heuristics informed by the five informal testers
in section 10.4. Level is highest because mismatch is the most common
complaint; availability is second because no overlap = no match. Users
can override every weight from their Profile page, and the rankings
update live.

**Q: Why Glicko-2 and not ELO or TrueSkill?**
_A:_ ELO doesn't model **uncertainty** — a 1500-rated player who's
played 5 games is treated identically to one who's played 500. Glicko-2
tracks RD (rating deviation) and σ (volatility), so new players' ratings
move quickly and stabilise as data accumulates. TrueSkill would also
work but it's Microsoft-patented for commercial uses and the math is
heavier; Glicko-2 is open and well-understood.

**Q: How do you handle the case where one player on a doubles team is
much stronger than the partner?**
_A:_ The team's μ is the arithmetic mean and RD is the quadratic mean,
so a strong + weak team has both lower μ than two strong players and
higher RD than two equally-strong players. After a win, the weaker
partner gains more μ than the stronger one because their expected score
against the averaged opponent was lower. This is Glicko-2's natural
behavior; I didn't have to engineer it specifically.

### 2.3 The chatbot

**Q: Why pgvector and not Pinecone / Weaviate / Qdrant?**
_A:_ The application already uses Postgres for relational data. A
single connection string, a single backup pipeline, no extra service to
deploy. With ~150 chunks and an HNSW index, top-k queries are
sub-millisecond — orders of magnitude more than this corpus needs.
At a million chunks I would reconsider.

**Q: Why all-MiniLM-L6-v2 and not OpenAI embeddings?**
_A:_ It runs in-process with no external API key, produces 384-dim
vectors (4× cheaper to store than OpenAI's 1536), and was trained on
Sentence-BERT data which is exactly the kind of short Q&A this corpus
contains. Quality difference at our scale is imperceptible.

**Q: Why Claude Haiku 4.5 and not GPT-4 or a local Llama?**
_A:_ Cost ($0.10 for a defense session) and **native Romanian
fluency** — Claude handles Romanian diacritics and grammar without
prompting workarounds. Local Llama 70B would also work but requires a
GPU on Railway, which doesn't fit the free-tier budget.

**Q: How do you prevent the chatbot from hallucinating?**
_A:_ Three guardrails:

1. The retrieval threshold (0.35 cosine similarity) returns `[]` when
   no chunk is close enough; the LLM then admits ignorance.
2. The system prompt explicitly instructs "answer ONLY from the
   provided context".
3. Every chunk has a `source` field; the model is asked to cite it.

### 2.4 Production & deployment

**Q: What happens if Railway goes down during the defense?**
_A:_ The app is fully deterministic and the demo seed is committed. I
have a backup local Postgres with the same data — I can switch
`VITE_API_URL` to my laptop's ngrok in under 60 s. I also have screen
recordings of the live flow.

**Q: How do you keep secrets out of git?**
_A:_ `.env` files are git-ignored. The repo only contains `.env.example`
with placeholder values. Production secrets live in Railway and Vercel
project settings.

---

## 3. Hard questions (the "trap" questions)

**Q: Is your rating system fair when a strong player only plays weak
opponents?**
_A:_ Glicko-2 self-corrects this. After many wins against weaker
opponents, the strong player's μ has risen to the point where wins yield
near-zero deltas. If they only ever play 1500-rated opponents, their μ
asymptotes at the level where they'd be expected to win those matches —
which is well below their true skill. The remedy is more diverse
opponent pools, which is itself **what the matcher tries to achieve**.

**Q: What stops two friends from gaming the rating by submitting fake
matches?**
_A:_ The 4-confirmation requirement (every participant must confirm) and
the 48-hour expiry. Two friends can boost each other but they would
need two additional confirmed accounts and would still be playing
real-looking matches in the database — the surface for collusion is
much smaller than e.g. allowing self-reported scores. A future
enhancement could add club-staff confirmation as a fifth signature for
tournament matches.

**Q: Why is there no booking integration?**
_A:_ Scope. Booking is a deep integration (Playtomic API + per-club
availability syncing + payment) and would consume an entire phase. The
thesis is about the **social** layer that Playtomic underserves. I link
out to the club for booking; a future iteration can integrate Playtomic
once their API is GA.

**Q: How would this scale to 100,000 users?**
_A:_ Four bottlenecks I'd address in order:

1. The matcher's 60-second cache is per-process; with multiple API
   instances I'd move it to Redis.
2. The Glicko update transaction holds a row lock; for high concurrency
   I'd queue updates and batch them in a background worker.
3. The chatbot's per-request Anthropic call would benefit from
   response caching at the (query-vector, top-k) level.
4. The reports endpoints currently scan; I'd materialise them into
   summary tables refreshed nightly.

---

## 4. Last-minute checklist (day-of)

- [ ] Laptop fully charged + charger in bag.
- [ ] Backup mobile hotspot in case venue Wi-Fi fails.
- [ ] HDMI / USB-C adapter for the projector.
- [ ] Two browser windows: one signed in, one anonymous.
- [ ] Phone fully charged for the second browser if needed.
- [ ] Local Postgres up (`docker compose up -d`) as fallback.
- [ ] `git log --oneline` open to show clean commit history.
- [ ] `THESIS_REPORT.md` rendered to PDF as backup.
- [ ] Coffee. Lots of coffee.

---

## 5. Closing statement (60 s)

> "What I built is not just a CRUD app — it's a system that solves a
> specific community's problem with five carefully chosen algorithms,
> each implemented from first principles and unit-tested. The Romanian
> padel community gets a tool, the committee gets a thesis defensible
> across full-stack engineering, decision theory, Bayesian rating
> systems, and retrieval-augmented generation. Thank you."

Then take questions.

---

_Compiled May 2026 · Updated immediately before defense._
