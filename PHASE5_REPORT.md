# PHASE 5 — Pre-defense additions

Five targeted features requested by the thesis advisor after the
Phase-4 demo. Each is a strictly additive change — nothing in Phases
0-4 was rewritten — and each landed in its own commit so the history
stays bisectable.

| Part | Commit    | What it adds                                                                                                                                                 |
| ---- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A    | `a56c75f` | CSV export for the player report (`/api/reports/player/:userId/export.csv` + UI button).                                                                     |
| B    | `93ae192` | New `padel-equipment.md` KB document (~2 600 words RO) + chatbot system-prompt update.                                                                       |
| C    | `927b231` | Date-range picker + per-section sort & search on the admin report; new `topPlayers` field on the DTO.                                                        |
| D    | `61128a5` | Full admin user-management panel — list, detail, suspend / unsuspend / reset password / edit, plus suspension enforcement in login + `requireAuth`.          |
| E    | `807b33f` | Photo galleries on every club page, owner/admin upload UI with client-side compression, lightbox with keyboard nav, schema migration `photos String → Json`. |

---

## Part A — CSV export for player statistics

**New endpoint.** `GET /api/reports/player/:userId/export.csv` reuses
`buildPlayerReport` for authorization (self-or-admin) then projects the
DTO into a flat multi-section CSV.

**Format.** UTF-8 BOM at the head so Excel renders Romanian diacritics
correctly. Sections (`# header`, `## Sumar`, `## Meciuri pe tip`,
`## Top parteneri`, `## Top adversari`, `## Top cluburi`,
`## Istoric rating`) are separated by blank rows. CSV cells follow
RFC 4180 escape rules — implemented in `apps/api/src/lib/csv.ts` and
covered by 13 Vitest unit tests (`csv.test.ts`).

**Frontend.** "Exportă CSV" button next to the report title on
`/reports/player`. Uses axios `responseType: 'blob'`, parses the
filename from `Content-Disposition`, triggers download via
`URL.createObjectURL`, shows a spinner during the request.

**Deviations from plan.** Win-rate cells are rendered as `50.0%` rather
than the spec's `0.638` because the underlying DTO already stores
percentages in 0-100 — preserving that range avoids ambiguity for users
reading the file in Excel.

---

## Part B — Equipment knowledge for the chatbot

**New document.** `apps/api/src/knowledge-base/padel-equipment.md`
(~2 600 words, Romanian). Covers: racket shapes (rotundă / lacrimă /
diamant), materials (carbon density, EVA / FOAM cores), weight bands,
rough vs smooth surfaces, recommended brands in RO market, beginner /
intermediate / advanced choices with budget bands, balls (FIP-approved
makes), shoes (clay-omni tread, why running shoes fail), grips (tacky
/ dry / perforated), accessories (paletero, edge tape, epicondylitis
strap), Romanian retailers, buying tips, anti-counterfeit warnings.

**Ingestion.** Re-running `npm run ingest:knowledge` inserts **57 new
chunks** under the `equipment` category. Total KB now **230 chunks**
across 7 categories.

**Chatbot.** System prompt updated to explicitly mention equipment +
re-brand `Padel Platform Romania` → `PadelHub Romania`.

**Diagnostics.** Two throwaway scripts added under `prisma/scripts/`:

- `check-kb-chunks.ts` — prints chunk counts per category.
- `check-kb-retrieval.ts` — runs four sample queries through the
  retriever and prints the top-3 hits.

Sample retrieval at HEAD:

```
"Ce rachetă să-mi iau ca începător?"
  0.664  [equipment/padel-equipment.md]  …Forma rachetei…
"Care e diferența dintre o rachetă rotundă și una diamant?"
  0.632  [equipment/padel-equipment.md]  …Forma rachetei…
"De ce nu pot juca cu pantofi de tenis?"
  0.483  [equipment/padel-equipment.md]  …Pantofi…
"Cât costă o rachetă bună?"
  0.542  [equipment/padel-equipment.md]  …Rachete…
```

---

## Part C — Admin report filters & sorting

**Backend DTO.** `AdminReportDto.topPlayers` (top 25 by match count in
the selected period, with username, full name, match count, Glicko
rating, win rate). The service derives the list from the same
`allMatches` array it already loads, so the new field costs one extra
pass at zero query cost.

**Date range.** `?from=&to=` was already supported on the existing
admin endpoint. The new UI sends those params; changing the dates
re-fetches.

**Frontend.** A new `SortControls` helper component wraps a shadcn
`<Select>` + an up/down direction toggle and is reused across three
cards:

- **Top cluburi** — sort by match count or A-Z, plus a search box that
  filters the list client-side.
