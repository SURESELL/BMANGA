# DATA_MODEL.md — PREUVIA DUERP

État réel au 2026-07-15 : 52 modèles Prisma (`prisma/schema.prisma`), 7
migrations versionnées (`prisma/migrations/`). Ce document donne une carte du
schéma — pour le détail exact des colonnes, `prisma/schema.prisma` reste la
source de vérité.

## 1. Convention de scoping multi-tenant

Toute table métier rattachée à une entreprise cliente porte une colonne
`organizationId` (parfois nullable pour les référentiels globaux comme
`Hazard`, `Regulation` sans org). Aucune route API ne doit filtrer une requête
sans cette colonne dès qu'un modèle la porte — voir `docs/SECURITY.md` §3
pour le pattern et les tests IDOR associés.

Les objets propres à un cabinet consultant (pas encore un client) portent
`consultancyWorkspaceId` (uniquement `User.consultancyWorkspaceId` à ce
stade — le reste de l'espace consultant est un scaffold, voir
`docs/STATUS.md`).

## 2. Groupes de modèles

### Core / multi-tenant
`Organization`, `Site`, `WorkUnit` — hiérarchie organisation → établissement
→ unité de travail. `Organization` porte aussi la traçabilité de l'import
Sirene (`siretSource`, `siretFetchedAt`, `siretConfirmedBy`,
`siretConfirmedAt`).

### Espace consultant (scaffold serveur, Phase 2 UI non commencée)
`ConsultancyWorkspace`, `ConsultantClientAccess` (seule table qui relie un
cabinet à ses clients — `@@unique([consultancyWorkspaceId, organizationId])`,
statut `ACTIVE`/`REVOKED`).

