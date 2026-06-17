import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  notes: z.string().optional(),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  ownerId: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const nc = await db.nonConformity.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      audit: { select: { title: true, type: true } },
    },
  });

  if (!nc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(nc);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const nc = await db.nonConformity.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!nc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { dueDate, ...rest } = parsed.data;
  const shouldComplete = rest.status === "DONE" && nc.status !== "DONE";

  const updated = await db.nonConformity.update({
    where: { id },
    data: {
      ...rest,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(shouldComplete ? { closedAt: new Date() } : {}),
    },
    include: {
      audit: { select: { title: true, type: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const nc = await db.nonConformity.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!nc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.nonConformity.update({ where: { id }, data: { status: "CANCELED" } });
  return NextResponse.json({ ok: true });
}
