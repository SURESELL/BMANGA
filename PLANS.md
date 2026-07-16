# PLANS.md — PREUVIA DUERP

Référence : `docs/REPOSITORY_AUDIT.md` pour l'état constaté avant travaux.
Décision propriétaire (2026-07-15) : rebrand complet NORMIA → PREUVIA DUERP, LMS/Qualiopi
existants conservés sans suppression (non développés davantage dans cette session).

Chaque phase liste : objectif, dépendances, critères de sortie, tests, rollback.

## Phase 0 — Fondations (cette session)

**Objectif** : rebrand, corriger la faille d'authentification, poser les briques serveur
indispensables (RBAC appliqué, config Stripe centralisée, proxy INSEE, scaffolding
consultant multi-tenant, plans/entitlements PREUVIA) sans casser l'existant.

Dépendances : aucune.

Sous-lots :
- 0.1 Rebrand NORMIA → PREUVIA DUERP (texte, package.json, env, CSS namespace, seed).
- 0.2 Authentification réelle : `User.passwordHash` (Argon2id via `argon2`), `authorize()` qui vérifie le mot de passe, rate limiting + verrouillage sur le login, migration Prisma.
- 0.3 RBAC appliqué : helper serveur `requirePermission()` branché sur les routes retouchées ; reste à généraliser à toutes les routes existantes (suivi dans `docs/STATUS.md`).
- 0.4 Config Stripe centralisée (`lib/billing/plans.ts`) avec les 4 liens Payment Link officiels immuables + `client_reference_id`/email verrouillé.
- 0.5 Modèle `Plan`/`PlanLimit`/`SubscriptionEntitlement` conforme aux 6 offres PREUVIA ; migration du `Subscription` existant.
- 0.6 Webhook Stripe (`/api/webhooks/stripe`) : signature brute, idempotence (`WebhookEvent`), reconciliation par `client_reference_id`.
- 0.7 Scaffolding multi-tenant consultant : `ConsultancyWorkspace`, `ConsultantClientAccess`, migration + route de liste minimale scoping-testée (UI complète = Phase 2).
- 0.8 Proxy INSEE Sirene serveur (`/api/company/*`) : validation SIREN/SIRET, cache mémoire, timeout, retries limités, mapping erreurs 400/401/403/404/429/500/503, clé serveur uniquement.
- 0.9 Outillage : `eslint.config.mjs` (flat config), config Vitest, tests IDOR/auth/webhook/Sirene.
- 0.10 Migrations Prisma versionnées (remplace `db push` par `prisma migrate`), doc rollback.

Critères de sortie : `tsc --noEmit` sans erreur sur le code touché, `eslint` exécutable,
tests Vitest ajoutés passent, `next build` réussit, aucun secret commité.

Rollback : chaque sous-lot est un commit séparé ; `git revert` du commit concerné restaure
l'état antérieur. La migration Prisma de Phase 0 est additive (nouvelles tables/colonnes
nullable ou avec défaut) — rollback via `prisma migrate resolve` + migration inverse fournie.

## Phase 1 — Commercial et onboarding (non commencée)

Landing/Tarifs/Fonctionnalités finalisées avec les 6 offres et CTA Stripe réels,
mot de passe oublié, onboarding organisation/établissements/sites/unités piloté par
l'API Sirene, espace Super Admin PREUVIA (organisations, offres, webhooks, audit logs).
Dépend de Phase 0 (0.4, 0.5, 0.8).

## Phase 2 — Espace consultant multi-clients (partiellement présent)

UI complète `/consultant/*` : portefeuille, prospects/actifs/archivés, missions,
échéances, rapports par client, équipe, modèles, marque blanche. Création d'accès
clients avec mot de passe temporaire (génération, affichage unique, hachage immédiat,
expiration 48h configurable, changement forcé à la première connexion, révocation).
Dépend de Phase 0 (0.7) et Phase 1 (invitations e-mail).

🟡 Fait : la boucle coeur bout-en-bout. `POST /api/admin/consultancy-workspaces`
(Super Admin uniquement) provisionne un cabinet et son consultant principal
avec mot de passe temporaire (48h, changement forcé) — avant cette route,
rien ne pouvait jamais peupler `User.consultancyWorkspaceId`, l'espace
consultant était donc inaccessible en pratique malgré le scaffold serveur de
Phase 0. `/consultant` (portefeuille) permet de créer un client — avec cette
fois un compte administrateur réel (mot de passe temporaire, même politique)
pour ce client, ce qui manquait aussi — et de révoquer l'accès. Vérifié de
bout en bout avec un vrai navigateur Chromium : provisionnement du cabinet →
connexion consultant → changement de mot de passe forcé → création d'un
client → connexion du nouvel administrateur client, sans aucune erreur.
Reste à faire : prospects/actifs/archivés, missions, échéances, rapports par
client, équipe, modèles, marque blanche — non commencés (pas de modèles de
données pour ces entités).

## Phase 3 — DUERP et risques avancés (partiellement présent)

Versions DUERP réellement immuables (verrouillage après validation, toute modification
crée une révision), consultations, workflow de validation, exports PDF, méthodes de
cotation configurables (G×P, G×P×E, personnalisée) avec mention légale obligatoire.
Dépend de Phase 0.

## Phase 4 — Prévention opérationnelle (partiellement présent)

Fiches de poste, fiches sécurité, matrice de compétences, VGP/vérifications avec mention
« Donnée à valider avec une source officielle à jour » systématique, rondes/inspections/
causeries, communication sécurité (affiches, flashs).

## Phase 5 — Entreprises extérieures et permis (non commencée)

`ExternalCompany`, plans de prévention, protocoles de chargement/déchargement, permis
(feu, hauteur, levage, espace confiné, électrique, consignation, ATEX, chimique) avec
signatures, suspension, reprise, clôture, historique.

## Phase 6 — Paiement virement bancaire (partiellement présent)

Parcours Stripe Billing/Invoicing distinct (`send_invoice`, `customer_balance`,
`bank_transfer`), statut `pending_payment`, activation uniquement après `invoice.paid`,
rapprochement manuel des sous/trop-perçus.

🟡 Fait : `POST /api/billing/bank-transfer` émet une facture Stripe
(`collection_method: "send_invoice"`), pose `Subscription.status =
PENDING_PAYMENT` et `pendingPlan` (jamais `plan` avant paiement effectif) ;
le webhook `invoice.paid` promeut `pendingPlan` → `plan` et passe le statut
à `ACTIVE`. UI minimale sur `/billing` (bouton par plan payant, bannière
facture en attente). Reste à faire : rapprochement manuel des sous/
trop-perçus, jamais exercé contre une vraie facture Stripe (voir
`docs/STATUS.md`/`docs/SECURITY.md`).

## Phase 7 — PREUVIA COPILOT (non commencée, désactivé par défaut)

Architecture RAG avec séparation par organisation, citations, validation humaine
obligatoire. Reste désactivé (feature flag off) tant que les sources ne sont pas validées.

## Phase 8 — Sécurité, tests et documentation de sortie (continu)

Complète les tests IDOR/E2E, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`,
`docs/DATA_MODEL.md`, `docs/DEPLOYMENT.md`, `docs/RUNBOOKS.md`, sauvegarde/restauration.

## Suivi

L'état détaillé, phase par phase et sous-lot par sous-lot (fait / partiel / à faire),
est maintenu dans `docs/STATUS.md` et mis à jour après chaque lot livré.
