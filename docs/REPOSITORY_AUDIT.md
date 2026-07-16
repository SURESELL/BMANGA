# REPOSITORY_AUDIT.md — PREUVIA DUERP (ex-NORMIA)

Date de l'audit : 2026-07-15
Dépôt : `SURESELL/BMANGA`, branche `claude/preuvia-duerp-saas-build-3h6emb`
Auditeur : Claude Code

## 1. Constat préalable — écart d'identité

Le dépôt contenait un produit nommé **NORMIA** (package.json `"name": "normia"`), pas
« PREUVIA DUERP ». Le propriétaire a confirmé le 2026-07-15 : **transmuter l'ensemble du
produit en PREUVIA DUERP** (rebrand complet, cf. `docs/STATUS.md` phase 0.1).
Le présent audit documente l'état du dépôt **avant** rebrand, pour tracer précisément
ce qui a été conservé, renommé ou ajouté.

## 2. Stack réelle

- Next.js 15.0.4 (App Router), React 18.3, TypeScript 5.7 (strict activé dans `tsconfig.json`).
- Prisma 5.22 + PostgreSQL (`prisma/schema.prisma`, 48 modèles).
- NextAuth v5 beta (`next-auth@5.0.0-beta.25`) avec `@auth/prisma-adapter`, stratégie JWT.
- Tailwind CSS 3.4 + Radix UI + `class-variance-authority`.
- `react-hook-form` + `zod` pour les formulaires.
- `recharts` pour les graphiques, `@tanstack/react-table` et `react-query`.
- Aucun ORM alternatif, aucune API GraphQL/tRPC : REST via routes App Router (`app/api/**/route.ts`).
- Aucun outil d'observabilité, de queue de tâches asynchrones, ni de stockage S3 configuré (juste des champs `fileUrl: String?`).

Conforme à la cible « Next.js + Prisma + Zod + PostgreSQL » de `PRODUCT_SPEC.md` §4.
**Aucune migration de stack nécessaire — aucun ADR requis.**

## 3. Fonctions réelles (opérationnelles, testées manuellement dans le code)

- Inscription (`POST /api/auth/register`) : crée `Organization` + `User` + `Subscription` en transaction, hache le mot de passe avec bcrypt (cost 12).
- CRUD `Risk`, `ActionPlan`, `Incident`, `Document`, `EPIItem`, `Site`, `HACCPPlan`, `ESGIndicator`, `Audit`, `NonConformity`, `Regulation/Obligation`, `Training*`, `Qualiopi*` : routes API avec scoping `organizationId` dérivé de la session serveur (`session.user.organizationId`), pas de paramètre client accepté tel quel — **bon pattern reproductible**.
- RBAC déclaratif dans `lib/rbac.ts` (`PERMISSIONS` par module/action) mais **non branché** sur la majorité des routes API (voir §5).
- `AuditLog` écrit sur certaines mutations (`register`, `risks POST`), pas systématique.
- RGPD : `POST /api/rgpd/export` et `POST /api/rgpd/delete` existent (anonymisation + export JSON).
- Disclaimers juridiques déjà présents dans le seed (`Regulation`/`Obligation.disclaimer`) — conforme à la règle « Donnée à valider avec source officielle ».
- Landing page (`app/(marketing)/page.tsx`) fonctionnelle, palette proche de la cible PREUVIA (navy `#0D1B2A`, blue `#1E3A5F` vs. cible `#0B1F33`/`#145B8C`) — **conservée et alignée**, pas réécrite.

## 4. Fonctions simulées ou trompeuses (CRITIQUE)

1. **Authentification cassée — faille de sécurité critique.** `lib/auth.ts` `Credentials.authorize()` ne vérifie **jamais** le mot de passe. Il cherche l'utilisateur par email, vérifie `isActive`, et renvoie une session valide **quel que soit le mot de passe fourni**. Le hash bcrypt créé à l'inscription est stocké dans `Account.access_token` (champ prévu pour un jeton OAuth, jamais relu). **Conséquence : n'importe qui connaissant un email actif peut se connecter sans mot de passe.** Corrigé en Phase 0 (voir STATUS).
2. **RBAC non appliqué côté serveur.** `lib/rbac.ts` définit des permissions par rôle/module, mais aucune route API ne l'importe (`grep` : 0 usage hors du fichier lui-même). Les routes ne vérifient que « session existe + même organisation », pas le rôle. Un `EMPLOYEE` peut par ex. appeler `PATCH /api/risks/:id` alors que la matrice prévoit `SITE_MANAGER` minimum pour `update`.
3. **Aucun paiement Stripe implémenté.** `billing/page.tsx` est une page d'UI seule ; aucune route API Stripe, aucun webhook, aucun lien de paiement. Le modèle `Subscription` a des champs `stripeCustomerId`/`stripeSubscriptionId` jamais renseignés par du code applicatif.
4. **Aucune intégration INSEE Sirene.** Aucune route `/api/company/*`, aucune variable `INSEE_API_KEY` dans `.env.example`.
5. **Aucun espace consultant multi-clients.** Pas de `ConsultancyWorkspace`, `ConsultantClientAccess` : un `User` a au plus un `organizationId`, structure mono-tenant par utilisateur.
6. **Offres commerciales non conformes au spec.** `SubscriptionPlan` enum = `FREE/STARTER/PROFESSIONAL/ENTERPRISE` avec des prix fictifs (49€/149€/399€) sans rapport avec les 6 offres PREUVIA (Diagnostic 0€, Essentiel 29€, Pilotage 59€, Maîtrise 119€, Enterprise devis, Partner 249€) ni avec les 4 liens Stripe officiels.
7. **Aucun module Permis de travail, entreprises extérieures, plans de prévention, protocoles de sécurité.** Absents du schéma et de l'UI.
8. **Aucun PREUVIA COPILOT / RAG.** Absent (attendu, hors scope tant que non validé selon le spec).
9. **Mot de passe temporaire consultant → client.** Fonctionnalité absente : pas de génération, pas d'expiration 48h, pas de contrainte de changement à la première connexion.

