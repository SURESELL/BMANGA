# PlannerVids — Architecture

## What this is

PlannerVids is an internal, single-admin "Social Media Command Center":
plan, generate, approve, publish and measure multi-brand content across
LinkedIn, Facebook, Instagram, TikTok and YouTube. V1 has exactly one
user account and no public signup — see [Repository placement](#repository-placement)
and [Security model](#security-model) below.

## Repository placement

This app lives at `plannervids/` inside `suresell/bmanga`, which already
hosts a separate, unrelated production app (**PREUVIA DUERP**, a QHSE/risk
compliance SaaS) at the repo root. That app was fully built and in active
use before this work started. Per an explicit decision at the start of this
project, PlannerVids is **bolted on as a second, fully isolated product**,
not merged into or replacing DUERP:

- Own `package.json`, own `node_modules`, own Next.js app — no shared
  dependencies or build with the root app.
- Own PostgreSQL database (`plannervids` / `plannervids_test`), own Prisma
  schema (`plannervids/prisma/schema.prisma`) — no shared tables, no shared
  Prisma client.
- Own routes, own auth, own Docker setup, own docs (this directory).
- The two apps can be deployed independently, on different ports/domains,
  and neither's code imports the other's.

Nothing under the repo root (`app/`, `lib/`, `prisma/`, etc. — DUERP's own
tree) was modified to build this.

## Stack

- **Framework**: Next.js 15 (App Router), React 18, TypeScript (strict).
- **Styling**: Tailwind CSS, `next-themes` for light/dark mode.
- **Database**: PostgreSQL via Prisma 5. UUID primary keys, timestamps,
  indexes on all brand/workspace-scoped foreign keys, cascading deletes
  designed so a workspace or brand can be fully removed without leaving
  orphaned rows (see `docs/DATA_MODEL.md`).
- **Auth**: Credentials only (email + password), Argon2id hashing, session
  as a signed JWT (`jose`) in an httpOnly/secure/SameSite=Lax cookie. No
  OAuth provider, no `/signup` route, no NextAuth dependency — the spec
  requires nothing beyond a single admin account for V1, so a small
  hand-rolled session layer is significantly less surface area than pulling
  in a full auth framework configured for a use case this app doesn't have.
- **Validation**: Zod on every server action and API route boundary.
- **Tests**: Vitest, run against a real Postgres test database
  (`plannervids_test`) — no mocked ORM. Social platform APIs are mocked
  wherever they're exercised (none are wired up yet in this phase).

## Multi-tenancy posture

V1 is single-admin, but `User` / `Workspace` / `WorkspaceMember` / `RoleName`
already exist and every brand-scoped table hangs off `Brand.workspaceId`.
Moving to multi-user or multi-workspace later means adding UI and
authorization checks on top of an already-correct data shape, not a schema
rewrite.

## Brand isolation

Every content-bearing table (`ContentMaster`, `ContentVariant`, `Product`,
`Campaign`, `SocialAccount`, `MediaAsset`, `AffiliateLink`,
`AnalyticsSnapshot`, ...) carries a `brandId`. There is no code path that
queries these tables without a brand (or workspace, for workspace-level
tables) filter — see `tests/integration/brand-isolation.test.ts`, which
creates two brands in one workspace and asserts a brand-scoped query never
leaks the other brand's accounts, content, or Brand Brain.

## Provider abstraction

Every external capability is behind an interface in `lib/providers/`, with
a "not configured" implementation as the default:

| Interface | Purpose | Default implementation |
|---|---|---|
| `TextAIProvider` | idea/hook/post/caption/script generation | `NullTextAIProvider` (throws `NotConfiguredError`) |
| `ImageGenerationProvider` | on-brand image generation | `NullImageGenerationProvider` |
| `TTSProvider` | voice-over synthesis | `NullTTSProvider` |
| `VideoProvider` | Short Factory rendering | `TemplateVideoProvider` (FFmpeg/Remotion-style, low-cost, default) vs. opt-in `ExternalGenerativeVideoProvider` (disabled unless `VIDEO_PROVIDER=external_generative`) |
| `StorageProvider` | media storage (S3-compatible, e.g. Cloudflare R2) | `NotConfiguredStorageProvider` |
| `SocialPublisher` | one implementation per platform | none yet — Phase 7 |
| `AnalyticsProvider` | per-platform metrics, `null` when unavailable | none yet — Phase 9 |

This is what makes "PlannerVids stays usable with zero AI keys configured"
(spec section 36) true by construction rather than by convention: nothing
in the manual workflows (create a brand, write content by hand, upload
media, schedule, mark published) depends on any of these providers.

## Feature flags

`lib/feature-flags.ts` reads `FEATURE_*` env vars, each additionally gated
on the relevant provider actually being configured (e.g. `FEATURE_AI_TEXT`
only reports enabled if `TEXT_AI_PROVIDER` is also set). Visible on
`/app/settings`.

## Cost control

`AiCost` rows (workspace + optional brand, category, cost in cents) back
the `/app/ai-costs` page, which computes month-to-date spend against
`AI_MONTHLY_BUDGET_CENTS` (default 2000 = €20.00). The 50/75/90% alert
thresholds and the configurable 100% hard stop are a Phase-3+ concern (they
gate AI generation calls, none of which exist yet) but the ledger and
budget-read path are live now.

## Security posture (V1)

- Argon2id password hashing; failed-login counter + 15-minute lockout after
  5 attempts, stored on `User`.
- Session JWT signed with `AUTH_SECRET` (min 32 chars, validated at
  startup via `lib/env.ts`), httpOnly/secure/SameSite=Lax cookie.
- `/app/*` is protected twice: `middleware.ts` (edge, cookie/JWT check) and
  `app/app/layout.tsx` (server component, re-checks the session) — a
  middleware matcher mistake alone can't leave the app open.
- OAuth tokens for social accounts are stored encrypted at rest
  (`lib/crypto.ts`, AES-256-GCM, `CREDENTIALS_ENCRYPTION_KEY`) — see
  `SocialCredential`. No decrypted token is ever meant to reach the
  frontend.
- Security headers (CSP, X-Frame-Options, etc.) applied to every response
  via `next.config.ts`.
- `AuditLog` records login/logout/settings changes/etc., scoped per
  workspace, visible at `/app/logs`.
- No secrets in git: `.env.example` / `.env.test.example` contain no real
  values; `.env*` (except the `.example` files) is gitignored at the repo
  root and covers this app too.

## What's deliberately not built yet

Every nav item that isn't Dashboard, Brands, AI Costs, Logs or Settings
renders an honest "Not yet implemented" placeholder (`components/ComingSoon.tsx`)
naming the phase it belongs to, rather than a fake or empty-looking
dashboard. See `docs/STATUS.md` for the phase-by-phase breakdown and
what's next.
