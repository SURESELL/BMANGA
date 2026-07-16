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
| 0.6 Webhook Stripe signé + idempotent | ✅ | `/api/webhooks/stripe`, signature brute vérifiée, `WebhookEvent` idempotent, gère checkout/subscription/invoice/charge ; résout désormais le **plan payé** via le Price ID de la ligne achetée (`resolvePlanFromPriceId`, bug corrigé — `Subscription.plan` restait à `DIAGNOSTIC` après un paiement réel) ; **jamais testé avec une vraie clé Stripe (aucune fournie)** |
| 0.7 Consultant multi-tenant | ✅ | `ConsultancyWorkspace`/`ConsultantClientAccess` réels, testés IDOR ; API list/create/revoke fonctionnelle ; UI `/consultant` + `/admin/consultancy-workspaces` (Phase 2, voir plus bas) ; provisionnement et mot de passe temporaire client opérationnels |
| 0.8 Proxy INSEE Sirene | ✅ (jamais appelé en conditions réelles) | Validation SIREN/SIRET+Luhn, cache, timeout, retries, mapping erreurs complet ; **aucune clé INSEE fournie, jamais testé contre l'API réelle** |
| 0.9 Outillage (eslint/vitest) + tests | ✅ | `eslint.config.mjs` fonctionnel (0 erreur sur tout le dépôt), Vitest configuré, 58 tests (IDOR, tenant isolation, auth, billing, INSEE, RBAC, entitlements) |
| 0.10 Migrations Prisma versionnées | ✅ | 7 migrations dans `prisma/migrations/`, `migrate deploy` testé sur base fraîche |

Build/lint/typecheck : `npm run build`, `npx eslint .`, `npx tsc --noEmit` tous verts en fin de session (voir résumé exécutif final).

## Documentation

`docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DATA_MODEL.md`,
`docs/DEPLOYMENT.md`, `docs/RUNBOOKS.md` créés (mandatés par `CLAUDE.md`,
aucun n'existait avant cette session sauf `STATUS.md`). Vulnérabilités
**critiques** corrigées : Next.js (`next` 15.0.4 → 15.5.20, même majeure,
aucun changement de code nécessaire) et `vitest` (2.1.8 → 4.1.10, montée de
version majeure, dépendance de test uniquement — les 80 tests existants
repassent sans modification, `vite-tsconfig-paths` retiré au profit du
support natif de Vite 6+). Reste 3 vulnérabilités **modérées** sur `postcss`,
vendorisée dans `next@15.5.20` — hors de notre contrôle, correctif
`npm audit` = rétrogradation cassante de Next.js, délibérément non appliqué.

## Phases 1 à 8

Non commencées dans cette session. Voir `PLANS.md` pour le détail :
- Phase 1 (commercial/onboarding UI complet, Super Admin) — non commencée.
- Phase 2 (UI consultant complète, invitations, mots de passe temporaires) — 🟡 boucle coeur opérationnelle : provisionnement d'un cabinet par le Super Admin (`/admin/consultancy-workspaces`, mot de passe temporaire du consultant principal), portefeuille client consultant (`/consultant`, création de client avec compte admin + mot de passe temporaire, révocation), vue d'ensemble client en lecture seule (`/consultant/clients/[organizationId]` — plan, dernier DUERP, risques par niveau, incidents ouverts), vérifié de bout en bout avec un vrai navigateur (workspace → connexion consultant → changement de mot de passe forcé → création client → connexion admin client → consultation de la vue d'ensemble → 404 sur un client non accessible). Restent non commencés : prospects/actifs/archivés, missions, échéances, rapports détaillés, équipe, modèles, marque blanche.
- Phase 3 (DUERP versions immuables, workflow validation, exports PDF) — 🟡 immuabilité + chaîne de révision réelles (`validatedAt` verrouille `PATCH`, `POST /api/duerp/[id]/revise` crée une nouvelle version `DRAFT` liée via `previousVersionId`, testé) ; exports PDF non commencés.
- Phase 4 (fiches de poste, communication sécurité) — ✅ `JobRiskSheet` (poste/EPI/formations/risques requis) et `SafetyCommunication` (affiches/flashs, cycle brouillon→publié→dépublié, `validate` requis pour publier), UI `/prevention`, disclaimer légal, IDOR-testés, vérifiés en navigateur réel. Le module EPI/vérifications périodiques (VGP) existant porte aussi désormais `PREUVIA_DISCLAIMER` sur `/epi`. **Non fait** : matrice de compétences, rondes/inspections/causeries — aucun modèle de données, non commencés.
- Phase 5 (entreprises extérieures, permis de travail) — ✅ `ExternalCompany`/`WorkPermit`/`PreventionPlan`, cycle de vie complet et testé (DRAFT→ISSUED→SUSPENDED→ISSUED→CLOSED), UI `/external-companies`, vérifié en navigateur réel. Manque : protocoles de chargement/déchargement (aucun modèle), signature électronique réelle (attestation déclarative uniquement), UI de création des plans de prévention (API prête).
- Phase 6 (virement bancaire Stripe) — 🟡 `POST /api/billing/bank-transfer` (émission facture `send_invoice`, statut `PENDING_PAYMENT`, `Subscription.pendingPlan`), activation via `invoice.paid` uniquement, testé (`tests/integration/bank-transfer-billing.test.ts`) ; rapprochement manuel des sous/trop-perçus non implémenté, jamais exercé contre une vraie facture Stripe (aucune clé fournie).
- Phase 7 (PREUVIA COPILOT) — non commencée, correctement désactivé par défaut (absent).
- Phase 8 (docs ARCHITECTURE/SECURITY/DATA_MODEL/DEPLOYMENT/RUNBOOKS) — 🟡 les 5 documents mandatés sont écrits ; sauvegarde/restauration désormais réellement exercée (`pg_dump`/`pg_restore` bout-en-bout contre une base peuplée, `prisma migrate status` + 87/87 tests + comptages de lignes vérifiés sur la base restaurée — voir `docs/RUNBOOKS.md` §2) ; reste : automatisation planifiée, chiffrement au repos, politique de rétention, volumétrie de production.

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

1. RBAC désormais appliqué à toutes les routes de mutation (coeur DUERP + modules hérités). Une faille IDOR inter-tenant réelle a été trouvée et corrigée au passage : `PATCH /api/training/.../enrollments` ne vérifiait aucune appartenance à l'organisation (voir `tests/integration/training-enrollment-isolation.test.ts`). Une seconde faille réelle a été trouvée et corrigée : `PATCH /api/epi/[id]` et `PATCH /api/haccp/[id]` faisaient `data: { ...body }` sans filtrer le corps de la requête — un appelant pouvait réassigner sa propre ressource à une AUTRE organisation en incluant `organizationId` (ou `planId` pour un CCP) dans le PATCH, contournant le scoping multi-tenant malgré le contrôle d'appartenance fait par le `findFirst` précédent. Corrigé via `lib/api-utils.ts#omitProtectedFields()` (testé, `tests/unit/api-utils.test.ts`). Reste à auditer : les routes GET/liste ne filtrent que par organisation, pas par site/unité (portée fine par site — hors périmètre Phase 0).
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
