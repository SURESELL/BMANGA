import { db } from "@/lib/db";
import { PLANS, type PlanId } from "@/lib/billing/plans";

export interface LimitCheck {
  allowed: boolean;
  limit: number | null; // null = illimité
  current: number;
}

async function getOrgPlan(organizationId: string): Promise<PlanId> {
  const subscription = await db.subscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });
  return (subscription?.plan as PlanId | undefined) ?? "DIAGNOSTIC";
}

/**
 * Vérifie côté serveur si une organisation peut créer un site supplémentaire
 * selon les limites de son offre (PRODUCT_SPEC.md §8). Doit être appelé avant
 * toute création de Site — jamais appliqué uniquement côté UI.
 */
export async function checkSiteLimit(organizationId: string): Promise<LimitCheck> {
  const plan = await getOrgPlan(organizationId);
  const limit = PLANS[plan].limits.sites;

  if (limit === null) {
    return { allowed: true, limit: null, current: -1 };
  }

  const current = await db.site.count({ where: { organizationId } });
  return { allowed: current < limit, limit, current };
}

/**
 * Vérifie côté serveur si une organisation peut activer un utilisateur
 * supplémentaire selon les limites de son offre.
 */
export async function checkUserLimit(organizationId: string): Promise<LimitCheck> {
  const plan = await getOrgPlan(organizationId);
  const limit = PLANS[plan].limits.users;

  if (limit === null) {
    return { allowed: true, limit: null, current: -1 };
  }

  const current = await db.user.count({ where: { organizationId, isActive: true } });
  return { allowed: current < limit, limit, current };
}
