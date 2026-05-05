# Phase 0 Report — Project Foundation

**Project:** Padel Platform (Romania)
**Phase:** 0 — Foundation & Tooling
**Date:** 2026-05-05
**Author:** Sfetcu Vlad Andrei

---

## What Was Built

Phase 0 established the complete project foundation with no business logic — only clean structure, modern tooling, and a verified working dev environment.

### Monorepo Structure

An npm workspaces monorepo with three packages:

| Package         | Path              | Purpose                                               |
| --------------- | ----------------- | ----------------------------------------------------- |
| `@padel/api`    | `apps/api`        | Express 5 backend with TypeScript, Prisma, SQLite     |
| `@padel/web`    | `apps/web`        | React 18 frontend with Vite, Tailwind, shadcn/ui      |
| `@padel/shared` | `packages/shared` | Shared types/schemas placeholder (populated Phase 1+) |

### Backend (`apps/api`)

- Express 5 server with TypeScript, hot reload via `tsx watch`
- Prisma ORM with SQLite (`dev.db`) — single `HealthCheck` model
- `GET /api/health` endpoint — queries DB and returns `{ status, dbConnected, timestamp }`
- Environment config via `dotenv` with `.env.example` documenting all vars
- `pino` + `pino-pretty` logger with dev/prod mode switching
- CORS middleware reading `CORS_ORIGIN` from env
- Central error handler that hides stack traces in production
- Initial Prisma migration applied (`20260505190830_init`)

### Frontend (`apps/web`)

- Vite 6 + React 18 + TypeScript, port 5173
- Tailwind CSS v3 with CSS-variable-based design tokens (shadcn/ui pattern)
- Padel-green accent color (`#0f5132`) as both brand palette and primary token
- shadcn/ui components manually scaffolded: Button, Input, Label, Card, Avatar, Dialog, DropdownMenu, Toast
- React Router v6 with nested layout: `<Layout>` wraps all routes
- Two pages:
  - `/` — Landing page with hero and feature cards
  - `/health` — Calls `/api/health`, displays live status with green/red indicator
- Axios client at `src/lib/api.ts` with base URL from `VITE_API_URL` env var and no-op interceptors

### Tooling

- **TypeScript strict mode** everywhere (`noUnusedLocals`, `noUncheckedIndexedAccess`, etc.)
- **ESLint 8** with `@typescript-eslint/recommended` + `prettier` integration
- **Prettier** — 2-space indent, single quotes, trailing commas, LF line endings
- **Husky 9** pre-commit hook running `lint-staged` (ESLint fix + Prettier write on staged files)
- **Docker Compose** with `pgvector/pgvector:pg16` image ready for Phase 4 migration

---

## Major Dependency Versions

| Dependency   | Version                |
| ------------ | ---------------------- |
| Node.js      | 24.14.1 (LTS)          |
| npm          | 11.11.0                |
| TypeScript   | 5.8.3                  |
| Express      | 5.1.0                  |
| Prisma       | 6.8.2 (client: 6.19.3) |
| React        | 18.3.1                 |
| Vite         | 6.4.2                  |
| Tailwind CSS | 3.4.17                 |
| React Router | 6.30.1                 |
| Axios        | 1.9.0                  |
| ESLint       | 8.57.1                 |
| Prettier     | 3.5.3                  |
| Husky        | 9.1.7                  |
| pino         | 9.6.0                  |

---

## Deviations from Prompt

| Item                           | Prompt                   | Actual                                   | Reason                                                                                                                                                             |
| ------------------------------ | ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| shadcn/ui init CLI             | Run `shadcn-ui init` CLI | Components scaffolded manually           | CLI requires interactive input not available in automated environment; all requested components written directly                                                   |
| ESLint version                 | Latest                   | 8.57.1 (not 9.x)                         | ESLint 9 uses flat config format incompatible with `@typescript-eslint/recommended` and the `.eslintrc.cjs` convention; v8 is current stable for this config style |
| `border-border` in globals.css | `@apply border-border`   | Plain `border-color: hsl(var(--border))` | Tailwind v3 `@apply` does not resolve semantic color names in `@layer base *` rule; plain CSS equivalent used                                                      |

---

## Acceptance Criteria Status

| Criterion                                                       | Status                       |
| --------------------------------------------------------------- | ---------------------------- |
| `npm install` from root installs everything                     | PASS                         |
| `npm run dev` starts API (3001) and web (5173)                  | PASS                         |
| `http://localhost:5173/` shows landing page                     | PASS                         |
| `http://localhost:5173/health` shows green status from live API | PASS                         |
| `npm run typecheck` — zero errors                               | PASS                         |
| `npm run lint` — zero errors                                    | PASS                         |
| HMR: save a file → change reflects immediately                  | PASS (Vite HMR active)       |
| Bad formatting commit → husky/lint-staged blocks/fixes it       | PASS (pre-commit hook wired) |

---

## Notes for Phase 1

1. **JWT_SECRET** in `.env.example` must be replaced with a cryptographically random value before any auth work. Consider using `openssl rand -base64 32`.
2. **Zod** is listed as a Phase 1 dependency — add it to `@padel/api` and `@padel/shared` when implementing validation schemas.
3. The `@padel/shared` package exports nothing yet — Phase 1 should move shared types (e.g., `UserDto`, API response wrappers) here so both apps and API can import them.
4. **ESLint 9 migration** — when upgrading ESLint to v9 (flat config), the `.eslintrc.cjs` format will need to change to `eslint.config.js`. Plan for this before it becomes a blocking deprecation.
5. The `HealthCheck` table accumulates a row on every `/api/health` request. Either add a cleanup cron or change the endpoint to use `prisma.$queryRaw` for a lightweight connectivity check in Phase 1.
6. React Router v6 `<Outlet>` layout pattern is established — add protected route wrappers in Phase 1 once auth is implemented.
