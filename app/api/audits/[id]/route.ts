import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateAuditSchema = z.object({
  status: z.enum(["PLANNED", "IN_PROGRESS", "CLOSED", "CANCELED"]).optional(),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  closedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const audit = await db.audit.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      site: { select: { name: true } },
      checklists: { orderBy: [{ section: "asc" }, { order: "asc" }] },
      findings: { orderBy: { createdAt: "desc" } },
      nonConformities: { orderBy: { createdAt: "desc" } },
      actionPlans: { orderBy: { priority: "desc" } },
    },
  });

  if (!audit) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(audit);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const audit = await db.audit.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!audit) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateAuditSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { closedAt, startedAt, ...rest } = parsed.data;

  const updated = await db.audit.update({
    where: { id },
    data: {
      ...rest,
      ...(closedAt ? { closedAt: new Date(closedAt) } : {}),
      ...(startedAt ? { startedAt: new Date(startedAt) } : {}),
    },
  });

  return NextResponse.json(updated);
}
