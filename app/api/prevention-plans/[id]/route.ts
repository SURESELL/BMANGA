import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
  endDate: z.string().datetime().optional(),
  risksDescription: z.string().optional(),
  signedByClient: z.boolean().optional(),
  signedByCompany: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const plan = await db.preventionPlan.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      externalCompany: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "external_companies", "update");
  if (forbidden) return forbidden;

  const existing = await db.preventionPlan.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { endDate, signedByClient, signedByCompany, ...rest } = parsed.data;

  const updated = await db.preventionPlan.update({
    where: { id },
    data: {
      ...rest,
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      ...(signedByClient !== undefined ? { signedByClient, signedByClientAt: signedByClient ? new Date() : null } : {}),
      ...(signedByCompany !== undefined ? { signedByCompany, signedByCompanyAt: signedByCompany ? new Date() : null } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "external_companies", "delete");
  if (forbidden) return forbidden;

  const existing = await db.preventionPlan.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.preventionPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