- **Top orașe** — sort by user count or A-Z.
- **Cei mai activi jucători** (new card) — sort by Meciuri / Rating /
  Win rate / Alfabetic, plus name+username search.

All sort & filter state is local `useState`; the date range triggers a
real refetch. URL params were left out by design — they bloat the URL
when an admin reshuffles columns repeatedly. Three quick presets at
the top (last 7 / 30 / 90 days) cover the common needs.

---

## Part D — Admin user management

The biggest part by surface area, in two halves.

### Backend

**Schema migration** `20260519072828_add_user_suspension`:

- `User.isSuspended Boolean @default(false)`
- `User.suspendedAt DateTime?`
- `User.suspendedReason String?`
- `User.suspendedBy String?` (admin userId, no FK to keep deletes
  simple; the detail endpoint resolves the display name lazily)

The HNSW index on `KnowledgeChunk.embedding` was preserved (the
spurious `DROP INDEX` that `prisma migrate diff` always emits when the
schema contains an `Unsupported<vector(384)>` column was removed
manually from the migration SQL, with an inline comment explaining
why).

**New endpoints**, all under `/api/admin/users`, gated by
`requireAuth + requireRole('ADMIN')`:

| Method | Path                  | Body / query                                                |
| ------ | --------------------- | ----------------------------------------------------------- |
| GET    | `/`                   | `search?, role?, status?, sortBy?, sortDir?, page?, limit?` |
| GET    | `/:id`                | —                                                           |
| PATCH  | `/:id`                | `firstName? lastName? email? role? isVerified?`             |
| POST   | `/:id/suspend`        | `{ reason: string }` (3-500 chars)                          |
| POST   | `/:id/unsuspend`      | —                                                           |
| POST   | `/:id/reset-password` | `{ confirm: true }`                                         |

The reset-password endpoint generates a 12-character password from an
unambiguous alphabet (no 0/O, 1/l/I) so admins can read it aloud over
the phone. The plaintext is returned exactly once.

**Auth enforcement.**

- `authService.login` rejects suspended non-admin accounts with HTTP
  403 and a clear Romanian message including the reason.
- `requireAuth` middleware is now async — on every authenticated
  request it does a single indexed `SELECT id, isSuspended, isActive,
role` and rejects suspended non-admins immediately, so revoking a
  token isn't necessary.

**Notifications.** Suspending or unsuspending creates a `GENERIC`
notification for the user. (We re-used the existing enum rather than
adding `ACCOUNT_SUSPENDED` / `ACCOUNT_REACTIVATED` values — that would
have needed another migration just for the enum, which we judged not
worth the cost. The notification title + body convey the information
clearly.)

### Frontend

- **shadcn AlertDialog primitive** (`@radix-ui/react-alert-dialog` +
  `apps/web/src/components/ui/alert-dialog.tsx`).
- `pages/admin/AdminUsersListPage.tsx` — sticky filter toolbar (search,
  role, status, sort, direction), paginated table of 20/page, four
  status badges (Activ / Suspendat / Neverificat / Dezactivat),
  row click → detail.
- `pages/admin/AdminUserDetailPage.tsx` — Profile + Activity cards
  left, Actions sidebar right. Three confirmation `AlertDialog`s:
  suspend (with reason field, ≥3 chars required), unsuspend (simple
  confirm), reset password (warns the new password appears once). A
  red banner appears above the cards while suspended, an amber banner
  with the temp password appears after a successful reset.
- Self-suspend is blocked at both ends — UI disables the button, API
  returns 400.

Smoke tests (admin token, against Neon):

```
GET    /api/admin/users               → 67 users, paginates
GET    /api/admin/users?search=maria  → 1 hit (maria_c)
GET    /api/admin/users/:id           → full detail with lastMatchAt
POST   /api/admin/users/:id/suspend   → isSuspended=true + notification
POST   /api/auth/login as suspended   → 403 with reason
POST   /api/admin/users/:id/unsuspend → can log in again
POST   /api/admin/users/:id/reset-password {}            → 400
POST   /api/admin/users/:id/reset-password {confirm:true} → 12-char pwd
GET    /api/admin/users as PLAYER     → 403
```

---

## Part E — Club photo galleries

**Schema migration** `20260519080000_photos_to_jsonb`:

- `Club.photos` was a `String` column holding JSON-encoded URL arrays.
  Now native `jsonb` of objects `{ url, category, caption?, order }`.
- Backfill uses `jsonb_array_elements_text WITH ORDINALITY` to map
  each `"url"` to `{url, category:'MAIN', order: idx-1}`.

