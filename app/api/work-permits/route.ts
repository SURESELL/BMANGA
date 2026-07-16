import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const PERMIT_TYPES = ["FIRE", "HEIGHT", "LIFTING", "CONFINED_SPACE", "ELECTRICAL", "LOCKOUT", "ATEX", "CHEMICAL"] as const;

const createSchema = z.object({
  type: z.enum(PERMIT_TYPES),
  title: z.string().min(2).max(200),
  externalCompanyId: z.string().optional(),
  siteId: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const permits = await db.workPermit.findMany({
    where: {
      organizationId: orgId,
      ...(status && { status: status as never }),
      ...(type && { type: type as never }),
    },
    include: {
      externalCompany: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(permits);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "work_permits", "create");
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const { validFrom, validUntil, externalCompanyId, siteId, ...rest } = parsed.data;

  // Les clés étrangères optionnelles doivent appartenir à la MÊME organisation
  // que l'appelant — sans cette vérification, un client pourrait rattacher un
  // permis à l'entreprise externe ou au site d'une autre organisation.
  if (externalCompanyId) {
    const company = await db.externalCompany.findFirst({ where: { id: externalCompanyId, organizationId: orgId } });
    if (!company) return NextResponse.json({ error: "Entreprise extérieure introuvable" }, { status: 400 });
  }
  if (siteId) {
    const site = await db.site.findFirst({ where: { id: siteId, organizationId: orgId } });
    if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 400 });
  }

  const permit = await db.workPermit.create({
    data: {
      organizationId: orgId,
      ...rest,
      ...(externalCompanyId ? { externalCompanyId } : {}),
      ...(siteId ? { siteId } : {}),
      ...(validFrom ? { validFrom: new Date(validFrom) } : {}),
      ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_WORK_PERMIT",
      resource: "work_permit",
      resourceId: permit.id,
      details: { type: permit.type },
    },
  });

  return NextResponse.json(permit, { status: 201 });
}
