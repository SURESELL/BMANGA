import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  siret: z.string().regex(/^\d{14}$/).optional(),
  activity: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  insuranceValidUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const companies = await db.externalCompany.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { workPermits: true, preventionPlans: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "external_companies", "create");
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const { insuranceValidUntil, ...rest } = parsed.data;

  const company = await db.externalCompany.create({
    data: {
      organizationId: orgId,
      ...rest,
      ...(insuranceValidUntil ? { insuranceValidUntil: new Date(insuranceValidUntil) } : {}),
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_EXTERNAL_COMPANY",
      resource: "external_company",
      resourceId: company.id,
    },
  });

  return NextResponse.json(company, { status: 201 });
}
