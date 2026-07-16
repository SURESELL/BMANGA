import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/rbac";
import type { UserRole } from "@/types";

// Le front-end doit avoir déjà appelé /api/company/siren ou /api/company/siret
// et affiché les données brutes à l'utilisateur avant d'envoyer cette requête :
// "confirmed: true" atteste une confirmation humaine explicite, jamais
// automatique (PRODUCT_SPEC.md 6.3 : "Exiger une confirmation humaine avant
// l'enregistrement").
const importSchema = z.object({
  confirmed: z.literal(true),
  siret: z.string().regex(/^\d{14}$/).optional(),
  siren: z.string().regex(/^\d{9}$/).optional(),
  name: z.string().min(1).max(200),
  naf: z.string().max(10).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  postalCode: z.string().max(10).optional(),
  employeeCount: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  if (!canAccess(role, "organizations", "update")) {
    return NextResponse.json({ error: "Permissions insuffisantes." }, { status: 403 });
  }

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const siret = data.siret ?? undefined;

  const updated = await db.organization.update({
    where: { id: orgId },
    data: {
      name: data.name,
      siret,
      naf: data.naf,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      employeeCount: data.employeeCount,
      siretSource: "API Sirene INSEE 3.11",
      siretFetchedAt: new Date(),
      siretConfirmedBy: session.user.id,
      siretConfirmedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "COMPANY_IMPORT_CONFIRMED",
      resource: "organization",
      resourceId: orgId,
      details: { siret, siren: data.siren },
    },
  });

  return NextResponse.json(updated);
}
