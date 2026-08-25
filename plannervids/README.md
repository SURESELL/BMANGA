# PlannerVids

Social Media Command Center — internal, single-admin content planning,
approval and publishing platform. See `docs/ARCHITECTURE.md`,
`docs/DATA_MODEL.md` and `docs/STATUS.md` for the full picture.

This app is fully independent from the PREUVIA DUERP app at the root of
this repository — see "Repository placement" in `docs/ARCHITECTURE.md`.

## Quickstart (local, no Docker)

```bash
cd plannervids
npm install
cp .env.example .env.local        # then fill AUTH_SECRET / CREDENTIALS_ENCRYPTION_KEY:
                                   #   openssl rand -base64 32   (run twice)

# Postgres running locally, database created:
#   createuser plannervids -P     (password: plannervids, or edit .env.local)
#   createdb plannervids -O plannervids

npm run db:migrate                # applies prisma/migrations
npm run db:seed                   # dev-only: 1 admin user + 4 demo brands
npm run dev                       # http://localhost:3100 (see package.json/next dev port)
```

The seed script prints the demo admin's email/password once. This is dev
data only — `prisma/seed.ts` refuses to run when `NODE_ENV=production`.

## Quickstart (Docker)

```bash
cd plannervids
cp .env.example .env.local        # fill AUTH_SECRET / CREDENTIALS_ENCRYPTION_KEY
docker compose up --build
```

## Production admin bootstrap

Never use `prisma/seed.ts` in production — it creates demo brands.
Instead:

```bash
ADMIN_EMAIL=you@example.com tsx scripts/create-admin.ts
```

Prints a generated password once (or set `ADMIN_PASSWORD` yourself). Fails
loudly if that email already has an account — it never overwrites one.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / run |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest against `plannervids_test` (see `.env.test.example`) |
| `npm run db:migrate` | Apply/create Prisma migrations (dev) |
| `npm run db:deploy` | Apply migrations (prod, no schema drift check) |
| `npm run db:seed` | Dev-only demo data |

## Running tests

```bash
cp .env.test.example .env.test.local   # separate DB, e.g. plannervids_test
createdb plannervids_test -O plannervids
DATABASE_URL=postgresql://plannervids:plannervids@localhost:5432/plannervids_test \
  npx prisma migrate deploy
npm run test
```

`tests/setup.ts` refuses to run if `DATABASE_URL` doesn't look like a test
database, as a guard against accidentally wiping dev/prod data.
