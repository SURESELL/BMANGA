import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateESGSchema = z.object({
  category: z.enum(["ENVIRONMENTAL", "SOCIAL", "GOVERNANCE"]),
  name: z.string().min(2).max(200),
  unit: z.string().optional(),
  target: z.number().optional(),
  actual: z.number().optional(),
  year: z.number().int().min(2000).max(2100),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  const indicators = await db.eSGIndicator.findMany({
    where: {
      organizationId: orgId,
      ...(year ? { year: parseInt(year) } : {}),
    },
    orderBy: [{ category: "asc" }, { year: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(indicators);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = CreateESGSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const indicator = await db.eSGIndicator.create({
    data: { ...parsed.data, organizationId: orgId },
  });

  return NextResponse.json(indicator, { status: 201 });
}
