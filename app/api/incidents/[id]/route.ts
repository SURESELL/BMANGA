import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  severity: z.enum(["NEAR_MISS", "MINOR", "SIGNIFICANT", "SERIOUS", "CRITICAL", "FATAL"]).optional(),
  status: z.enum(["DECLARED", "UNDER_INVESTIGATION", "CLOSED", "ARCHIVED"]).optional(),
  notes: z.string().optional(),
  closedAt: z.string().datetime().optional(),
  location: z.string().optional(),
  immediateActions: z.string().optional(),
  rootCauses: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const incident = await db.incident.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      reporter: { select: { name: true, email: true } },
      site: { select: { name: true } },
      _count: { select: { actionPlans: true } },
    },
  });

  if (!incident) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(incident);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const incident = await db.incident.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!incident) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { closedAt, ...rest } = parsed.data;
  const shouldClose = rest.status === "CLOSED" && incident.status !== "CLOSED";

  const updated = await db.incident.update({
    where: { id },
    data: {
      ...rest,
      ...(closedAt ? { closedAt: new Date(closedAt) } : {}),
      ...(shouldClose && !closedAt ? { closedAt: new Date() } : {}),
    },
    include: {
      reporter: { select: { name: true, email: true } },
      site: { select: { name: true } },
      _count: { select: { actionPlans: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const incident = await db.incident.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!incident) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.incident.update({ where: { id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ ok: true });
}
