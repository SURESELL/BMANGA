# SECURITY.md — PREUVIA DUERP

État réel au 2026-07-15. Ce document décrit ce qui est **implémenté et
testé**, ce qui est **partiel**, et les **risques connus** — pas un objectif
aspirationnel. Voir `docs/REPOSITORY_AUDIT.md` pour l'historique des failles
trouvées et corrigées.

## 1. Authentification

- Mots de passe hachés avec **Argon2id** (`lib/password.ts`, package `argon2`,
  memoryCost 19 MiB / timeCost 2 — minimum recommandé OWASP).
- `lib/auth.ts` (`authorize()`) vérifie réellement le mot de passe. **Historique** :
  la version héritée du dépôt (NORMIA) ne vérifiait jamais le mot de passe —
  faille critique corrigée en tout début de cette session, voir
  `docs/REPOSITORY_AUDIT.md` §4.
- **Rate limiting** : 10 tentatives / 15 min par identifiant (`lib/rate-limit.ts`).
- **Verrouillage de compte** : 5 échecs consécutifs → verrouillage 15 min
  (`User.failedLoginAttempts`, `User.lockedUntil`).
- **Mot de passe temporaire** (invitation consultant/admin) : généré
  serveur (`generateTemporaryPassword()`), haché immédiatement, renvoyé **une
  seule fois** dans la réponse API (jamais journalisé, jamais stocké en
  clair), expire après 48h (`User.passwordExpiresAt`), force un changement à
  la première connexion (`User.mustChangePassword`) via le gate
  `/change-password` dans `middleware.ts`.
- **Mot de passe oublié** : jeton opaque, seul son hash SHA-256 est stocké
  (`PasswordResetToken.tokenHash`), expire après 1h, usage unique
  (`usedAt`), réponse HTTP identique que le compte existe ou non (pas
  d'énumération d'e-mails).
- Réponses constantes en cas d'échec (compte inexistant, inactif, sans mot de
  passe, ou mauvais mot de passe → même comportement, pas de fuite d'information).

**Limite connue** : `lib/rate-limit.ts` est un limiteur **en mémoire, par
instance**. Il ne partage pas d'état entre plusieurs instances serveur. À
remplacer par un store partagé (Redis) avant tout déploiement multi-instance.

## 2. Autorisation (RBAC)

- `lib/rbac.ts` définit la hiérarchie de rôles et la matrice
  `module × action → rôle minimum`.
- `requirePermission(role, module, action)` est branché sur **toutes** les
  routes de mutation (POST/PATCH/DELETE) : risks, duerp, action-plans,
  incidents, sites, users, documents, audits, qualiopi, haccp, environment,
  tmd, esg, non-conformities, epi, training (cours/modules/sessions/inscriptions).
- Les actions de validation/verrouillage (ex. faire passer un DUERP ou un
  document au statut validé/approuvé) exigent une permission `validate`
  distincte, plus élevée que `update`.

**Limite connue** : les routes de **lecture** (GET/liste) filtrent uniquement
par `organizationId`, pas par rôle ni par portée fine (site/unité de
travail). Un `EMPLOYEE` peut donc lire toutes les ressources de son
organisation, ce qui est conforme au rôle `VIEWER` minimum requis en lecture
dans la matrice, mais la portée par site/établissement n'est pas encore
implémentée (`AccessScope` du spec, Phase 2+).

## 3. Isolation multi-tenant (IDOR)

Pattern uniforme : `db.model.findFirst({ where: { id, organizationId: orgId } })`
où `orgId` vient **toujours** de la session serveur. Testé dans
`tests/integration/tenant-isolation.test.ts` et
`tests/integration/consultant-access.test.ts`.

**Faille trouvée et corrigée durant cette session** :
`PATCH /api/training/[id]/sessions/[sessionId]/enrollments` ne vérifiait
aucune appartenance organisationnelle avant de modifier le statut d'une
inscription — un utilisateur authentifié dans n'importe quelle organisation
pouvait modifier une inscription d'une autre organisation en devinant les
identifiants. Corrigé par jointure sur `session.organizationId`. Régression
couverte par `tests/integration/training-enrollment-isolation.test.ts`.

Cette classe de bug (route de mutation imbriquée qui oublie le filtre
`organizationId`) est le risque résiduel le plus probable dans les routes
non auditées ligne à ligne. Toute nouvelle route de mutation doit être
accompagnée d'un test IDOR suivant le même modèle.

