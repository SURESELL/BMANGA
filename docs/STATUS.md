# STATUS.md — PREUVIA DUERP

Dernière mise à jour : 2026-07-15 (session Phase 0).

Légende : ✅ Réel/opérationnel · 🟡 Partiel · ⛔ Simulé/absent

## Phase 0 — Fondations

| Sous-lot | Statut | Détail |
|---|---|---|
| 0.1 Rebrand NORMIA → PREUVIA DUERP | 🟡 en cours | voir commits de cette session |
| 0.2 Authentification réelle (Argon2id, rate limit) | 🟡 en cours | |
| 0.3 RBAC appliqué côté serveur | 🟡 en cours | helper créé, branché sur routes retouchées uniquement |
| 0.4 Config Stripe centralisée (liens officiels) | 🟡 en cours | |
| 0.5 Plans/entitlements PREUVIA | 🟡 en cours | |
| 0.6 Webhook Stripe signé + idempotent | 🟡 en cours | |
| 0.7 Scaffolding consultant multi-tenant | 🟡 en cours | |
| 0.8 Proxy INSEE Sirene | 🟡 en cours | |
| 0.9 Outillage (eslint/vitest) + tests | 🟡 en cours | |
| 0.10 Migrations Prisma versionnées | 🟡 en cours | |

Ce tableau est mis à jour à la fin de la session avec l'état réel constaté après
exécution de lint/typecheck/tests/build (voir section « Résultats » en bas de fichier).

## Phases 1 à 8

Non commencées dans cette session. Voir `PLANS.md` pour le détail. Aucune fonctionnalité
de ces phases n'est présentée comme opérationnelle.

## Modules hérités (LMS, Qualiopi, HACCP, ICPE/TMD, ESG, Audits, Non-conformités)

✅ Conservés et fonctionnels tels qu'audités (CRUD + scoping organisationId). Renommés
sous la marque PREUVIA dans cette session mais **non retouchés fonctionnellement** —
hors périmètre principal du spec PREUVIA DUERP mais non supprimés (décision propriétaire).

## Secrets et intégrations restant à configurer avant toute mise en production

- `DATABASE_URL` (PostgreSQL réel).
- `NEXTAUTH_SECRET`.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (clés de test uniquement dans cette session — aucune clé n'a été fournie, le webhook est testé avec des événements simulés/signés localement).
- `INSEE_API_KEY` (aucune clé fournie — le proxy est implémenté et testé avec des réponses mockées ; jamais appelé en conditions réelles dans cette session).
- `RESEND_API_KEY` / SMTP (envoi d'e-mails d'invitation — non implémenté cette session).
- `S3_*` (stockage fichiers — champs `fileUrl` existants mais pas d'intégration d'upload réelle).

## Résultats des commandes (mis à jour en fin de session)

Voir le résumé exécutif final de la session pour les résultats détaillés de
`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
