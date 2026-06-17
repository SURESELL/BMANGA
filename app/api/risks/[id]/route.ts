import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  hazardDescription: z.string().min(2).optional(),
  situationDangereux: z.string().optional(),
  exposedPersons: z.string().optional(),
  existingMeasures: z.string().optional(),
  grossFrequency: z.number().int().min(1).max(5).optional(),
  grossGravity: z.number().int().min(1).max(5).optional(),
  grossMastery: z.number().int().min(1).max(3).optional(),
  residualFrequency: z.number().int().min(1).max(5).optional(),
  residualGravity: z.number().int().min(1).max(5).optional(),
  residualMastery: z.number().int().min(1).max(3).optional(),
  riskLevel: z.enum(["NEGLIGIBLE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
  siteId: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const risk = await db.risk.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      site: { select: { name: true } },
      owner: { select: { name: true, email: true } },
      actionPlans: { select: { id: true } },
    },
  });

  if (!risk) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    ...risk,
    _count: { actionPlans: risk.actionPlans.length },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const risk = await db.risk.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!risk) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const grossFrequency = data.grossFrequency ?? risk.grossFrequency;
  const grossGravity = data.grossGravity ?? risk.grossGravity;
  const grossMastery = data.grossMastery ?? risk.grossMastery;
  const residualFrequency = data.residualFrequency ?? risk.residualFrequency;
  const residualGravity = data.residualGravity ?? risk.residualGravity;
  const residualMastery = data.residualMastery ?? risk.residualMastery;

  const shouldRecalcGross = data.grossFrequency !== undefined || data.grossGravity !== undefined || data.grossMastery !== undefined;
  const shouldRecalcResidual = data.residualFrequency !== undefined || data.residualGravity !== undefined || data.residualMastery !== undefined;

  const updated = await db.risk.update({
    where: { id },
    data: {
      ...data,
      ...(shouldRecalcGross ? { grossRisk: Math.round((grossFrequency * grossGravity) / grossMastery) } : {}),
      ...(shouldRecalcResidual ? { residualRisk: Math.round((residualFrequency * residualGravity) / residualMastery) } : {}),
    },
    include: {
      site: { select: { name: true } },
      owner: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
