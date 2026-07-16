import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const updateSchema = z.object({
  jobTitle: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  requiredPPE: z.string().optional(),
  requiredTraining: z.string().optional(),
  risksDescription: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const sheet = await db.jobRiskSheet.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: { site: { select: { name: true } } },
  });

  if (!sheet) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(sheet);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "job_risk_sheets", "update");
  if (forbidden) return forbidden;

  const existing = await db.jobRiskSheet.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await db.jobRiskSheet.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "job_risk_sheets", "delete");
  if (forbidden) return forbidden;

  const existing = await db.jobRiskSheet.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.jobRiskSheet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
