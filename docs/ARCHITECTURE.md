# ARCHITECTURE.md — PREUVIA DUERP

État réel au 2026-07-15, fin de la session Phase 0. Voir `docs/STATUS.md` pour
ce qui est opérationnel vs partiel vs absent.

## 1. Stack

- **Framework** : Next.js 15 (App Router), React 18, TypeScript strict.
- **Base de données** : PostgreSQL via Prisma 5 (`prisma/schema.prisma`, migrations versionnées dans `prisma/migrations/`).
- **Authentification** : NextAuth (Auth.js) v5 beta, stratégie JWT, provider Credentials (Argon2id) + Google OAuth optionnel.
- **Validation** : Zod sur toutes les routes API.
- **UI** : Tailwind CSS + Radix UI, palette PREUVIA (`tailwind.config.ts`).
- **Paiements** : Stripe (Payment Links officiels + Billing/Invoicing + Webhooks + Customer Portal).
- **Intégration externe** : API Sirene INSEE 3.11 (proxy serveur).
- **Tests** : Vitest (unitaires + intégration contre une base PostgreSQL dédiée).
- **Lint** : ESLint 9 (flat config, `eslint-config-next`).

Aucun changement de stack n'a été fait par rapport au dépôt hérité (NORMIA) —
conforme à la règle « pas de migration de stack sans ADR ». Le dépôt était déjà
Next.js + Prisma + Zod, cible minimale du spec.

## 2. Séparation Edge / Node — point d'architecture important

NextAuth est scindé en deux fichiers, ce qui n'est **pas optionnel** :

- `lib/auth.config.ts` : configuration compatible **Edge Runtime**. Contient
  uniquement les callbacks `jwt`/`session` et la configuration des pages. Ne
  doit **jamais** importer Prisma, argon2, bcrypt ou tout module Node natif.
  Utilisé par `middleware.ts`.
- `lib/auth.ts` : configuration complète (providers Credentials/Google,
  `PrismaAdapter`, logique Argon2id/rate-limit/lockout). Utilisé par les route
  handlers et server components (runtime Node.js).

**Raison** : `middleware.ts` s'exécute dans l'Edge Runtime de Next.js, qui ne
supporte pas les bindings natifs Node (`node:crypto` via argon2, le moteur
Prisma). Fusionner les deux configurations casse le build du middleware
(`UnhandledSchemeError: node:crypto`). Si une future dépendance apparaît dans
`lib/auth.ts`, vérifier qu'elle n'est pas importée transitivement par
`middleware.ts` avant de merger.

## 3. Couches applicatives

```
app/(marketing)/          Pages publiques (landing, tarifs...)
app/(auth)/                Connexion, inscription, mot de passe oublié/réinitialisation
app/(dashboard)/           Application cliente (protégée par middleware)
app/change-password/       Gate de changement de mot de passe obligatoire
app/api/                   Routes API (route handlers Next.js)
  api/auth/                 register, forgot-password, reset-password
  api/company/               Proxy INSEE Sirene (siren, siret, search, import)
  api/consultant/clients/    Scaffold multi-tenant consultant
  api/webhooks/stripe/       Webhook Stripe signé + idempotent
  api/billing/portal/        Redirection Customer Portal
  api/{risks,duerp,...}      CRUD des modules métier, tous scopés organizationId + RBAC

lib/
  auth.ts, auth.config.ts   Authentification (voir §2)
  db.ts                      Client Prisma singleton
  rbac.ts                    Matrice de permissions + requirePermission()
  password.ts                Hachage Argon2id, génération mot de passe temporaire, tokens de reset
  rate-limit.ts               Limiteur de débit en mémoire (voir SECURITY.md)
  email.ts                    Envoi transactionnel (Resend, dégrade en log si non configuré)
  billing/plans.ts            Config Stripe centralisée (source de vérité des offres)
  billing/entitlements.ts    Vérification des limites d'offre côté serveur
  insee/                       Client + validation SIREN/SIRET
  consultant/access.ts        Résolution du périmètre consultant (jamais depuis le client HTTP)

prisma/
  schema.prisma               ~50 modèles, tous les modèles métier portent organizationId
  migrations/                 Historique de migrations (7 migrations à date)
  seed.ts                     Données de référence (Qualiopi, hazards, réglementation fictive)

tests/
  unit/                        Fonctions pures (password, rbac, rate-limit, insee validation, billing plans)
  integration/                 Contre une base PostgreSQL dédiée (IDOR, tenant isolation, auth, entitlements)
```

