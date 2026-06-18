import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateAspectSchema = z.object({
  activity: z.string().min(2).max(200),
  aspect: z.string().min(2).max(200),
  impact: z.string().min(2).max(200),
  impactType: z.enum(["AIR", "WATER", "SOIL", "WASTE", "ENERGY", "BIODIVERSITY", "NOISE"]),
  significance: z.enum(["SIGNIFICANT", "NOT_SIGNIFICANT"]).default("NOT_SIGNIFICANT"),
  complianceLevel: z.enum(["COMPLIANT", "PARTIAL", "NON_COMPLIANT", "TO_EVALUATE"]).default("TO_EVALUATE"),
  controlMeasures: z.string().optional(),
});

const CreateICPESchema = z.object({
  rubrique: z.string().min(1).max(20),
  designation: z.string().min(2).max(300),
  regime: z.enum(["DECLARATION", "ENREGISTREMENT", "AUTORISATION"]),
  threshold: z.string().optional(),
  actualQuantity: z.string().optional(),
  prescriptions: z.string().optional(),
  nextInspectionAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ aspects: [], icpeItems: [], tmdItems: [] });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "icpe") {
    const items = await db.iCPEItem.findMany({ where: { organizationId: orgId }, orderBy: { rubrique: "asc" } });
    return NextResponse.json(items);
  }

  if (type === "tmd") {
    const items = await db.tMDItem.findMany({ where: { organizationId: orgId }, orderBy: { hazardClass: "asc" } });
    return NextResponse.json(items);
  }

  const [aspects, icpeItems, tmdItems] = await Promise.all([
    db.environmentalAspect.findMany({ where: { organizationId: orgId }, orderBy: { significance: "asc" } }),
    db.iCPEItem.findMany({ where: { organizationId: orgId }, orderBy: { regime: "asc" } }),
    db.tMDItem.findMany({ where: { organizationId: orgId }, orderBy: { hazardClass: "asc" } }),
  ]);

  return NextResponse.json({ aspects, icpeItems, tmdItems });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const { resourceType, ...data } = body;

  if (resourceType === "icpe") {
    const parsed = CreateICPESchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { nextInspectionAt, ...rest } = parsed.data;
    const item = await db.iCPEItem.create({
      data: { ...rest, organizationId: orgId, ...(nextInspectionAt ? { nextInspectionAt: new Date(nextInspectionAt) } : {}) },
    });
    return NextResponse.json(item, { status: 201 });
  }

  const parsed = CreateAspectSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const aspect = await db.environmentalAspect.create({
    data: { ...parsed.data, organizationId: orgId },
  });

  return NextResponse.json(aspect, { status: 201 });
}
