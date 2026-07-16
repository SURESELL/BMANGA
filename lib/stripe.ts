import Stripe from "stripe";

let cached: Stripe | null = null;

/** Lève une erreur explicite plutôt que d'échouer silencieusement si la clé
 * n'est pas configurée — évite qu'un webhook ou un paiement se comporte comme
 * si tout fonctionnait alors qu'aucune clé Stripe n'est présente. */
export function getStripeClient(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquante — configuration Stripe requise pour cette opération.");
  }
  cached = new Stripe(key);
  return cached;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
