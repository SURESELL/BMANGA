import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateActionPlanSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  ownerId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  budget: z.number().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const ap = await db.actionPlan.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      risk: { select: { title: true, riskLevel: true } },
      incident: { select: { title: true, severity: true } },
      audit: { select: { title: true, type: true } },
    },
  });

  if (!ap) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(ap);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const ap = await db.actionPlan.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!ap) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateActionPlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { dueDate, completedAt, ...rest } = parsed.data;

  // Auto-set completedAt when marking DONE
  const shouldComplete = rest.status === "DONE" && ap.status !== "DONE";

  const updated = await db.actionPlan.update({
    where: { id },
    data: {
      ...rest,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(completedAt ? { completedAt: new Date(completedAt) } : {}),
      ...(shouldComplete && !completedAt ? { completedAt: new Date() } : {}),
    },
    include: { owner: { select: { name: true, email: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const ap = await db.actionPlan.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!ap) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.actionPlan.update({ where: { id }, data: { status: "CANCELED" } });
  return NextResponse.json({ ok: true });
}