**Seconde faille trouvée et corrigée** (assignation de masse) :
`PATCH /api/epi/[id]` et `PATCH /api/haccp/[id]` vérifiaient bien
l'appartenance de la ressource via `findFirst({ where: { id, organizationId } })`
avant modification, mais passaient ensuite `data: { ...body }` tel quel à
`update()` — sans filtrer les clés du corps de la requête. Un appelant
disposant de la permission `update` sur sa propre ressource pouvait donc
inclure `organizationId` (ou `planId` pour un CCP HACCP, la clé étrangère
équivalente vers le tenant) dans le PATCH pour réassigner la ressource à une
**autre** organisation — le contrôle d'appartenance ne portait que sur l'état
avant modification, pas sur les champs soumis. Corrigé par
`lib/api-utils.ts#omitProtectedFields()`, qui retire systématiquement
`id`/`organizationId`/`createdAt`/`updatedAt` (et toute clé étrangère de
tenant passée explicitement) avant l'`update()`. Testé dans
`tests/unit/api-utils.test.ts`. Aucune autre route du dépôt ne suit ce
pattern `data: { ...body }` (vérifié par recherche exhaustive) ; les autres
routes PATCH construisent leur objet `data` champ par champ.

## 4. Secrets

- Aucun secret commité. `.env.example` et `.env.test.example` ne contiennent
  que des placeholders ou, pour les Payment Links Stripe, les URLs
  **publiques** et officielles (pas des secrets).
- `.gitignore` exclut `.env`, `.env.local`, `.env.test.local`,
  `.env.development.local`, `.env.production.local`.
- Clé INSEE (`INSEE_API_KEY`) et clés Stripe (`STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`) ne sont lues que côté serveur
  (`lib/insee/client.ts`, `lib/stripe.ts`) — jamais exposées via
  `NEXT_PUBLIC_*` ni envoyées au client.
- Aucune clé de production n'a été utilisée ou configurée dans cette session.

## 5. Paiements

- Aucune donnée de carte n'est stockée par l'application (délégué
  entièrement à Stripe Checkout via les Payment Links officiels).
- Webhook Stripe : signature vérifiée sur le corps brut
  (`stripe.webhooks.constructEvent`), idempotence par `WebhookEvent.eventId`
  (chaque `event.id` Stripe n'est traité qu'une fois).
- Activation d'abonnement **uniquement** via webhook signé, jamais sur la
  base du retour navigateur (`checkout.session.completed` côté serveur).
- Rapprochement par `client_reference_id` (identifiant PREUVIA de
  l'organisation), jamais par e-mail seul.
- Rapprochement du **plan** payé : les Payment Links officiels ne portent
  aucune métadonnée de plan exploitable dans l'événement Stripe. Le webhook
  résout le plan à partir du Price ID de la ligne achetée
  (`stripe.checkout.sessions.listLineItems` sur `checkout.session.completed`,
  `subscription.items.data[0].price.id` sur `customer.subscription.updated`)
  via `resolvePlanFromPriceId()` (`lib/billing/plans.ts`, variables
  `STRIPE_PRICE_ID_*`). **Bug corrigé dans cette session** : ce rapprochement
  n'existait pas — `Subscription.plan` restait à `DIAGNOSTIC` (limites du
  plan gratuit) même après un paiement réel sur une offre payante, malgré le
  paiement effectivement accepté et le statut passé à `ACTIVE`. Si le Price
  ID est inconnu ou la variable d'environnement correspondante absente, le
  plan n'est **pas** deviné : l'accès est activé (le paiement a eu lieu) mais
  l'événement est journalisé (`console.error` + `AuditLog`) pour
  rapprochement manuel plutôt que d'attribuer des droits au hasard.
