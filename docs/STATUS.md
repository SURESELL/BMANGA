# STATUS.md — PREUVIA DUERP

Dernière mise à jour : 2026-07-15 (session Phase 0).

Légende : ✅ Réel/opérationnel · 🟡 Partiel/scaffold · ⛔ Simulé/absent

## Phase 0 — Fondations

| Sous-lot | Statut | Détail |
|---|---|---|
| 0.1 Rebrand NORMIA → PREUVIA DUERP | ✅ | Toutes les occurrences renommées (package.json, env, UI, seed, palette exacte du spec §13) |
| 0.2 Authentification réelle (Argon2id, rate limit) | ✅ | `authorize()` vérifie réellement le mot de passe (faille critique corrigée) ; lockout 5 tentatives/15min ; forgot/reset password ; changement forcé via `/change-password` |
| 0.3 RBAC appliqué côté serveur | ✅ | `requirePermission()` branché sur toutes les routes de mutation (create/update/delete) : risks, duerp, action-plans, incidents, sites, users, documents, audits, qualiopi, haccp, environment, tmd, esg, non-conformities, epi, training (cours/modules/sessions/inscriptions) |
| 0.4 Config Stripe centralisée (liens officiels) | ✅ | `lib/billing/plans.ts`, 4 liens officiels exacts, `client_reference_id` + `prefilled_email` |
| 0.5 Plans/entitlements PREUVIA | ✅ | `lib/billing/entitlements.ts` : limites sites/users réellement appliquées côté serveur sur `POST /api/sites` et `POST /api/users/invite`, testées (DIAGNOSTIC 1 site/3 users, ESSENTIEL 1 site, PARTNER illimité) |
| 0.6 Webhook Stripe signé + idempotent | ✅ | `/api/webhooks/stripe`, signature brute vérifiée, `WebhookEvent` idempotent, gère checkout/subscription/invoice/charge ; **jamais testé avec une vraie clé Stripe (aucune fournie)** |
| 0.7 Scaffolding consultant multi-tenant | 🟡 | `ConsultancyWorkspace`/`ConsultantClientAccess` réels, testés IDOR ; API list/create/revoke fonctionnelle ; **aucune UI `/consultant/*`, aucune invitation, aucun mot de passe temporaire client** |
| 0.8 Proxy INSEE Sirene | ✅ (jamais appelé en conditions réelles) | Validation SIREN/SIRET+Luhn, cache, timeout, retries, mapping erreurs complet ; **aucune clé INSEE fournie, jamais testé contre l'API réelle** |
| 0.9 Outillage (eslint/vitest) + tests | ✅ | `eslint.config.mjs` fonctionnel (0 erreur sur tout le dépôt), Vitest configuré, 58 tests (IDOR, tenant isolation, auth, billing, INSEE, RBAC, entitlements) |
| 0.10 Migrations Prisma versionnées | ✅ | 7 migrations dans `prisma/migrations/`, `migrate deploy` testé sur base fraîche |

Build/lint/typecheck : `npm run build`, `npx eslint .`, `npx tsc --noEmit` tous verts en fin de session (voir résumé exécutif final).

## Documentation

`docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DATA_MODEL.md`,
`docs/DEPLOYMENT.md`, `docs/RUNBOOKS.md` créés (mandatés par `CLAUDE.md`,
aucun n'existait avant cette session sauf `STATUS.md`). Vulnérabilité
**critique** Next.js corrigée au passage (`next` 15.0.4 → 15.5.20, même
majeure, aucun changement de code nécessaire, build/lint/60 tests
re-vérifiés). Vulnérabilité critique restante : `vitest` (dépendance de
test uniquement, jamais expédiée en production, nécessite une montée de
version majeure non tentée à l'aveugle).

## Phases 1 à 8

Non commencées dans cette session. Voir `PLANS.md` pour le détail :
- Phase 1 (commercial/onboarding UI complet, Super Admin) — non commencée.
- Phase 2 (UI consultant complète, invitations, mots de passe temporaires) — non commencée, scaffold serveur seul (0.7).
- Phase 3 (DUERP versions immuables, workflow validation, exports PDF) — 🟡 immuabilité + chaîne de révision réelles (`validatedAt` verrouille `PATCH`, `POST /api/duerp/[id]/revise` crée une nouvelle version `DRAFT` liée via `previousVersionId`, testé) ; exports PDF non commencés.
- Phase 4 (fiches de poste, communication sécurité) — non commencée.
- Phase 5 (entreprises extérieures, permis de travail) — non commencée.
- Phase 6 (virement bancaire Stripe) — non commencée.
- Phase 7 (PREUVIA COPILOT) — non commencée, correctement désactivé par défaut (absent).
- Phase 8 (docs ARCHITECTURE/SECURITY/DATA_MODEL/DEPLOYMENT/RUNBOOKS, sauvegarde/restauration) — non commencée.

## Modules hérités (LMS, Qualiopi, HACCP, ICPE/TMD, ESG, Audits, Non-conformités)

✅ Conservés, renommés sous la marque PREUVIA, et leurs bugs de compilation
pré-existants (drift schéma/code) corrigés dans cette session pour que le
build passe. **Non développés fonctionnellement davantage** — hors périmètre
principal du spec PREUVIA DUERP mais non supprimés (décision propriétaire
du 2026-07-15).

## Secrets et intégrations restant à configurer avant toute mise en production

- `DATABASE_URL` (PostgreSQL réel — un DB de dev/test local a servi à cette session, jamais exposé).
- `NEXTAUTH_SECRET`.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*` (clés de test — **aucune clé fournie dans cette session**, webhook testé uniquement par relecture de code, pas par appel réel).
- `INSEE_API_KEY` (**aucune clé fournie**, proxy jamais appelé en conditions réelles).
- `RESEND_API_KEY` (sans clé, `lib/email.ts` journalise au lieu d'envoyer — comportement explicite, jamais un faux succès).
- `S3_*` (aucune intégration d'upload réelle — champs `fileUrl` seulement).
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (provider OAuth présent dans le code, jamais configuré).

## Risques de sécurité/conformité restants (voir aussi docs/REPOSITORY_AUDIT.md §6)

1. RBAC désormais appliqué à toutes les routes de mutation (coeur DUERP + modules hérités). Une faille IDOR inter-tenant réelle a été trouvée et corrigée au passage : `PATCH /api/training/.../enrollments` ne vérifiait aucune appartenance à l'organisation (voir `tests/integration/training-enrollment-isolation.test.ts`). Reste à auditer : les routes GET/liste ne filtrent que par organisation, pas par site/unité (portée fine par site — hors périmètre Phase 0).
2. Rate limiting en mémoire (single-instance) — à migrer vers un store partagé avant tout déploiement multi-instance.
3. Aucune UI de gestion des mots de passe temporaires consultant → client (Phase 2 non commencée) : le champ `User.mustChangePassword`/`passwordExpiresAt` existe déjà côté schéma pour l'accueillir.
4. `PREUVIA_DISCLAIMER`/mentions légales présentes dans le code mais pas d'audit juridique/RGPD/fiscal effectué (hors périmètre technique).

## En-têtes de sécurité HTTP (CSP/HSTS)

✅ `middleware.ts` + `lib/security-headers.ts` posent sur chaque réponse un
CSP à nonce par requête (`script-src 'nonce-...' 'strict-dynamic'`, aucun
`unsafe-inline`/`unsafe-eval` pour les scripts), HSTS 2 ans, `X-Frame-Options:
DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
Vérifié par build de production + navigation Chromium headless réelle
(`/`, `/login`, `/register`) : aucune violation CSP, aucune erreur
d'hydratation React. Testé unitairement (`tests/unit/security-headers.test.ts`).
Voir `docs/SECURITY.md` §8.5.

## Résultats des commandes (fin de session)

```
npx eslint .                 → 0 erreur
npx tsc --noEmit              → 0 erreur
npx vitest run                → 10 fichiers, 60 tests, tous passants
npm run build                 → succès (build de production complet)
npx prisma migrate deploy     → 7 migrations appliquées proprement sur base vierge
```
