import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreatePlanSchema = z.object({
  name: z.string().min(2).max(200),
  productType: z.string().optional(),
  scope: z.string().optional(),
  version: z.number().int().positive().default(1),
});

const CreateCCPSchema = z.object({
  planId: z.string(),
  step: z.string().min(1),
  hazard: z.string().min(1),
  hazardType: z.enum(["BIOLOGICAL", "CHEMICAL", "PHYSICAL", "ALLERGEN"]),
  criticalLimit: z.string().min(1),
  monitoring: z.string().min(1),
  correctiveAction: z.string().optional(),
  verification: z.string().optional(),
  records: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const plans = await db.hACCPPlan.findMany({
    where: { organizationId: orgId },
    include: { ccps: true, prpos: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const { type, ...data } = body;

  if (type === "CCP") {
    const parsed = CreateCCPSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Verify plan belongs to org
    const plan = await db.hACCPPlan.findFirst({ where: { id: parsed.data.planId, organizationId: orgId } });
    if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });

    const ccp = await db.cCP.create({ data: parsed.data });
    return NextResponse.json(ccp, { status: 201 });
  }

  const parsed = CreatePlanSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const plan = await db.hACCPPlan.create({
    data: { ...parsed.data, organizationId: orgId },
    include: { ccps: true, prpos: true },
  });

  return NextResponse.json(plan, { status: 201 });
}