- **Virement bancaire** (`POST /api/billing/bank-transfer`, permission
  `billing:create`, ORG_ADMIN) : émet une facture Stripe
  (`collection_method: "send_invoice"`) au lieu d'un Payment Link carte. Le
  plan demandé est posé sur `Subscription.pendingPlan` — **jamais** sur
  `plan` tant que la facture n'est pas payée, pour ne pas accorder les
  entitlements d'un plan non réglé (couvert par
  `tests/integration/bank-transfer-billing.test.ts`). Le webhook
  `invoice.paid` promeut `pendingPlan` → `plan` et passe le statut à
  `ACTIVE` uniquement à réception confirmée du paiement. La ligne `Invoice`
  pré-créée en `PENDING` à l'émission de la facture est mise à jour (upsert
  par `stripeInvoiceId`, désormais `@unique`) plutôt que dupliquée. Comme le
  reste de l'intégration Stripe de ce dépôt, **jamais exercé contre une
  vraie facture Stripe** (aucune clé fournie) — logique vérifiée par
  tests d'intégration reproduisant les requêtes exactes du webhook, pas par
  un paiement réel. Le rapprochement manuel des sous/trop-perçus mentionné
  dans `PLANS.md` (Phase 6) n'est pas implémenté — hors périmètre de cette
  session.

## 6. Intégration INSEE

- Clé serveur uniquement, jamais exposée au frontend.
- Confirmation humaine explicite exigée avant tout enregistrement
  (`POST /api/company/import` requiert `confirmed: true` dans le corps de la
  requête).
- Traçabilité : `Organization.siretSource`, `siretFetchedAt`,
  `siretConfirmedBy`, `siretConfirmedAt`.

## 7. RGPD

- `POST /api/rgpd/export` et `DELETE /api/rgpd/delete` existent
  (export/anonymisation des données personnelles d'un utilisateur).
- Pas d'audit RGPD/DPO formel effectué — hors périmètre technique de cette
  session (voir `DELIVERY_CHECKLIST.md` « Validation avant production »).

## 8. Ce qui reste à faire avant production

Voir aussi `docs/STATUS.md`.

1. Généraliser le rate limiting vers un store partagé (Redis) pour un
   déploiement multi-instance.
2. Auditer et tester chaque nouvelle route de mutation pour IDOR
   systématiquement (pattern établi, à industrialiser en CI).
3. Configurer les clés réelles (Stripe test d'abord, puis production
   seulement après validation explicite), et tester le webhook contre un
   vrai événement Stripe signé.
4. Configurer l'API Sirene avec une vraie clé et valider le comportement
   réel (jamais appelée en conditions réelles dans cette session).
5. ~~Mettre en place CSP/HSTS.~~ **Fait** : `middleware.ts`/`lib/security-headers.ts`
   posent sur chaque réponse `Content-Security-Policy` (nonce par requête,
   `script-src 'nonce-...' 'strict-dynamic'` — pas de `unsafe-inline`/`unsafe-eval`
   pour les scripts), `Strict-Transport-Security` (2 ans, sous-domaines,
   preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
   (caméra/micro/géoloc désactivés). Le nonce est propagé via `app/layout.tsx`
   (`headers()`) pour que Next.js l'applique automatiquement à ses scripts
   inline d'hydratation/streaming. Vérifié : build de production + navigation
   Chromium headless sur `/`, `/login`, `/register` sans violation CSP ni
   erreur d'hydratation (`tests/unit/security-headers.test.ts` couvre la
   génération des en-têtes). `npm audit` : la vulnérabilité critique Next.js
   (DoS via Server Actions + exposition du serveur de dev) a été corrigée
   dans une session précédente en passant `next` de 15.0.4 à 15.5.20 (même
   version majeure). ~~Vulnérabilité critique sur `vitest`~~ **Corrigée** :
   `vitest` 2.1.8 → 4.1.10 (montée de version majeure, dépendance de test
   uniquement, jamais expédiée en production). Vérifiée méthodiquement plutôt
   que faite à l'aveugle : les 80 tests existants repassent tous sans
   modification après la montée de version, `vitest.config.mts` migré vers
   `resolve.tsconfigPaths` natif de Vite 6+ (dépréciant le plugin
   `vite-tsconfig-paths`, désormais retiré des dépendances), build/lint/
   `tsc --noEmit` re-vérifiés. Reste 3 vulnérabilités **modérées** :
   `postcss` (XSS via sortie CSS non échappée), vendorisée à l'intérieur de
   `next@15.5.20` lui-même — hors de notre contrôle direct tant que Next.js
   ne met pas à jour sa dépendance interne ; le correctif suggéré par
   `npm audit fix --force` est une **rétrogradation** de Next.js vers la
   version 9 (cassante), donc délibérément non appliqué.
6. Sauvegarde/restauration de la base : non testées dans cette session
   (voir `docs/RUNBOOKS.md` pour la procédure documentée mais non exercée
   en conditions réelles).
