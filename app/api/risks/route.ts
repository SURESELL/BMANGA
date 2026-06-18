import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateRiskScore, getRiskLevel } from "@/lib/utils";

const createRiskSchema = z.object({
  workUnitId:           z.string().optional(),
  siteId:               z.string().optional(),
  hazardId:             z.string().optional(),
  hazardDescription:    z.string().min(5).max(500),
  situationDangereux:   z.string().optional(),
  exposedPersons:       z.string().optional(),
  existingMeasures:     z.string().optional(),
  grossFrequency:       z.number().int().min(1).max(5),
  grossGravity:         z.number().int().min(1).max(5),
  grossMastery:         z.number().int().min(1).max(3),
  notes:                z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const siteId = searchParams.get("siteId");

  const risks = await db.risk.findMany({
    where: {
      organizationId: orgId,
      ...(level && { riskLevel: level as never }),
      ...(siteId && { siteId }),
    },
    include: {
      workUnit:   { select: { name: true } },
      hazard:     { select: { name: true, family: true } },
      actionPlans: { select: { id: true, status: true } },
    },
    orderBy: [{ riskLevel: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(risks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const body = await req.json();
  const parsed = createRiskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const { grossFrequency, grossGravity, grossMastery, ...rest } = parsed.data;
  const grossRisk = calculateRiskScore(grossFrequency, grossGravity, grossMastery);
  const riskLevel = getRiskLevel(grossRisk);

  const risk = await db.risk.create({
    data: {
      organizationId: orgId,
      grossFrequency,
      grossGravity,
      grossMastery,
      grossRisk,
      residualFrequency: grossFrequency,
      residualGravity: grossGravity,
      residualMastery: grossMastery,
      residualRisk: grossRisk,
      riskLevel,
      ...rest,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_RISK",
      resource: "risk",
      resourceId: risk.id,
    },
  });

  return NextResponse.json(risk, { status: 201 });
}
