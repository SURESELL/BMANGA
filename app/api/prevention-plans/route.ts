import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const createSchema = z.object({
  externalCompanyId: z.string(),
  siteId: z.string().optional(),
  title: z.string().min(2).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  risksDescription: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const plans = await db.preventionPlan.findMany({
    where: { organizationId: orgId },
    include: {
      externalCompany: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
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

  const { externalCompanyId, siteId, startDate, endDate, ...rest } = parsed.data;

  const company = await db.externalCompany.findFirst({ where: { id: externalCompanyId, organizationId: orgId } });
  if (!company) return NextResponse.json({ error: "Entreprise extérieure introuvable" }, { status: 400 });

  if (siteId) {
    const site = await db.site.findFirst({ where: { id: siteId, organizationId: orgId } });
    if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 400 });
  }

  const plan = await db.preventionPlan.create({
    data: {
      organizationId: orgId,
      externalCompanyId,
      ...(siteId ? { siteId } : {}),
      ...rest,
      startDate: new Date(startDate),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_PREVENTION_PLAN",
      resource: "prevention_plan",
      resourceId: plan.id,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
