# Deployment Runbook

End-to-end guide for deploying the Padel Platform to production:

- **API (Express + Prisma + pgvector)** → Railway
- **Web (Vite + React)** → Vercel
- **Database (Postgres 16 + pgvector)** → Railway plugin

The whole stack runs on free tiers for a thesis defense demo
(Railway $5 trial credit, Vercel Hobby plan).

---

## 0. Prerequisites

- A GitHub account with the repo pushed (Railway + Vercel both pull from GitHub).
- A Railway account: <https://railway.app/>
- A Vercel account: <https://vercel.com/>
- An Anthropic API key for the chatbot (optional — chatbot stays offline without it): <https://console.anthropic.com/>
- The `gh` CLI or the GitHub web UI to push.

If the repo isn't pushed yet:

```bash
# from the project root
git remote add origin git@github.com:<your-user>/padel-platform.git
git push -u origin main
```

---

## 1. Database — Railway Postgres + pgvector

Railway's stock Postgres image already includes the `vector` extension; the
init migration enables it automatically. No manual `CREATE EXTENSION` needed.

1. Open Railway → **New Project** → **Provision PostgreSQL**.
2. After it boots, click the database service → **Variables** tab → copy
   `DATABASE_URL`. (Format: `postgresql://postgres:<pwd>@<host>:<port>/railway`.)
3. (Optional) Open the **Data** tab and run a quick smoke query:
   ```sql
   SELECT extname FROM pg_extension WHERE extname = 'vector';
   ```
   If it returns no row, run `CREATE EXTENSION vector;` manually — the
   init migration will then succeed on first deploy.

---

## 2. API — Railway Service

The repo includes `railway.toml` at the root, so Railway auto-detects
the build / start / migrate commands.

1. In the same Railway project → **+ New** → **GitHub Repo** → select
   the padel-platform repo.
2. Railway creates a service named after the repo. Open it → **Settings**:
   - **Root Directory**: leave blank (monorepo root).
   - **Watch Paths** (optional): `apps/api/**`, `packages/shared/**`, `prisma/**`.
3. Open **Variables** and add:
   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` _(reference variable — Railway autocompletes)_ |
   | `JWT_SECRET` | output of `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `ANTHROPIC_API_KEY` | `sk-ant-…` (optional) |
   | `CORS_ORIGIN` | will be filled in after Vercel deploy (e.g. `https://padel.vercel.app`) |
   | `NODE_ENV` | `production` |

   Leave `PORT` unset — Railway injects it.

4. Click **Deploy**. The build runs:
   ```
   npm ci --include=dev
   npx prisma generate --schema apps/api/prisma/schema.prisma
   npm run build -w packages/shared
   npm run build -w apps/api
   ```
   Then before start:
   ```
   npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
   ```
   Then:
   ```
   npm run start -w apps/api
   ```
5. Health-check `/api/health` should return `{ "status": "ok" }`. Open
   the **Deployments** tab → click the latest deploy → **View logs** to
   confirm `API running on http://localhost:<port> [production]`.
6. Open **Settings → Networking** → **Generate Domain** to get a public
   URL like `padel-api-production.up.railway.app`. Note it down — you'll
   plug it into Vercel next.

### 2.a Seeding the database (one-off)

After the first successful deploy the schema exists but tables are
empty. To load the demo data:

```bash
# Locally, point DATABASE_URL at the Railway DB:
$env:DATABASE_URL = "postgresql://postgres:...@...railway.app:5432/railway"  # PowerShell
# export DATABASE_URL="postgresql://postgres:...@...railway.app:5432/railway"  # bash
npm run db:seed:demo -w apps/api
```

Or, faster, open the Railway service shell (top-right "Open Shell")
and run `npm run db:seed:demo -w apps/api` directly on the container.

### 2.b Knowledge-base ingestion (chatbot)

Once per environment, run the embedding ingestion script so the
chatbot has retrieval context:

```bash
npm run ingest:knowledge -w apps/api
```

