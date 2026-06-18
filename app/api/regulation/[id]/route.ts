import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const PatchSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(["APPLICABLE", "NOT_APPLICABLE", "TO_VERIFY", "NON_COMPLIANT"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const regulation = await db.regulation.findFirst({
    where: { id, OR: [{ organizationId: orgId ?? undefined }, { organizationId: null }] },
    include: {
      obligations: {
        select: {
          id: true,
          title: true,
          description: true,
          expectedEvidence: true,
          complianceLevel: true,
          criticality: true,
          isValidatedByExpert: true,
          expertValidationNote: true,
          disclaimer: true,
          dueDate: true,
        },
        orderBy: { criticality: "asc" },
      },
    },
  });

  if (!regulation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    ...regulation,
    notes: regulation.description ?? null,
    status: regulation.conditions ?? null,
    officialSource: regulation.source,
    publishedAt: regulation.publicationDate ?? null,
    scope: regulation.applicableScope ?? null,
    applicabilityCondition: regulation.conditions ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const regulation = await db.regulation.findFirst({
    where: { id, organizationId: orgId ?? undefined },
  });
  if (!regulation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { notes, status } = parsed.data;

  const updated = await db.regulation.update({
    where: { id },
    data: {
      ...(notes !== undefined ? { description: notes } : {}),
      ...(status !== undefined ? { conditions: status } : {}),
    },
  });

  return NextResponse.json({
    ...updated,
    notes: updated.description ?? null,
    status: updated.conditions ?? null,
  });
}
