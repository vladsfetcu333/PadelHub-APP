# Phase 1 — Implementation Report

> **Scope:** authentication, padel-aware player profiles, clubs module with geolocation, and the initial UI layer for all three.

## What was built

### Database (Prisma · SQLite)

Replaced the Phase 0 `HealthCheck` placeholder with the full Phase 1 domain model:

- **User** — account + personal + padel-specific columns (`padelLevel`, `preferredSide`, `dominantHand`, `playStyle`, `playFrequency`, `goal`), matching preferences (`prefMaxLevelDiff`, `prefGenderFilter`, `prefAge{Min,Max}`, `prefRequireGoalMatch`), settings (`notifyByEmail/InApp`, `profileVisibility`), Glicko-2 defaults (`glickoRating=1500`, `glickoRD=350`, `glickoVolatility=0.06`), role, coach flag, status.
- **Availability** — one-to-many slots per user with `dayOfWeek` (0–6) and `HH:mm` strings.
- **Club** — geo (`latitude`/`longitude`), facilities booleans, `photos` and `businessHours` stored as JSON strings (SQLite has no JSON type), `ownerId → User` for the CLUB_OWNER flow, `isVerified` admin gate.
- **Court** — type (`PANORAMIC` / `TRADITIONAL` / `SINGLE_PADEL`), location (`INDOOR` / `OUTDOOR`), surface, dual pricing (regular + peak), `isActive`.
- **UserFavoriteClub** — composite key `(userId, clubId)`; the 3-max rule is enforced at the service layer (a DB CHECK can't express "≤ 3 per user").
- Enums + indices on `Club.city` and `(latitude, longitude)` for the geo prefilter.

Migration: `20260505191807_init` — clean, no drift.

### Backend (`apps/api`)

- **`lib/jwt.ts`** — sign/verify wrapper, 7-day expiry, `{ userId, role }` payload.
- **`lib/password.ts`** — bcryptjs at 10 rounds.
- **`lib/userDto.ts`** — `toPublicUser` / `toSelfUser` mappers; the public DTO never includes `email`, `phone`, `dateOfBirth`, or any `pref*` fields.
- **`lib/clubDto.ts`** — DTO with safe JSON parsing for `photos` / `businessHours`, optional `distanceKm` when geo-query was used.
- **`lib/geo.ts`** — `haversineKm` + `bboxAround`. The list query uses a bounding-box `WHERE` pre-filter (cheap) and Haversine post-refinement (exact) so SQLite stays responsive without needing trigonometry in SQL.
- **`lib/httpError.ts`** — `HttpError` class + helpers (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`); the error handler renders these as `{ error: { message, details? } }`.
- **`middleware/auth.ts`** — `requireAuth` reads `Authorization: Bearer …`; `requireRole(...roles)` composes after auth.
- **`middleware/validate.ts`** — `validate(schema, source='body')` parses with Zod, stores the result on `req.body` (for body) and always on `req.validated.{body|query|params}` (because Express 5 makes `req.query` read-only; a `valid<T>(req, source)` helper reads it back).
- **`middleware/errorHandler.ts`** — branches on `ZodError` → 400 with `flatten()` details; on `HttpError` → its status + message; else 500 with stack hidden in production.

Routes:

- `auth.ts`: register, login, logout (no-op for stateless JWT), `me`, change password, password-reset stub (responds 200 always to avoid leaking existence).
- `users.ts`: profile patch, availabilities CRUD, favorite-clubs add/remove with 3-max, public-or-self lookup (soft-reads the JWT to give richer DTO to the owner).
- `clubs.ts`: filtered/paginated list, slug detail, role-gated CRUD, court subroutes, admin verify.

### Shared package (`@padel/shared`)

- `constants/enums.ts` — string-literal const arrays mirroring Prisma enums (kept in sync manually), plus `PADEL_LEVELS`, `MAX_FAVORITE_CLUBS=3`, `MIN_AGE_YEARS=14`, `BIO_MAX_CHARS=200`.
- `schemas/auth.ts` — `RegisterSchema` (14+ year refinement, password complexity, level step check, all Romanian error messages), `LoginSchema`, `ChangePasswordSchema`, `RequestPasswordResetSchema`.
- `schemas/profile.ts` — `UpdateProfileSchema` (`.partial()` with age-range refinement), `AvailabilityBaseSchema` / `AvailabilitySchema` (with `start<end` refinement) / `AvailabilityUpdateSchema` (partial + refinement) — three exports because `.partial()` doesn't exist on `ZodEffects`.
- `schemas/club.ts` — `ClubCreate/UpdateSchema`, `CourtCreate/UpdateSchema`, `ClubListQuerySchema` with `z.coerce.number()` for query-string params.
- `types/api.ts` — `PublicUserDto`, `SelfUserDto` (extends Public), `AvailabilityDto`, `CourtDto`, `ClubDto` (with optional `distanceKm`), `ClubListResponse`, `AuthResponse`.
- `i18n/ro.ts` — Romanian copy strings, single tree (`ro.auth.*`, `ro.clubs.*`, `ro.enums.gender.MALE`, etc.) so any page can pull labels without ad-hoc translation.

### Frontend (`apps/web`)

Components:

- shadcn primitives: `Button`, `Input`, `Label`, `Card`, `Avatar`, `Dialog`, `DropdownMenu`, `Toast`, `Select`, `Tabs`, plus a `Sonner` `Toaster`.
- Padel primitives: `PadelLevelBadge` (4-tier colour by level), `PreferredSideIndicator` (arrow icons + drive/revés tooltip), `CourtTypeBadge`.
- Clubs: `ClubCard`, `ClubsMap` (Leaflet + OSM tiles, default-icon path fix for Vite).
- Profile: `EditProfileForm`, `AvailabilityEditor` (7-day grouped view), `MatchingPreferencesForm`.
- Routing: `RouteGuards` (`RequireAuth`, `RequireRole`) handle the `hydrating` state gracefully.

State + axios:

- `store/auth.ts` — Zustand store with `{ user, status, hydrate, login, register, logout, setUser }`. Persists token in `localStorage`; on app mount `hydrate()` calls `/api/auth/me` and falls back to `guest`. A response interceptor watches for `401` and triggers silent logout.

Pages:

- `/` Landing (Romanian copy, adaptive CTAs).
- `/login`, `/register` (4-step wizard with stepper UI, per-step `form.trigger` validation).
- `/clubs` list — sidebar filters (city / type / indoor) + "Lângă mine" geolocation (25 km radius, falls back to user city on denial), list-vs-map view toggle, distance pill on cards, loading skeletons, admin/owner "Adaugă club" shortcut.
- `/clubs/:slug` detail — verified badge, favorite toggle with toast errors (handles the 3-max from the server), admin "Verifică" button (only renders if `!isVerified`), courts table with peak pricing, facilities checklist, embedded OSM map.
- `/clubs/new` (RequireRole ADMIN/CLUB_OWNER) — full create form.
- `/profile` — two tabs (Profil / Disponibilitate și preferințe), avatar + level badge + side indicator header, deep-link via `?tab=availability` from header dropdown.
- `/profile/:username` — public profile honoring server-side visibility (a 403 from PRIVATE shows up as a friendly amber notice).

## Versions of major dependencies

| Package                 | Version                                |
| ----------------------- | -------------------------------------- |
| node                    | 24.14.1 (LTS local; engines.node ≥ 20) |
| prisma / @prisma/client | 6.19.3                                 |
| express                 | 5.1.0                                  |
| jsonwebtoken            | 9.0.2                                  |
| bcryptjs                | 2.4.3                                  |
| zod                     | 3.24.x                                 |
| react / react-dom       | 18.3.1                                 |
| vite                    | 6.4.2                                  |
| tailwindcss             | 3.4.17                                 |
| react-hook-form         | 7.56.4                                 |
| @hookform/resolvers     | 5.0.1                                  |
| zustand                 | 5.0.4                                  |
| axios                   | 1.9.0                                  |
| react-leaflet / leaflet | 4.2.1 / 1.9.4                          |
| sonner                  | 2.0.3                                  |
| husky / lint-staged     | 9.1.7 / 15.5.1                         |

## Deviations from the prompt (and why)

1. **`@db.Text` removed from the schema.** Flagged before starting: that attribute is PostgreSQL/MySQL-only and SQLite (Phase 0 non-negotiable) rejects it. Length limits (e.g. `Bio` ≤ 200) are still enforced through Zod. A TODO comment at the top of `schema.prisma` reminds us to restore it on Phase 4's Postgres migration.
2. **`DATABASE_URL` is `file:./dev.db`** (not `file:./prisma/dev.db`). Prisma resolves relative SQLite paths from the `schema.prisma` directory, so the original value created a nested `prisma/prisma/dev.db`. Fixed in both `.env` and `.env.example`.
3. **`req.validated` instead of mutating `req.query`.** Express 5 made `req.query` a read-only getter, so the original "reassign back" pattern silently no-ops and downstream code sees the raw strings. The validate middleware now stores the parsed value at `req.validated.<source>` and a `valid<T>(req, source)` helper reads it back. `req.body` is still reassigned directly (it's writable).
4. **rootDir removed from `apps/api/tsconfig.json`.** TypeScript wouldn't allow imports from `@padel/shared` while `rootDir: "src"` was set. The package paths still work because `include: ["src"]` controls the entry surface.
5. **`AvailabilitySchema` split into three exports** (`Base`, refined create, partial+refined update) because `ZodEffects` (anything that has `.refine`) has no `.partial()`.
6. **`zodResolver` cast on `NewClubPage`** — schemas with `.default()` produce input/output types that mismatch `Resolver<T>` constraints. Cast through `Resolver<ClubCreateInput>`; runtime behaviour is unchanged.
7. **`FRIENDS_ONLY` profile visibility = PUBLIC for now.** Friendships are Phase 2 — the enum value is accepted and stored, just not yet enforced differently from PUBLIC.

## Gotchas / things to watch in Phase 2

- **Leaflet markers under Vite** require setting `L.Marker.prototype.options.icon` to an explicit `L.icon` (CDN paths used) because the bundler doesn't preserve the default URL lookup. Already handled in `ClubsMap.tsx`.
- **`migrate reset`** is blocked at the Prisma CLI level on the agent shell for safety. To recreate the DB cleanly, delete `apps/api/prisma/dev.db` manually and re-run `db:migrate`. The seed is idempotent so it's safe to re-run.
- **JSON columns (`photos`, `businessHours`) as strings** are tolerated through `safeJsonArray/Object` parsers. Once we move to Postgres in Phase 4, switch these to native `Json` and drop the wrappers.
- **The `users.ts` public profile route soft-reads the JWT** (decodes if present, ignores if missing/invalid) so the response can include private fields when the caller is the profile owner. If we later add real RBAC for friend graphs, this branch is the place to extend.
- **`MAX_FAVORITE_CLUBS=3` is enforced in the service layer**, not the DB. A user pounding the endpoint at the rate limit could in theory race past it (count → check → insert). Not a real concern for thesis traffic, but worth noting for a production hardening pass.

## Acceptance criteria — status

| Criterion                                            | Status                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Register new user with full padel profile via UI     | ✅ multi-step wizard, validates per step                                |
| Log in and see profile                               | ✅ JWT in localStorage, hydration on mount                              |
| Edit profile and have changes persist                | ✅ `EditProfileForm` PATCHes and refreshes store                        |
| Set weekly availability                              | ✅ `AvailabilityEditor` create/delete                                   |
| Browse clubs, filter by city/type/indoor, see on map | ✅ list + Leaflet map toggle                                            |
| View club detail page                                | ✅ courts, facilities, map, contact                                     |
| Favorite up to 3 clubs (error on 4th)                | ✅ verified end-to-end (toast: "Poți avea maxim 3 cluburi favorite")    |
| Use "Lângă mine" with browser geolocation            | ✅ 25 km radius + city fallback                                         |
| Admin can create + verify clubs                      | ✅ `/clubs/new` + verify button                                         |
| Player gets 403 on admin-only endpoints              | ✅ `Insufficient role`                                                  |
| Zod validation works end-to-end                      | ✅ field-level Romanian errors on register, availability time, club geo |
| `npm run typecheck` passes                           | ✅ zero errors                                                          |
| `npm run lint` passes                                | ✅ zero errors                                                          |
| Seed populates exactly the expected data on fresh DB | ✅ admin + 5 players + 10 clubs (idempotent upserts)                    |
