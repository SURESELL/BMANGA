import { db } from "@/lib/db";

/**
 * Retourne l'espace consultant (cabinet) de l'utilisateur, ou null s'il n'en
 * a pas. Ne fait jamais confiance à un consultancyWorkspaceId fourni par le
 * client HTTP — toujours dérivé de la session/DB.
 */
export async function getUserConsultancyWorkspaceId(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { consultancyWorkspaceId: true },
  });
  return user?.consultancyWorkspaceId ?? null;
}

/**
 * Vérifie qu'un cabinet a un accès ACTIF à une organisation cliente donnée.
 * C'est le seul point de contrôle qui doit gater tout accès consultant à des
 * données d'un client — jamais un simple organizationId passé en paramètre.
 */
export async function hasActiveClientAccess(
  consultancyWorkspaceId: string,
  organizationId: string
): Promise<boolean> {
  const access = await db.consultantClientAccess.findUnique({
    where: {
      consultancyWorkspaceId_organizationId: {
        consultancyWorkspaceId,
        organizationId,
      },
    },
  });
  return !!access && access.status === "ACTIVE";
}

/** Liste les organisations clientes actuellement accessibles à un cabinet. */
export async function listAccessibleOrganizationIds(consultancyWorkspaceId: string): Promise<string[]> {
  const rows = await db.consultantClientAccess.findMany({
    where: { consultancyWorkspaceId, status: "ACTIVE" },
    select: { organizationId: true },
  });
  return rows.map((r) => r.organizationId);
}
