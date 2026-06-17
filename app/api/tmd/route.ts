import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateTMDSchema = z.object({
  unNumber: z.string().min(4).max(4).regex(/^\d{4}$/, "Le numéro ONU doit comporter 4 chiffres"),
  designation: z.string().min(2).max(300),
  hazardClass: z.string().min(1),
  packagingGroup: z.string().optional(),
  transportMode: z.enum(["ROAD_ADR", "RAIL_RID", "WATERWAY_ADN"]).default("ROAD_ADR"),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const items = await db.tMDItem.findMany({
    where: { organizationId: orgId },
    orderBy: [{ hazardClass: "asc" }, { unNumber: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = CreateTMDSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await db.tMDItem.create({
    data: { ...parsed.data, organizationId: orgId },
  });

  return NextResponse.json(item, { status: 201 });
}
