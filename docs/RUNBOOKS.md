# RUNBOOKS.md — PREUVIA DUERP

Procédures opérationnelles pour les incidents courants. **Aucune de ces
procédures n'a été exercée contre un environnement de production réel** —
elles sont écrites à partir du code effectivement présent dans ce dépôt
(`lib/`, `prisma/schema.prisma`) et vérifiées de façon syntaxique/logique,
pas testées en conditions d'incident réel. À valider en environnement de
test avant de s'y fier en production.

## 1. Compte administrateur verrouillé ou mot de passe oublié

**Symptôme** : un `ORG_ADMIN` ou `SUPER_ADMIN` ne peut plus se connecter.

**Cause possible 1 — verrouillage après échecs répétés**
(`User.lockedUntil` dans le futur, `User.failedLoginAttempts >= 5`) :

```sql
-- Lecture d'abord, jamais d'UPDATE en aveugle
SELECT id, email, "failedLoginAttempts", "lockedUntil" FROM users WHERE email = '<email>';

-- Déverrouillage manuel si légitime (incident confirmé, pas une attaque en cours)
UPDATE users SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE email = '<email>';
```

**Cause possible 2 — mot de passe oublié** : orienter l'utilisateur vers
`/forgot-password` (flux normal, jamais besoin d'accès base). Si l'envoi
d'e-mail n'est pas configuré (`RESEND_API_KEY` absente), le lien de
réinitialisation est journalisé côté serveur (`lib/email.ts`) — le
récupérer dans les logs applicatifs plutôt que de contourner le flux.

**Ne jamais** : définir un mot de passe en clair directement en base. Utiliser
`lib/password.ts` (`hashPassword()`) si une réinitialisation manuelle est
absolument nécessaire hors du flux applicatif normal, et journaliser l'action
dans `AuditLog` sans jamais y écrire la valeur du mot de passe.

## 2. Sauvegarde et restauration PostgreSQL

**Sauvegarde** (procédure exercée avec succès dans cette session — voir
« Vérification effectuée » ci-dessous ; reste à automatiser en production,
non fait dans cette session) :

```bash
pg_dump --format=custom --file=preuvia_$(date +%Y%m%d_%H%M).dump "$DATABASE_URL"
```

Chiffrer le fichier de sauvegarde au repos et le stocker hors du serveur
applicatif. Politique de rétention à définir avec le propriétaire du produit
(non spécifiée dans cette session).

**Restauration** :

```bash
# Sur une base cible vide ou de test — jamais directement sur la prod sans confirmation
pg_restore --clean --if-exists --dbname="$DATABASE_URL" preuvia_20260715_1200.dump
```

**Test de restauration** (à faire régulièrement) : restaurer vers une base
temporaire, lancer `npx prisma migrate status` pour vérifier la cohérence du
schéma, puis `npx vitest run` avec `DATABASE_URL` pointant vers cette base
restaurée pour détecter toute corruption silencieuse.

**Vérification effectuée dans cette session** (2026-07-16) : le cycle complet
a été exécuté pour de vrai contre `preuvia_duerp_dev` (peuplée via
`npx tsx prisma/seed.ts`, pas une base vide) — `pg_dump` (succès),
`pg_restore --clean --if-exists` vers une base temporaire (succès),
`npx prisma migrate status` sur la base restaurée → « Database schema is up
to date ! », `npx vitest run` (DATABASE_URL sur la base restaurée) → 87/87
tests passants, et comparaison des comptages de lignes table par table
(`hazards`, `qualiopi_criteria`) entre la base source et la base restaurée →
identiques. La procédure documentée ci-dessus est donc confirmée exacte et
opérationnelle, pas seulement théorique. Reste non fait : exercice sur un
volume de données représentatif de la production, chiffrement au repos,
automatisation planifiée, politique de rétention.

## 3. Webhook Stripe : événement non traité ou en échec

**Symptôme** : un paiement Stripe a réussi mais l'organisation n'est pas
passée à `ACTIVE`, ou `WebhookEvent.error` est renseigné.

```sql
SELECT id, "eventId", type, "organizationId", "processedAt", error
FROM webhook_events
WHERE "processedAt" IS NULL OR error IS NOT NULL
ORDER BY "createdAt" DESC LIMIT 20;
```

**Diagnostic** :
1. Vérifier dans le Dashboard Stripe (Developers → Webhooks) si l'événement
   a été livré et son code de réponse HTTP.
2. Si 4xx/5xx côté PREUVIA : consulter les logs applicatifs autour de
   l'horodatage — `app/api/webhooks/stripe/route.ts` journalise
   `[stripe-webhook] échec traitement <type>` avec l'erreur.
3. Cause fréquente attendue : `client_reference_id` absent ou organisation
   introuvable (`checkout.session` créé sans le paramètre — vérifier que
   `lib/billing/plans.ts buildCheckoutUrl()` a bien été utilisé pour générer
   le lien, jamais l'URL Stripe brute).

**Correction** : Stripe retente automatiquement les webhooks en échec (code
5xx) pendant plusieurs jours. Pour forcer un nouveau traitement immédiat,
utiliser le bouton « Resend » du Dashboard Stripe sur l'événement concerné —
l'idempotence (`WebhookEvent.eventId` unique) garantit qu'un retraitement ne
double pas les effets.

**Ne jamais** : activer manuellement un abonnement en base sans passer par le
webhook (règle absolue du produit — l'activation ne doit jamais dépendre
d'une action manuelle non tracée).

## 4. Base de données inaccessible

**Symptôme** : `Can't reach database server at <host>:<port>` dans les logs,
l'application renvoie des 500 sur toutes les routes.

1. Vérifier que le service PostgreSQL tourne (`pg_isready -h <host> -p
   <port>` ou équivalent selon l'hébergeur).
2. Vérifier `DATABASE_URL` (hôte, port, identifiants) n'a pas changé sans
   mise à jour de la configuration applicative.
3. Vérifier les connexions actives (`SELECT count(*) FROM
   pg_stat_activity;`) contre une éventuelle saturation du pool de
   connexions Prisma.
4. Redémarrer le service applicatif après rétablissement de la base — Prisma
   ne reconnecte pas toujours proprement une longue coupure sans redémarrage.

## 5. Quota ou panne de l'API Sirene INSEE

**Symptôme** : `/api/company/*` renvoie 429, 503, ou `NOT_CONFIGURED`.

- `429` (`RATE_LIMITED`) : le quota interne (`lib/insee/client.ts`, 30
  requêtes/minute par instance) ou le quota INSEE lui-même est atteint.
  Le cache mémoire (5 min) réduit la pression — vérifier qu'il n'y a pas de
  boucle applicative qui invalide le cache anormalement.
- `503` (`UPSTREAM_UNAVAILABLE`) : l'API Sirene est indisponible côté INSEE.
  Aucune action côté PREUVIA — les retries bornés (2, avec backoff) sont déjà
  tentés automatiquement. Informer les utilisateurs que l'onboarding Sirene
  est temporairement indisponible ; la saisie manuelle reste possible en
  secours (le formulaire d'organisation n'exige pas un import Sirene réussi).
- `NOT_CONFIGURED` : `INSEE_API_KEY` absente de l'environnement — vérifier la
  configuration, pas un incident applicatif.

## 6. Verrouillage anti-brute-force déclenché à tort (faux positifs)

Le rate limiter (`lib/rate-limit.ts`) est **en mémoire, par instance**. Un
redémarrage du serveur applicatif réinitialise tous les compteurs — c'est le
moyen le plus rapide de débloquer une IP/un compte injustement limité si
l'incident est isolé. En déploiement multi-instance, ce comportement n'est
pas fiable (voir `docs/SECURITY.md` §1) : un remplacement par un store
partagé (Redis) est nécessaire avant que ce runbook reste valide à l'échelle.

## 7. Migration Prisma échouée en production

Voir `docs/DEPLOYMENT.md` §5-6 pour la procédure de relecture et de rollback.
En résumé :

1. Ne jamais relancer `prisma migrate deploy` en boucle sur un échec sans
   comprendre la cause (`npx prisma migrate status` pour voir l'état exact).
2. Si l'échec est dû à un `CAST` d'enum impossible (données existantes
   utilisant une valeur retirée), restaurer la sauvegarde pré-migration
   plutôt que de forcer.
3. Une fois la cause corrigée (migration réécrite), `prisma migrate resolve
   --applied <nom>` uniquement si la migration a réellement été appliquée
   manuellement et que l'historique doit juste être resynchronisé — jamais
   pour masquer un échec réel.