## 5. Dette technique

- **Build cassé** : `npx tsc --noEmit` échoue avec ~25 erreurs (`params` non `await`-é dans les routes dynamiques Next 15, champs Prisma obsolètes comme `learnerId`/`image`/`assignedToId` référencés dans du code mais absents du schéma actuel — dérive code/schéma). Un commit précédent (`c1a1203 Fix: params must be Promise in Next.js 15 API routes`) a corrigé certaines routes mais pas toutes.
- **Lint cassé** : aucun `eslint.config.mjs` (flat config requis par ESLint 9 / `eslint-config-next` 15) — `npm run lint` échoue immédiatement, donc jamais exécuté en pratique sur ce dépôt.
- **Aucun test** : 0 fichier `*.test.ts`/`*.spec.ts` dans le dépôt malgré `vitest` en dépendance et un script `test`. Playwright cité dans le spec mais absent du `package.json`.
- **Aucune CI** (`.github/workflows` absent).
- **Pas de migrations Prisma versionnées** : `prisma/migrations/` absent, seul `db push`/`db:generate` sont scriptés — donc pas d'historique de migration ni de rollback documenté.
- **`UserRole` plat, un seul rôle par utilisateur**, pas de `Membership` multi-organisation ni de portée par site/unité — incompatible avec le modèle consultant multi-clients requis.
- **`Account.access_token` détourné pour stocker un hash de mot de passe** — mélange dangereux entre la table OAuth NextAuth et la logique credentials custom.
- **`tsconfig.tsbuildinfo` commité** (fichier généré, densité de diff inutile) — signalé, non bloquant.

## 6. Risques sécurité/conformité prioritaires

| # | Risque | Sévérité | Statut |
|---|---|---|---|
| 1 | Authentification par mot de passe totalement contournable | Critique | Corrigé Phase 0 |
| 2 | RBAC déclaré mais non appliqué serveur | Élevé | Corrigé partiellement Phase 0 (helper appliqué aux routes retouchées ; couverture totale = travail restant) |
| 3 | Pas de rate limiting / verrouillage sur le login | Élevé | Corrigé Phase 0 (rate limit en mémoire — **à remplacer par un store partagé type Redis avant prod multi-instance**) |
| 4 | Secrets potentiellement absents de `.gitignore` pour nouveaux fichiers d'env | Faible | `.env` déjà ignoré ; vérifié |
| 5 | Table `Account` détournée pour mot de passe | Moyen | Corrigé Phase 0 (nouveau champ `User.passwordHash`) |

## 7. Éléments à conserver tels quels

- Structure App Router, layout `(auth)`/`(dashboard)`/`(marketing)`.
- Palette de couleurs (ajustée aux valeurs exactes du spec, mais même identité visuelle).
- Modèle de cotation des risques (fréquence × gravité / maîtrise) et ses labels français.
- Modules HACCP/ICPE/TMD/ESG/Qualiopi/LMS existants : **conservés sans suppression** (décision explicite du propriétaire : « transmute tout en PREUVIA » = renommage, pas de suppression). Le spec PREUVIA les place hors du périmètre *principal* mais ne demande pas leur suppression ; ils restent fonctionnels sous la nouvelle marque.
- Pattern de scoping `organizationId` dérivé de la session dans les routes API existantes.
- Disclaimers juridiques déjà en place dans le seed.

## 8. Écarts restants avec PRODUCT_SPEC.md après cette session

Voir `docs/STATUS.md` pour l'état détaillé phase par phase. Résumé : Phase 0 (fondations
sécurité/rebrand/paiement-config/INSEE) traitée dans cette session ; Phases 2 à 9
(portail consultant complet, permis, entreprises extérieures, COPILOT, virement bancaire,
etc.) restent à construire lors de sessions ultérieures et sont détaillées dans `PLANS.md`.