## 4. Modèle multi-tenant

Toutes les données métier portent `organizationId` (Organization = un client
final indépendant). Le périmètre est **toujours dérivé de la session
serveur** (`session.user.organizationId`, lui-même dérivé du JWT signé
serveur), jamais d'un paramètre envoyé par le navigateur. Pattern uniforme
dans toutes les routes API :

```ts
const orgId = (session.user as { organizationId?: string }).organizationId;
const resource = await db.someModel.findFirst({ where: { id, organizationId: orgId } });
```

### Espace consultant

`ConsultancyWorkspace` et `ConsultantClientAccess` forment une couche
additionnelle : un cabinet consultant a un ou plusieurs `User` rattachés via
`User.consultancyWorkspaceId`, et n'accède aux données d'un client
(`Organization`) que si une ligne `ConsultantClientAccess` avec
`status = ACTIVE` existe. Toute route consultant DOIT passer par
`lib/consultant/access.ts` — jamais par une liste d'`organizationId` fournie
par le client HTTP. Voir `tests/integration/consultant-access.test.ts` pour
les tests IDOR correspondants.

Ceci reste un **scaffold serveur** : aucune UI `/consultant/*` n'existe
encore (Phase 2, non commencée).

## 5. RBAC

`lib/rbac.ts` définit une hiérarchie de rôles (`VIEWER < LEARNER < EMPLOYEE <
TRAINER < AUDITOR < CONSULTANT < SITE_MANAGER < ORG_ADMIN < SUPER_ADMIN`) et
une matrice `module × action → rôle minimum`. Le helper
`requirePermission(role, module, action)` retourne soit `null` (accès
autorisé) soit une réponse 403 — branché sur toutes les routes de mutation
(POST/PATCH/DELETE) de l'API. Voir `docs/SECURITY.md` pour le détail.

## 6. Paiements

Deux parcours distincts, jamais confondus :

1. **Carte** via les 4 Payment Links Stripe officiels et immuables
   (`lib/billing/plans.ts`), avec `client_reference_id=<organizationId>` pour
   le rapprochement webhook — jamais l'e-mail seul.
2. **Virement bancaire** (Stripe Billing/Invoicing, `send_invoice`) : **non
   implémenté** dans cette session (Phase 6 de `PLANS.md`).

Le webhook (`/api/webhooks/stripe`) vérifie la signature sur le corps brut,
déduplique via `WebhookEvent.eventId`, et n'active jamais un abonnement sur la
seule base du retour navigateur.

## 7. Intégration INSEE Sirene

`lib/insee/client.ts` est le seul point d'appel à l'API Sirene. La clé
(`INSEE_API_KEY`) ne doit **jamais** être importée par un composant client —
elle n'est lue que dans du code exécuté côté serveur (route handlers sous
`app/api/company/`). Cache mémoire 5 min, timeout 8s, retries bornés
uniquement sur 429/500/503, mapping d'erreurs typé.

## 8. Ce qui n'est pas encore construit

Voir `docs/STATUS.md` et `PLANS.md` pour le détail phase par phase. En bref :
UI consultant complète, invitations par e-mail (l'API existe, l'envoi
transactionnel dégrade en log sans `RESEND_API_KEY`), versions DUERP
immuables avec verrouillage strict, export PDF, permis de travail,
entreprises extérieures, virement bancaire, PREUVIA COPILOT (délibérément
absent/désactivé).
