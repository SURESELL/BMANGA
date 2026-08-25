# PlannerVids — Status

Phase numbering follows the master spec's execution plan (section 48).

## Phase 0 — Audit & Architecture: done

- Audited `suresell/bmanga`: found it already hosts a complete, unrelated
  product (PREUVIA DUERP). Confirmed with the product owner that
  PlannerVids should be bolted on as a second, fully isolated app rather
  than merged into or replacing it — see `docs/ARCHITECTURE.md`.

## Phase 1 — Foundation: done

- Next.js 15 (App Router) + TypeScript strict + Tailwind, isolated at
  `plannervids/` with its own `package.json`.
- Full Prisma schema (`prisma/schema.prisma`) covering every table listed
  in spec section 38, migrated against a real PostgreSQL database (not
  just `prisma validate`).
- Auth: email + Argon2id password, JWT session cookie, login lockout after
  5 failed attempts, `/app/*` protected by both middleware and a
  server-side layout check. No `/signup`.
- Navigation shell: all 16 sections from spec section 42, light/dark theme.
- Provider abstractions for every external capability (`lib/providers/*`),
  each defaulting to a "not configured" implementation — the app is fully
  usable with zero API keys.
- Feature flags (`lib/feature-flags.ts`), visible on `/app/settings`.
- Security headers, encrypted-at-rest credential storage helper
  (`lib/crypto.ts`), audit logging (`lib/audit.ts`, `/app/logs`).
- Dev-only demo seed (4 brands, 1 admin) + a separate production-safe
  `scripts/create-admin.ts` that creates no demo data.
- Docker (`Dockerfile`, `docker-compose.yml`, standalone Next.js output).
- Tests: 15 passing (Vitest, against a real `plannervids_test` Postgres
  database) — password hashing, credential encryption round-trip/tamper
  detection, DB-level anti-duplication constraints (unique idempotency
  key, unique `(postId, attemptNumber)`, unique
  `(socialAccountId, providerPostId)`), and brand isolation (two brands in
  one workspace, asserting no cross-brand leakage on accounts, content, or
  Brand Brain).
- `tsc --noEmit`, `eslint`, `npm test`, `npm run build` all pass clean.
- Manually verified end-to-end in a real headless browser (not just unit
  tests): unauthenticated redirect to `/login`, wrong-password rejection,
  successful login → dashboard, dashboard's real DB-backed counts, brand
  list showing all 4 seeded brands, Brand Brain edit-and-persist, creating
  a new brand without disturbing the others, theme toggle, logout, and
  re-blocking `/app/dashboard` after logout.

## What's NOT built yet (intentionally, by phase)

Every nav item beyond Dashboard/Brands/AI Costs/Logs/Settings currently
shows an honest "Not yet implemented" placeholder naming the phase it
belongs to. In spec order:

- **Phase 2** (Brands): basic brand CRUD + Brand Brain editing exist
  already (built ahead of schedule since the seed step needed it). Brand
  Kit (logo/colors/typography upload) and full guideline UI (personas,
  competitors, reference docs, editorial ratios editor) are not built.
- **Phase 3** (Content): AI Content Studio, Content Masters, per-platform
  variants, Product Library, Campaigns UI. Schema exists; no UI/actions yet.
- **Phase 4** (Calendar): auto-fill engine, week/month/list views, drag &
  drop, the full approval workflow UI (Approve Week/Month), NEEDS_REVISION
  handling and approval-voiding-on-substantial-edit.
- **Phase 5** (Media): Media Library UI, `StorageProvider` real
  implementation (R2), Image Factory.
- **Phase 6** (Short Factory): script → storyboard → TTS → subtitles →
  FFmpeg/Remotion render → preview pipeline. `TemplateVideoProvider`
  interface exists; no renderer yet.
- **Phase 7** (Social connectors): zero platforms wired up yet. Per the
  spec's own rule, each one gets its official docs re-verified
  (endpoints/scopes/OAuth/media formats/limits/audit requirements)
  immediately before implementation, one platform at a time, in order
  LinkedIn → Meta/Facebook → Instagram → YouTube → TikTok.
- **Phase 8** (Automation): the actual scheduler (a process that publishes
  `APPROVED + SCHEDULED` posts on its own, independent of a browser tab
  being open), retries, notifications on failure. The DB-level
  anti-duplication guarantees it will rely on are already in place and
  tested (see above); the scheduler itself is not.
- **Phase 9** (Analytics): real per-platform metric collection.
  `AnalyticsProvider` interface and the null-not-zero `AnalyticsSnapshot`
  schema exist; no connector reports real data yet.
- **Phase 10** (Affiliation): `/go/{slug}` redirector, click tracking,
  conversion import, disclosure-presence validation before approval.
  Schema exists; no UI/routes yet.
- **Phase 11** (Hardening): broader test coverage, security audit pass,
  performance, deployment runbook.

## Environment variables needed to go further

See `plannervids/.env.example` for the full annotated list. Nothing is
required beyond `DATABASE_URL`, `AUTH_SECRET` and
`CREDENTIALS_ENCRYPTION_KEY` to run V1 as-is. Everything else
(`TEXT_AI_PROVIDER`, `IMAGE_AI_PROVIDER`, `TTS_PROVIDER`,
`STORAGE_PROVIDER`, the five social `*_CLIENT_ID`/`*_APP_ID` pairs) is
optional and gates a `FEATURE_*` flag off until it's actually configured.

## Recommended next milestone

**Phase 2 completion + start of Phase 3**: finish Brand Kit (logo/color
upload — needs a real `StorageProvider`, i.e. pull Phase 5's storage work
forward), then build the Product Library and a manual (no-AI-required)
Content Studio — a Content Master + per-platform Variant editor — so a real
piece of content can exist end-to-end in the UI before any AI or social
connector work begins. That keeps "the app works with zero API keys"
true while unblocking Phase 4 (Calendar), which needs real Posts to
schedule against.
