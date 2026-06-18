import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const evidenceSchema = z.object({
  indicatorId:    z.string(),
  title:          z.string().min(3).max(200),
  description:    z.string().optional(),
  fileUrl:        z.string().url().optional(),
  complianceLevel: z.enum(["COMPLIANT", "PARTIAL", "NON_COMPLIANT", "NOT_APPLICABLE", "TO_EVALUATE"]),
  notes:          z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const criteria = await db.qualiopiCriterion.findMany({
    orderBy: { order: "asc" },
    include: {
      indicators: {
        include: {
          evidences: { where: { organizationId: orgId } },
        },
      },
    },
  });

  return NextResponse.json(criteria);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const body = await req.json();
  const parsed = evidenceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const evidence = await db.qualiopiEvidence.upsert({
    where: {
      // Use find+create/update pattern since no unique constraint on org+indicator
      id: (await db.qualiopiEvidence.findFirst({
        where: { organizationId: orgId, indicatorId: parsed.data.indicatorId },
        select: { id: true },
      }))?.id ?? "non-existent",
    },
    create: {
      organizationId: orgId,
      indicatorId: parsed.data.indicatorId,
      title: parsed.data.title,
      description: parsed.data.description,
      fileUrl: parsed.data.fileUrl,
      complianceLevel: parsed.data.complianceLevel,
      notes: parsed.data.notes,
    },
    update: {
      title: parsed.data.title,
      description: parsed.data.description,
      fileUrl: parsed.data.fileUrl,
      complianceLevel: parsed.data.complianceLevel,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json(evidence, { status: 201 });
}
