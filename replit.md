# ExamHub

A full-stack Computer-Based Testing (CBT) platform where students register, take timed exams, and review results — and admins manage subjects, exams, questions, students, and view analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/cbt-app run dev` — run the React frontend (port 19478, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild shared lib declarations (run after changing `lib/db`)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (served under `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Frontend: React + Vite + shadcn/ui + Tailwind CSS + wouter
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — all Drizzle table definitions (users, subjects, exams, questions, attempts, saved-answers, results)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for the API)
- `lib/api-client-react/src/generated/` — generated React Query hooks (from codegen)
- `lib/api-zod/src/generated/` — generated Zod schemas for server-side validation
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — JWT-style token auth middleware
- `artifacts/cbt-app/src/pages/` — all React pages (student/* and admin/*)
- `artifacts/cbt-app/src/hooks/use-auth.tsx` — auth context + token management

## Architecture decisions

- Auth uses base64-encoded tokens (not JWT) stored in `localStorage` as `cbt_token`; injected via `setAuthTokenGetter` in `main.tsx`
- Passwords hashed with SHA-256 + static salt (`cbt_salt_2024`) — simple for a CBT demo, not production-grade
- Exam auto-submit fires when the countdown timer reaches 0 (client-side); answers are auto-saved every 500ms via debounce
- `tsc --build` on libs required after any schema change before leaf artifact typechecks pass
- The API server routes are all under `/api` prefix, matched by the reverse proxy

## Product

- **Landing page** — marketing page with "Get Started" and "Admin Login" CTAs
- **Student auth** — register / login with email+password
- **Student dashboard** — stats (total exams, completed, passed, avg score) + recent results + available exams
- **Browse Exams** — list all active exams with subject, duration, question count
- **Exam Instructions** — pre-exam briefing with rules and exam metadata
- **Exam Take** — timed exam with auto-save, question navigator sidebar, submit dialog
- **My Results** — paginated list of all completed exams with score and pass/fail badge
- **Result Detail** — full question review showing correct/incorrect/unanswered answers
- **Admin Dashboard** — platform stats + recent results + per-exam pass rate bars
- **Admin Subjects** — CRUD for exam subjects
- **Admin Exams** — CRUD for exams with subject/duration/passing-score configuration
- **Admin Questions** — per-exam question management with multiple choice editor
- **Admin Students** — view all registered students with attempt counts, delete student
- **Admin Results** — view all results across all students

## Seeded test accounts

- **Admin:** `admin@examhub.com` / `admin123`
- **Student:** `alice@student.com` / `student123`
- **Student:** `bob@student.com` / `student123`

Seeded exams: Basic Algebra (8 questions), English Grammar (6), General Science (7)

## User preferences

_Populate as needed._

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before running the API server typecheck
- The `useGetMe` and other hooks require `queryKey` to be passed explicitly in the `query` option (the generated UseQueryOptions type is not `Partial`)
- ExamTake page is full-screen (no StudentLayout wrapper) — intentional

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
