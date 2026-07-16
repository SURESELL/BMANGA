/**
 * Retire d'un corps de requête client les clés qui ne doivent jamais être
 * assignables en masse (identifiants, clés étrangères de tenant, horodatages
 * gérés par Prisma) avant de le passer tel quel à un `update()`. Sans ce
 * filtre, un PATCH qui fait `data: { ...body }` laisserait un appelant
 * réassigner une ressource à une autre organisation en incluant simplement
 * `organizationId` (ou l'équivalent `planId`/`siteId` selon le modèle) dans
 * le corps de la requête — un contournement direct du scoping multi-tenant.
 */
export function omitProtectedFields<T extends Record<string, unknown>>(
  body: T,
  extraKeys: string[] = []
): Record<string, unknown> {
  const protectedKeys = new Set(["id", "organizationId", "createdAt", "updatedAt", ...extraKeys]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!protectedKeys.has(key)) result[key] = value;
  }
  return result;
}
