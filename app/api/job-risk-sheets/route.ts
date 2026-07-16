import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const createSchema = z.object({
  jobTitle: z.string().min(2).max(200),
  siteId: z.string().optional(),
  description: z.string().optional(),
  requiredPPE: z.string().optional(),
  requiredTraining: z.string().optional(),
  risksDescription: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const sheets = await db.jobRiskSheet.findMany({
    where: { organizationId: orgId },
    include: { site: { select: { name: true } } },
    orderBy: { jobTitle: "asc" },
  });

  return NextResponse.json(sheets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "job_risk_sheets", "create");
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const { siteId, ...rest } = parsed.data;

  if (siteId) {
    const site = await db.site.findFirst({ where: { id: siteId, organizationId: orgId } });
    if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 400 });
  }

  const sheet = await db.jobRiskSheet.create({
    data: { organizationId: orgId, ...(siteId ? { siteId } : {}), ...rest },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_JOB_RISK_SHEET",
      resource: "job_risk_sheet",
      resourceId: sheet.id,
    },
  });

  return NextResponse.json(sheet, { status: 201 });
}
