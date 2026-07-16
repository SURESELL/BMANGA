/**
 * Configuration centralisée des offres PREUVIA DUERP.
 *
 * Les 4 Payment Links Stripe ci-dessous sont OFFICIELS ET IMMUABLES
 * (voir STRIPE_PAYMENT_LINKS.md à la racine du dépôt). Ils ne doivent jamais
 * être recréés, raccourcis ou modifiés dans leur partie de base — seuls des
 * paramètres de requête autorisés peuvent être ajoutés (voir buildCheckoutUrl).
 *
 * Les valeurs par défaut ci-dessous correspondent aux liens officiels transmis
 * par le propriétaire du produit. Elles peuvent être surchargées par variable
 * d'environnement pour les tests, mais ne doivent jamais diverger des liens
 * officiels en production.
 */

export type PlanId = "DIAGNOSTIC" | "ESSENTIEL" | "PILOTAGE" | "MAITRISE" | "ENTERPRISE" | "PARTNER";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceHT: number | null; // null = sur devis
  billingPeriod: "MONTH" | null;
  /** Nom de la variable d'environnement contenant le Payment Link Stripe officiel. */
  paymentLinkEnvVar: string | null;
  /** Valeur par défaut du Payment Link officiel (source de vérité si l'env var est absente). */
  defaultPaymentLink: string | null;
  /** Nom de la variable d'environnement contenant le Price ID Stripe du plan
   * (utilisé pour retrouver le plan souscrit à partir d'un événement webhook,
   * les Payment Links ne portant aucune métadonnée de plan exploitable). */
  priceIdEnvVar: string | null;
  limits: {
    sites: number | null; // null = illimité
    users: number | null; // null = illimité (politique d'usage raisonnable)
  };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  DIAGNOSTIC: {
    id: "DIAGNOSTIC",
    name: "Diagnostic",
    priceHT: 0,
    billingPeriod: null,
    paymentLinkEnvVar: null,
    defaultPaymentLink: null,
    priceIdEnvVar: null,
    limits: { sites: 1, users: 3 },
  },
  ESSENTIEL: {
    id: "ESSENTIEL",
    name: "Essentiel",
    priceHT: 29,
    billingPeriod: "MONTH",
    paymentLinkEnvVar: "STRIPE_PAYMENT_LINK_ESSENTIEL",
    defaultPaymentLink: "https://buy.stripe.com/7sYbJ15FA2J75RMeQy5os00",
    priceIdEnvVar: "STRIPE_PRICE_ID_ESSENTIEL",
    limits: { sites: 1, users: null },
  },
  PILOTAGE: {
    id: "PILOTAGE",
    name: "Pilotage",
    priceHT: 59,
    billingPeriod: "MONTH",
    paymentLinkEnvVar: "STRIPE_PAYMENT_LINK_PILOTAGE",
    defaultPaymentLink: "https://buy.stripe.com/eVq28r1pkfvTeoi37Q5os01",
    priceIdEnvVar: "STRIPE_PRICE_ID_PILOTAGE",
    limits: { sites: 3, users: null },
  },
  MAITRISE: {
    id: "MAITRISE",
    name: "Maîtrise",
    priceHT: 119,
    billingPeriod: "MONTH",
    paymentLinkEnvVar: "STRIPE_PAYMENT_LINK_MAITRISE",
    defaultPaymentLink: "https://buy.stripe.com/aFa7sLc3Y1F3bc6eQy5os02",
    priceIdEnvVar: "STRIPE_PRICE_ID_MAITRISE",
    limits: { sites: 10, users: null },
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    priceHT: null,
    billingPeriod: null,
    paymentLinkEnvVar: null,
    defaultPaymentLink: null,
    priceIdEnvVar: null,
    limits: { sites: null, users: null },
  },
  PARTNER: {
    id: "PARTNER",
    name: "PREUVIA Partner",
    priceHT: 249,
    billingPeriod: "MONTH",
    paymentLinkEnvVar: "STRIPE_PAYMENT_LINK_PARTNER",
    defaultPaymentLink: "https://buy.stripe.com/bJe00j6JEcjH4NI7o65os03",
    priceIdEnvVar: "STRIPE_PRICE_ID_PARTNER",
    limits: { sites: null, users: null },
  },
};

/** Les 4 identifiants de plan qui possèdent un Payment Link Stripe payant. */
export const PAYABLE_PLAN_IDS: PlanId[] = ["ESSENTIEL", "PILOTAGE", "MAITRISE", "PARTNER"];

export function getPaymentLink(planId: PlanId): string | null {
  const plan = PLANS[planId];
  if (!plan.paymentLinkEnvVar || !plan.defaultPaymentLink) return null;
  const fromEnv = process.env[plan.paymentLinkEnvVar];
  return fromEnv && fromEnv.trim().length > 0 ? fromEnv : plan.defaultPaymentLink;
}

/** Price ID Stripe configuré pour ce plan, ou `null` si non configuré (aucune
 * valeur par défaut ici contrairement aux Payment Links : un Price ID est
 * propre à chaque compte Stripe, il n'existe pas de "Price ID officiel"). */
export function getPriceId(planId: PlanId): string | null {
  const envVar = PLANS[planId].priceIdEnvVar;
  if (!envVar) return null;
  const value = process.env[envVar];
  return value && value.trim().length > 0 ? value : null;
}

/**
 * Retrouve le plan PREUVIA correspondant à un Price ID Stripe. Utilisé par le
 * webhook pour appliquer le bon plan (donc les bonnes limites d'entitlement)
 * après un paiement, puisque les Payment Links ne portent aucune métadonnée
 * de plan exploitable dans l'événement — seul le Price ID de la ligne achetée
 * permet ce rapprochement. Renvoie `null` si aucun plan ne correspond (Price
 * ID inconnu ou variable d'environnement STRIPE_PRICE_ID_* non configurée) :
 * dans ce cas l'appelant doit journaliser plutôt que d'assigner un plan au hasard.
 */
export function resolvePlanFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const planId of PAYABLE_PLAN_IDS) {
    if (getPriceId(planId) === priceId) return planId;
  }
  return null;
}

/**
 * Construit l'URL de redirection Stripe pour un plan payant sans jamais modifier
 * la base du Payment Link officiel — seuls des paramètres de requête autorisés
 * sont ajoutés :
 *  - client_reference_id : identifiant PREUVIA de l'organisation, utilisé pour
 *    le rapprochement côté webhook (jamais l'e-mail seul, voir §9.2 du spec).
 *  - prefilled_email : préremplit l'e-mail de facturation dans Checkout.
 *    Le "verrouillage" complet de l'e-mail (non modifiable par l'utilisateur)
 *    est une option à activer sur le Payment Link lui-même côté Dashboard
 *    Stripe, pas un paramètre d'URL — à configurer manuellement en production.
 */
export function buildCheckoutUrl(
  planId: PlanId,
  params: { organizationId: string; email?: string }
): string | null {
  const baseUrl = getPaymentLink(planId);
  if (!baseUrl) return null;

  const url = new URL(baseUrl);
  url.searchParams.set("client_reference_id", params.organizationId);
  if (params.email) {
    url.searchParams.set("prefilled_email", params.email);
  }
  return url.toString();
}
