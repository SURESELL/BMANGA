# PlannerVids — Data Model

Full source of truth: `prisma/schema.prisma`. This is a map of it, grouped
by concern, not a duplicate of every field.

## Identity & workspace

- **User** — email, name, `passwordHash` (Argon2id), lockout fields
  (`failedLoginAttempts`, `lockedUntil`). One row in V1.
- **Workspace** — name, slug, `timezone` (default `Europe/Paris`). One row
  in V1 (`slug: "default"`).
- **WorkspaceMember** — join table, `RoleName` (`ADMIN` / `EDITOR` /
  `VIEWER`). Only `ADMIN` is used in V1; the other two exist so
  multi-user rollout doesn't need a schema change.

## Brands (the isolation boundary)

- **Brand** — name, slug (unique per workspace), logo, colors, languages.
  Every content-bearing table below FKs to `Brand.id`.
- **BrandGuideline** ("Brand Brain") — one-to-one with Brand. Positioning,
  mission, audiences, personas, tone, vocabulary, forbidden phrases/topics,
  CTAs, hashtags, competitors, disclaimers, affiliation rules, editorial
  ratios (`{ expertise: 60, authority: 20, engagement: 10, commercial: 10 }`
  as JSON), etc. The AI Content Studio (Phase 3) must load this before
  generating anything for a brand.
- **PublishingCadence** — `(brandId, platform)` unique, `perWeek` (default
  2). Backs the per-brand, per-platform frequency from spec section 6.

## Social accounts

- **SocialAccount** — brand + platform (`SocialPlatform` enum: LINKEDIN,
  FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE, plus X / PINTEREST / THREADS /
  BLUESKY / GOOGLE_BUSINESS reserved for later), status
  (CONNECTED/DISCONNECTED/TOKEN_EXPIRING/ERROR), permissions, last sync.
- **SocialCredential** — one-to-one with SocialAccount. `encryptedAccessToken`
  / `encryptedRefreshToken` (AES-256-GCM ciphertext, never plaintext),
  scopes, expiry. Never selected into a client-facing response by default.

## Products & affiliation

- **Product** — brand-scoped, `ProductType` enum (EBOOK, KDP_BOOK,
  TRAINING, SAAS, APP, SERVICE, DIGITAL_PRODUCT, AFFILIATE, OTHER), price/
  currency, affiliate URL + commission + network, audience/country/language.
- **AffiliateLink** — destination URL, unique `slug` (backs the `/go/{slug}`
  redirector), UTM fields, `isAffiliate` / `isSponsored` /
  `disclosureRequired` flags (spec section 15), optional start/end dates.
- **ClickEvent** — one row per measured click (link, brand, optional
  post/platform, timestamp, hashed IP, UA, referrer).
- **Conversion** — `ConversionSource` enum (IMPORTED / API / DECLARED) and
  an explicit `isVerified` boolean. The schema makes "we measured a click"
  and "someone told us about a sale" structurally different facts — the UI
  must never blend them into one "revenue" number without saying which kind
  it is.

## Editorial pipeline

- **Campaign** — brand-scoped, optional date range.
- **ContentIdea** — brand-scoped, optional campaign/product,
  `EditorialCategory` enum (EXPERTISE, EDUCATION, PROBLEM, SOLUTION,
  AUTHORITY, PROOF, BEHIND_THE_SCENES, CASE_STUDY, ENGAGEMENT, PRODUCT,
  OFFER, CTA — the rotation-engine categories from spec section 12).
- **ContentMaster** — the platform-agnostic source: title, language
  (FR/EN), category, `ContentStatus` (the full workflow enum: DRAFT →
  GENERATED → AWAITING_APPROVAL → APPROVED → SCHEDULED → PUBLISHING →
  PUBLISHED, plus FAILED / CANCELLED / NEEDS_REVISION side states).
- **ContentVariant** — one row per `(ContentMaster, platform)`: its own
  hook, body, title, description, hashtags, CTA, link, media references,
  format, scheduled time, affiliate/sponsorship disclosure. This is what
  makes "don't just copy the same post to every network" (spec section 5)
  a schema fact, not a UI convention.