This downloads the Xenova all-MiniLM-L6-v2 model on first run (~25 MB)
and writes 100-200 chunks with 384-dim embeddings into
`KnowledgeChunk`. The HNSW index is already in place from the init
migration so queries are sub-millisecond.

---

## 3. Web — Vercel

The repo includes `apps/web/vercel.json` with the install / build /
output commands wired up for the monorepo.

1. Vercel dashboard → **Add New… → Project** → import the repo.
2. In the import wizard:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Vite (auto-detected)
   - **Build & Output Settings**: leave on "Auto" — `vercel.json`
     overrides everything (install / build / output / SPA rewrites).
3. **Environment Variables**:
   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | the Railway API domain from step 2.6, e.g. `https://padel-api-production.up.railway.app` (no trailing slash) |

   Apply to **Production**, **Preview**, and **Development**.

4. Click **Deploy**. The build runs:
   ```
   cd ../.. && npm install
   cd ../.. && npm run build -w packages/shared && npm run build -w apps/web
   ```
   Output goes to `apps/web/dist`, served via Vercel's edge network.
5. Once deployed, copy the production URL (e.g.
   `https://padel-platform.vercel.app`).

---

## 4. Wire CORS

The API rejects requests from origins not listed in `CORS_ORIGIN`.

1. Back on Railway → API service → **Variables** → set:
   ```
   CORS_ORIGIN=https://padel-platform.vercel.app
   ```
   For staging + production both:
   ```
   CORS_ORIGIN=https://padel-platform.vercel.app,https://padel-platform-git-main.vercel.app
   ```
   (Comma-separated — `parseCorsOrigin` in `apps/api/src/config/env.ts`
   handles it.)
2. Save → Railway redeploys automatically.

---

## 5. Smoke tests

From any browser:

1. `GET https://<railway-domain>/api/health` → `{"status":"ok"}`
2. `GET https://<railway-domain>/api/clubs` → array of 18 clubs.
3. Open `https://<vercel-domain>` → home page renders.
4. Log in as `andrei@example.com` / `password123` (seed-demo player).
5. Open the chatbot widget (bottom-right) and ask "Ce este bandeja?" —
   should stream a Romanian answer.

If any of these fail:

- 5xx from API → check Railway service logs.
- CORS error in browser console → `CORS_ORIGIN` mismatch; copy the
  exact origin from `window.location.origin`, including protocol, no
  trailing slash.
- Chatbot returns 400 "Anthropic API key not configured" → set
  `ANTHROPIC_API_KEY` on Railway.
- Chatbot returns empty answers → run `npm run ingest:knowledge -w apps/api`
  against the production DB.

---

## 6. Custom domain (optional)

### Vercel

1. Project → **Settings → Domains** → add `padel.example.ro`.
2. Add the CNAME record at your DNS provider per Vercel's instructions.

### Railway

1. Service → **Settings → Networking → Custom Domain** → add `api.padel.example.ro`.
2. Add the CNAME record at your DNS provider.
3. Update `VITE_API_URL` on Vercel and `CORS_ORIGIN` on Railway to use
   the new domains, then redeploy both.

---

## 7. Rolling back

- **API**: Railway → service → **Deployments** → click an older green
  deploy → **Redeploy**.
- **Web**: Vercel → project → **Deployments** → click an older deploy
  → **Promote to Production**.
- **DB**: Railway Postgres plugin has automatic daily backups on paid
  plans. On free tier, take a manual `pg_dump` before risky migrations:
  ```bash
  pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
  ```

---

## 8. Cost notes

For a thesis defense (a few hours of demo usage), the stack costs **$0**:

- Railway: $5 free trial credit covers Postgres + API for ~30 days at
  low traffic. After that, the cheapest plan is $5/month.
- Vercel Hobby: free for unlimited static + serverless deploys.
- Anthropic: pay-as-you-go. A defense Q&A session ($~$0.10$).

Idle the Railway services after defense:

```
Railway → service → Settings → Disable Service
```

---

_Last updated: phase 4, May 2026._
