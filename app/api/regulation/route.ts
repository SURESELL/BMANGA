import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateRegulationSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().optional(),
  domain: z.string().min(1),
  source: z.string().min(1),
  officialLink: z.string().url().optional(),
  publicationDate: z.string().datetime().optional(),
  effectiveDate: z.string().datetime().optional(),
  applicableScope: z.string().optional(),
  conditions: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;

  const regulations = await db.regulation.findMany({
    where: { OR: [{ organizationId: orgId ?? undefined }, { organizationId: null }] },
    include: { obligations: { select: { id: true, complianceLevel: true } } },
    orderBy: [{ domain: "asc" }, { title: "asc" }],
  });

  return NextResponse.json(regulations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = CreateRegulationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { publicationDate, effectiveDate, ...rest } = parsed.data;

  const regulation = await db.regulation.create({
    data: {
      ...rest,
      organizationId: orgId,
      ...(publicationDate ? { publicationDate: new Date(publicationDate) } : {}),
      ...(effectiveDate ? { effectiveDate: new Date(effectiveDate) } : {}),
    },
  });

  return NextResponse.json(regulation, { status: 201 });
}
