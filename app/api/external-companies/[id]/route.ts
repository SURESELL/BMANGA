import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  siret: z.string().regex(/^\d{14}$/).optional(),
  activity: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  insuranceValidUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const company = await db.externalCompany.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      workPermits: { orderBy: { createdAt: "desc" }, take: 20 },
      preventionPlans: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!company) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "external_companies", "update");
  if (forbidden) return forbidden;

  const existing = await db.externalCompany.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { insuranceValidUntil, ...rest } = parsed.data;

  const updated = await db.externalCompany.update({
    where: { id },
    data: {
      ...rest,
      ...(insuranceValidUntil !== undefined ? { insuranceValidUntil: new Date(insuranceValidUntil) } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "external_companies", "delete");
  if (forbidden) return forbidden;

  const existing = await db.externalCompany.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const activePermits = await db.workPermit.count({
    where: { externalCompanyId: id, status: { in: ["ISSUED", "SUSPENDED"] } },
  });
  if (activePermits > 0) {
    return NextResponse.json(
      { error: "Impossible de supprimer : cette entreprise a des permis de travail actifs. Clôturez-les d'abord." },
      { status: 409 }
    );
  }

  await db.externalCompany.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "DELETE_EXTERNAL_COMPANY",
      resource: "external_company",
      resourceId: id,
    },
  });

  return NextResponse.json({ success: true });
}