**Storage choice.** Base64 data URLs in the jsonb column. This is
intentional tech debt: Cloudinary / S3 is the right answer for
production. Reasoning for choosing base64 here:

1. Thesis demo deploys to Neon-only — zero extra credentials, zero
   extra services.
2. Client-side compression (1200 px longest edge, JPEG q=0.8) keeps
   each photo well under 1 MB; the 5-photo cap means a fully populated
   club row stays under 5 MB.
3. The migration path to a CDN is straightforward — the existing
   service layer hides the storage detail behind `ClubPhotoDto.url`,
   so a future job can rewrite the URL field without touching the
   frontend.

**New endpoints**:

| Method | Path                                | Auth           |
| ------ | ----------------------------------- | -------------- |
| POST   | `/api/clubs/:id/photos`             | ADMIN or owner |
| DELETE | `/api/clubs/:id/photos/:photoIndex` | ADMIN or owner |
| PATCH  | `/api/clubs/:id/photos/reorder`     | ADMIN or owner |

Server enforces the 5-photo cap and the 2 MB / data-URL-shape Zod
validation. Reorder rejects non-permutations. `express.json` body
limit raised to 3 MB to fit the compressed payloads.

**New shared types**: `PHOTO_CATEGORIES` enum (MAIN / COURTS /
LOCKER_ROOM / FACILITIES / EXTERIOR), `ClubPhotoDto`, `MAX_CLUB_PHOTOS`,
and the two Zod schemas. `ClubDto.photoObjects: ClubPhotoDto[]` was
added alongside the existing `photos: string[]` (URLs only) so legacy
UI like `ClubCard` and the Leaflet markers still render unchanged.

**New frontend components**:

- `lib/imageCompress.ts` — 80-line FileReader + canvas compressor.
  Returns the compressed data URL plus original/encoded byte counts so
  the upload modal can show "1.4 MB → 220 KB" feedback.
- `components/clubs/PhotoLightbox.tsx` — shadcn Dialog with ← / → /
  Esc keyboard nav, prev/next buttons, category label, optional
  caption, thumbnail strip at the bottom.
- `components/clubs/ClubPhotoGallery.tsx` — public gallery; layout
  adapts to photo count (1 = hero, 2 = side-by-side, 3+ = hero + 2×2
  grid with a `+N` overflow tile).
- `components/clubs/ClubPhotoManager.tsx` — admin/owner panel below
  the map: upload modal (file → compress → preview → submit), per-row
  up/down reorder buttons (we chose buttons over drag-and-drop to
  avoid a `@dnd-kit` dependency for a 5-item list), delete with
  AlertDialog confirm, "n din 5" counter.

Smoke tests (admin token, against Neon):

```
GET    /api/clubs                         → photoObjects[] present
POST   /api/clubs/:id/photos              → 201, photo appended
POST   x6 to hit cap                       → 4th request returns 400
DELETE /api/clubs/:id/photos/<idx>         → 200, order re-compacted
PATCH  /api/clubs/:id/photos/reorder       → 200 with new permutation
```

**Deviations from plan**:

- Drag-and-drop reorder replaced with up/down arrow buttons (simpler;
  no extra dependency).
- The single club detail page hosts both the public gallery and the
  owner manager (gated by role check). The plan mentioned separate
  `/clubs/:slug/manage` and `/admin/clubs/:id` pages — co-locating
  them on the existing page is a strictly smaller change and avoids
  duplicating the surrounding club summary UI.

---

## Updated metrics

- LOC delta this phase: ~2 100 new lines, ~50 modified (excluding
  generated Prisma client).
- Migrations: 2 new (`add_user_suspension`, `photos_to_jsonb`),
  3 total in `prisma/migrations/`.
- Tests: 13 new (CSV escape unit tests), total 62 passing.
- Knowledge base: 230 chunks across 7 categories.
- npm dependencies added: `@radix-ui/react-alert-dialog` (web).

## Known tech debt

1. **Base64 photo storage** — Cloudinary / S3 should replace this for
   production. Service-layer interface won't change.
2. **No DnD photo reorder** — fine for 5-item caps; revisit if the cap
   is raised.
3. **Suspension cache** — `requireAuth` does a fresh `SELECT` on every
   request. At demo scale it's free, but a 5-second LRU on `userId`
   would be the obvious next step.
4. **Notification enum** — suspend / unsuspend events ride on the
   `GENERIC` enum value. A future migration could add
   `ACCOUNT_SUSPENDED` / `ACCOUNT_REACTIVATED` types for cleaner
   filtering on the bell.

---

_Sfetcu Vlad-Andrei — Phase 5, May 2026._