### Authentification & RBAC
`User` (porte `passwordHash`, `mustChangePassword`, `passwordExpiresAt`,
`failedLoginAttempts`, `lockedUntil` — voir `docs/SECURITY.md`),
`PasswordResetToken`, `Account`/`Session`/`VerificationToken` (tables
standard NextAuth), `Permission`/`UserPermission` (table générique héritée,
non utilisée par le RBAC actuel qui vit dans `lib/rbac.ts` en code plutôt
qu'en base — voir §4).

### DUERP et risques
`Hazard` (référentiel global), `Risk`, `DUERP`, `ActionPlan`, `Incident`.
Cotation risque : `grossFrequency/grossGravity/grossMastery` →
`grossRisk`/`riskLevel`, et la même structure en version résiduelle
(`residual*`). `DUERP.status` est une chaîne libre (`DRAFT`, `ACTIVE`,
`VALIDATED`, `ARCHIVED`, `CLOSED`). Passer au statut `VALIDATED` exige la
permission RBAC `validate` (plus élevée que `update`) et fixe `validatedAt`.
**Immuabilité réelle appliquée côté serveur** : dès que `validatedAt` est
renseigné, `PATCH /api/duerp/[id]` refuse toute modification en place
(409). La seule évolution possible est `POST /api/duerp/[id]/revise`, qui
crée une nouvelle version `DRAFT` rattachée à la version validée via
`DUERP.previousVersionId` (auto-relation `previousVersion`/`revisions`),
en reprenant ses unités de travail et risques comme point de départ ; le
numéro de version est incrémenté par année (`year`). Chaque révision est
journalisée (`AuditLog`, action `CREATE_REVISION`).

### EPI / vérifications
`EPIItem`, `PeriodicVerification` — équipements de protection individuelle et
vérifications périodiques génériques (pas encore de typage VGP spécifique).

### LMS / Qualiopi (module hérité, conservé sans développement supplémentaire)
`TrainingCourse`, `TrainingModule`, `TrainingSession` (utilise
`TrainingSessionType` — distinct de `TrainingType` du cours, voir note §5),
`TrainingEnrollment` (porte `status: TrainingEnrollmentStatus`),
`LearnerProgress`, `Quiz`/`Question`/`Answer`/`QuizAttempt`, `Certificate`,
`AttendanceSheet`/`AttendanceEntry`, `QualiopiCriterion`/`QualiopiIndicator`/
`QualiopiEvidence`.

### Audits et non-conformités
`Audit`, `AuditChecklist`, `AuditFinding`, `NonConformity`.

### HACCP / Environnement (modules hérités)
`HACCPPlan`, `CCP`, `PRPo`, `EnvironmentalAspect`, `ICPEItem`, `TMDItem`,
`ESGIndicator`.

### Réglementation
`Regulation`, `Obligation` — porte un champ `disclaimer` avec la mention
légale par défaut (« À vérifier avec la source officielle applicable... »),
conforme à la règle « ne jamais inventer une obligation ».

### Documents et preuves
`Document`, `Evidence` (relations polymorphes vers DUERP, ActionPlan,
Incident, Audit, AuditFinding, NonConformity, EPIItem, PeriodicVerification,
Obligation).

### Paiements et abonnements
`Subscription` (`plan: SubscriptionPlan` = les 6 offres PREUVIA réelles,
`status: SubscriptionStatus` = FREE/PENDING_PAYMENT/ACTIVE/PAST_DUE/
GRACE_PERIOD/SUSPENDED/CANCELED/EXPIRED, `paymentMethodType`,
`stripeCustomerId`/`stripeSubscriptionId`/`stripePriceId`), `WebhookEvent`
(idempotence, `eventId` unique), `Invoice`.

### Notifications, logs, support
`Notification`, `AuditLog` (journal d'audit générique — `action`, `resource`,
`resourceId`, `details` en JSON, jamais de secret ni de mot de passe),
`SupportTicket`.

## 3. Modèles explicitement absents (voir `PLANS.md`)

`Plan`/`PlanFeature`/`PlanLimit` en base (les limites vivent en code dans
`lib/billing/plans.ts`, pas en base — un Super Admin ne peut donc pas encore
les modifier depuis une UI), `Invitation` dédiée, `Employee`/`WorkerGroup`/
`JobPosition`/`JobDescription`/`JobSafetySheet`, `RiskFamily`/
`DangerousSituation`/`RiskAssessment`/`RiskScore`/`DUERPVersion`/
`Consultation` (versioning DUERP fin), `Investigation`/`RootCause`,
`TrainingRequirement`/`TrainingRecord`/`AuthorizationRecord`,
`ExternalCompany`/`Intervention`/`JointInspection`/`PreventionPlan`/
`SafetyProtocol`, `WorkPermit`/`HotWorkPermit`, `SafetyPoster`/`SafetyFlash`/
`ToolboxTalk`, `EscalationRule`, `LegalSource`, `Quote`/`BillingProfile`/
`TaxProfile`/`Refund`/`PaymentMethod`/`BankTransferInstruction`,
`AIConversation`/`AIMessage`/`AISource`/`AIValidation` (PREUVIA COPILOT).

## 4. RBAC : code, pas base

Contrairement à `Permission`/`UserPermission` (tables NextAuth-adjacentes
héritées, non branchées), le RBAC réellement appliqué vit dans
`lib/rbac.ts` sous forme de matrice TypeScript statique. Avantage :
vérifiable par les tests unitaires (`tests/unit/rbac.test.ts`) sans base de
données. Inconvénient : un Super Admin ne peut pas reconfigurer les
permissions depuis une UI sans changement de code — cohérent avec l'absence
actuelle d'UI Super Admin pour ça (Phase 1, non commencée).

## 5. Notes de modélisation issues des corrections de cette session

- `TrainingSession.type` utilise `TrainingSessionType` (FACE_TO_FACE, REMOTE,
  ELEARNING, BLENDED) — **différent** de `TrainingCourse.type`
  (`TrainingType` : E_LEARNING, FACE_TO_FACE, HYBRID, VIRTUAL_CLASS,
  WEBINAR). Les deux enums se ressemblent mais ne sont pas interchangeables ;
  ne pas fusionner sans vérifier les deux formulaires UI qui les consomment.
- `TrainingSession.trainer` (relation vers `User` via `trainerId`) a été
  ajoutée dans cette session — la colonne existait déjà mais la relation
  Prisma manquait, cassant toute requête qui tentait de l'inclure.
- `AuditStatus` inclut `CANCELED` (ajouté cette session — le code et l'UI
  l'utilisaient déjà, seul le schéma ne le déclarait pas).

## 6. Migrations

| Migration | Contenu |
|---|---|
| `20260715154121_init` | Schéma de base hérité (NORMIA), premier instantané versionné |
| `20260715154423_auth_password_hash_and_reset_tokens` | `User.passwordHash`/`mustChangePassword`/`failedLoginAttempts`/`lockedUntil`, `PasswordResetToken` |
| `20260715160000_billing_plans_and_webhook_events` | Migration des enums `SubscriptionPlan`/`SubscriptionStatus` vers les offres PREUVIA réelles, `WebhookEvent`, `Subscription.paymentMethodType`/`stripePriceId` |
| `20260715161500_organization_sirene_provenance` | `Organization.siretSource`/`siretFetchedAt`/`siretConfirmedBy`/`siretConfirmedAt` |
| `20260715163000_consultant_workspace` | `ConsultancyWorkspace`, `ConsultantClientAccess`, `User.consultancyWorkspaceId` |
| `20260715170000_audit_status_canceled` | Ajout de `CANCELED` à `AuditStatus` (additive, `ALTER TYPE ... ADD VALUE`) |
| `20260715171500_training_enrollment_status_session_type` | `TrainingEnrollment.status`, `TrainingSessionType` (remplace `TrainingType` sur `TrainingSession.type`), `TrainingSession.trainer` |

Toutes générées avec `prisma migrate diff` contre une base miroir (« shadow
database ») puis appliquées avec `prisma migrate deploy` — voir
`docs/DEPLOYMENT.md` pour la procédure reproductible.

**Aucune migration de cette liste n'a été testée contre des données de
production réelles** (le projet est pré-lancement). Les migrations avec
recréation de type enum (`billing_plans_and_webhook_events`,
`training_enrollment_status_session_type`) sont sûres sur une base vide ou de
test ; sur une base contenant déjà des lignes utilisant les anciennes valeurs
d'enum, elles échoueraient au `CAST` — à vérifier avant tout déploiement sur
une base non vide.
