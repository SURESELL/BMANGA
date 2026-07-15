# DEPLOYMENT.md — PREUVIA DUERP

Procédure reproductible pour construire, migrer et déployer l'application.
**Aucun déploiement en production n'a été effectué dans le cadre de cette
session** — ce document décrit la procédure, il ne constitue pas une preuve
qu'elle a été exercée contre un environnement de production réel.

## 1. Prérequis

- Node.js 20+, npm.
- PostgreSQL 14+ accessible (base dédiée à l'application, distincte de toute
  base de test).
- Les variables d'environnement de `.env.example` renseignées dans
  `.env.local` (jamais commité).

## 2. Variables d'environnement

| Variable | Obligatoire | Notes |
|---|---|---|
| `DATABASE_URL` | Oui | Connexion PostgreSQL |
| `NEXTAUTH_SECRET` | Oui | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Oui | URL publique de l'application |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Non | Provider OAuth optionnel |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Requis pour activer les paiements | **Clés de test d'abord** (`sk_test_`/`whsec_` de test). Jamais de clé de production sans ordre explicite. |
| `STRIPE_PAYMENT_LINK_ESSENTIEL/PILOTAGE/MAITRISE/PARTNER` | Non (déjà correctes par défaut) | Les 4 liens officiels et immuables sont câblés en dur comme fallback dans `lib/billing/plans.ts` — ne renseigner ces variables que pour un environnement de test isolé avec ses propres Payment Links |
| `STRIPE_PRICE_ID_ESSENTIEL/PILOTAGE/MAITRISE/PARTNER` | Requis pour le rapprochement webhook complet | À récupérer depuis le Dashboard Stripe (mode test), jamais inventés |
| `INSEE_API_KEY` | Requis pour l'onboarding Sirene | Jamais exposée au frontend — lue uniquement par `lib/insee/client.ts` |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_ENDPOINT` | Requis pour l'upload de fichiers | **Non intégré dans cette session** — les champs `fileUrl` existent en base mais aucune route d'upload réelle n'est câblée |
| `RESEND_API_KEY` / `EMAIL_FROM` | Non | Sans clé, `lib/email.ts` journalise au lieu d'envoyer (jamais de faux succès affiché) |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_APP_NAME` | Oui | Publiques, visibles côté client |

## 3. Build

```bash
npm install
npm run db:generate      # prisma generate
npm run lint              # doit être 0 erreur avant de continuer
npx tsc --noEmit           # doit être 0 erreur
npm run build              # next build — échoue si lint ou typecheck échouent
```

`next build` exécute lui-même le lint et le typecheck (comportement par
défaut de Next.js) — un échec de build peut donc venir de l'un ou l'autre,
pas seulement d'une erreur de compilation.

## 4. Migrations — procédure appliquée dans cette session

Toutes les migrations de ce dépôt ont été produites et vérifiées avec la
séquence suivante (reproductible, pas de `prisma migrate dev` en environnement
non interactif — cette commande refuse de s'exécuter sans TTY dès qu'un
changement destructeur potentiel est détecté, comme un changement de valeurs
d'enum) :

```bash
# 1. Créer une base miroir temporaire pour le diff
createdb preuvia_shadow

# 2. Générer le SQL de migration par comparaison schéma vs historique
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "postgresql://user:pass@localhost:5432/preuvia_shadow" \
  --script > prisma/migrations/<timestamp>_<nom>/migration.sql

# 3. Relire le SQL généré avant de l'appliquer (obligatoire — voir §5)

# 4. Appliquer sur la base cible (non interactif, sûr en CI/CD)
npx prisma migrate deploy

# 5. Nettoyer la base miroir
dropdb preuvia_shadow
```

`npx prisma migrate deploy` (contrairement à `migrate dev`) n'invite jamais
et ne génère aucun nouveau fichier — il applique uniquement les migrations
déjà présentes dans `prisma/migrations/`. C'est la commande à utiliser en
production/CI.

## 5. Relecture obligatoire du SQL généré avant application

`prisma migrate diff` peut générer du SQL destructeur pour certains
changements d'enum (`DROP COLUMN` / `ADD COLUMN` avec recréation de type
plutôt qu'`ALTER TYPE ... ADD VALUE`). Sur une base contenant déjà des
données utilisant les anciennes valeurs, cela échoue au moment du `CAST` — ce
qui est en fait une protection : la migration s'arrête plutôt que de
corrompre silencieusement des lignes. Avant d'appliquer une migration sur une
base non vide :

1. Lire le fichier `migration.sql` généré.
2. Si une colonne enum est recréée (pattern `CREATE TYPE "X_new"` /
   `RENAME TO "X_old"` / `DROP TYPE "X_old"`), vérifier qu'aucune ligne
   existante n'utilise une valeur qui disparaît de l'enum.
3. Pour un ajout pur de valeur d'enum (`ALTER TYPE ... ADD VALUE`), aucune
   donnée n'est à risque — c'est le cas de la migration
   `20260715170000_audit_status_canceled`.

## 6. Rollback

Prisma ne fournit pas de rollback automatique. Procédure :

1. **Avant** toute migration en production : sauvegarder la base
   (`pg_dump`, voir `docs/RUNBOOKS.md` §2).
2. En cas de problème après une migration : restaurer la sauvegarde plutôt
   que de tenter une migration inverse manuelle sur des données déjà
   modifiées par l'application.
3. Si la migration n'a pas encore été suivie d'écriture applicative,
   une migration inverse peut être écrite à la main (SQL symétrique de
   celui généré) et appliquée avec `prisma migrate resolve` pour remettre
   l'historique Prisma en cohérence — à faire avec précaution, jamais en
   automatique.

Aucune procédure de rollback n'a été exercée en conditions réelles dans
cette session (pas de données de production).

## 7. Seed

```bash
npm run db:seed   # tsx prisma/seed.ts
```

Données strictement fictives (référentiel Qualiopi officiel, dangers
génériques, deux exemples de réglementation explicitement marqués
`[FICTIF - À VALIDER]`). Ne jamais exécuter contre une base de production.

## 8. Tests avant déploiement

```bash
cp .env.test.example .env.test.local   # pointer vers une base de test dédiée
npx prisma migrate deploy               # avec DATABASE_URL = base de test
npx vitest run
```

60 tests à ce jour (unitaires + intégration IDOR/RBAC/entitlements/auth
contre une vraie base PostgreSQL). Ne jamais faire dépendre les tests de
données de production — voir `tests/setup.ts`.

## 9. Démarrage

```bash
npm run start   # après npm run build, sert la version production
```

## 10. Ce qui n'a jamais été fait dans cette session

- Déploiement effectif sur un hébergeur (Vercel, conteneur, VM...).
- Configuration de domaine, certificats TLS, CDN.
- Configuration de monitoring/observabilité (aucun APM, aucune alerte).
- Test de sauvegarde/restauration en conditions réelles (procédure
  documentée dans `docs/RUNBOOKS.md`, non exercée).
- Bascule vers des clés Stripe/INSEE de production.

Aucune de ces actions ne doit être effectuée sans demande explicite du
propriétaire du produit (règle absolue du projet : « ne publie pas et ne
déploie pas automatiquement »).