## Media & Short Factory

- **MediaAsset** — brand-scoped (nullable — some assets are
  workspace-level), `MediaType` enum, `storageKey` (object storage path,
  resolved to a URL at read time — DB never stores the bytes).
- **VideoTemplate** — brand-scoped or global, `kind` (corporate /
  educational / breaking_fact / listicle / problem_solution / product /
  quote / storytelling / before_after / cta), `config` JSON (logo
  placement, fonts, colors, animation, subtitle style, intro/outro).
- **VideoProject** — brand-scoped, optional link to a ContentMaster and a
  VideoTemplate, `VideoProjectStatus` enum, script + voice-over script,
  aspect ratio (default `9:16`).
- **VideoScene** — ordered scenes within a VideoProject: text, media
  reference, duration, transition (ken_burns/pan/zoom/cut/fade), subtitle.

## Publishing pipeline

- **Post** — one per `(ContentVariant)` (1:1), brand, platform, status,
  `scheduledAt`/`publishedAt`, and a **unique** `idempotencyKey`
  (`@default(uuid())`) — the DB-level guarantee behind "never publish the
  same content twice" (spec section 30). See
  `tests/integration/idempotency.test.ts`.
- **Approval** — decision (APPROVED/REJECTED/NEEDS_REVISION), note, who
  decided, when. Attached to a Post or directly to a ContentMaster (for
  bulk "approve the week" flows that act before per-platform posts exist).
- **PublicationAttempt** — one row per attempt at publishing a Post,
  **unique per `(postId, attemptNumber)`**, its own idempotency key,
  request/response payloads, structured error code/message. The retry
  policy (spec section 31) increments `attemptNumber`; it can never create
  two attempts at the same number for the same post.
- **PlatformPost** — the result of a successful publish: provider post ID,
  provider URL, raw response. **Unique per `(socialAccountId,
  providerPostId)`** — the second DB-level anti-duplication guarantee: even
  if the app layer somehow tried to record the same provider post twice
  (e.g. after an ambiguous network response), the constraint rejects it.

## Analytics

- **AnalyticsSnapshot** — brand + platform + captured-at, with every metric
  (`impressions`, `reach`, `views`, `likes`, `comments`, `shares`, `saves`,
  `clicks`, `followers`) as a nullable `Int`. `null` means "this platform
  doesn't report this metric for this object," and the UI must render it as
  "unavailable," never coerce it to `0` (spec section 33) — see
  `/app/dashboard`'s Performance section for the current placeholder text
  making that promise explicit ahead of Phase 9 wiring it up for real.

## AI generation & cost

- **AiGeneration** — one row per generation call: brand, user, kind (TEXT/
  IMAGE/TTS/VIDEO), provider name, prompt, cost estimate.
- **AiCost** — the budget ledger: workspace + optional brand, category
  (llm/image/tts/video/storage/other), cost in cents, timestamp. Backs
  `/app/ai-costs`.

## Operational

- **Notification** — workspace + optional user, kind, title/body, read
  flag.
- **AuditLog** — workspace + optional user + optional content master,
  `action` (login/logout/connect_account/generate/approve/
  edit_after_approval/schedule/publish/fail/delete/settings_change),
  entity type/id, JSON metadata. Backs `/app/logs`.
- **Setting** — `(workspaceId, key)` unique, JSON value. Generic
  workspace-level config store (e.g. future default cadence overrides)
  that doesn't need its own table per setting.

## Cascade design

Every table that hangs off `Brand` or `Workspace` cascades on delete, so
removing a brand or the workspace cleans up everything under it in one
statement. Every *optional* foreign key to something outside that direct
chain (e.g. `ContentIdea.campaignId`, `AiGeneration.userId`,
`AuditLog.contentMasterId`) is `onDelete: SetNull` rather than left to the
database default — otherwise deleting, say, a Campaign would be silently
blocked by an unrelated ContentIdea still pointing at it. This is exercised
by `tests/integration/*.test.ts`, which create real rows and delete a whole
workspace via cascade as part of cleanup.
