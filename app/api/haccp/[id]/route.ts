import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const plan = await db.hACCPPlan.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: { ccps: true, prpos: true },
  });
  if (plan) return NextResponse.json({ ...plan, resourceType: "plan" });

  const ccp = await db.cCP.findFirst({
    where: { id: params.id },
    include: { plan: { select: { organizationId: true, name: true } } },
  });
  if (ccp && ccp.plan.organizationId === orgId) {
    const { plan: _plan, ...rest } = ccp;
    return NextResponse.json({ ...rest, resourceType: "ccp" });
  }

  return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { resourceType, ...fields } = body;

  if (resourceType === "plan") {
    const existing = await db.hACCPPlan.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Plan HACCP introuvable" }, { status: 404 });
    const updated = await db.hACCPPlan.update({ where: { id: params.id }, data: fields });
    return NextResponse.json({ ...updated, resourceType: "plan" });
  }

  if (resourceType === "ccp") {
    const existing = await db.cCP.findFirst({
      where: { id: params.id },
      include: { plan: { select: { organizationId: true } } },
    });
    if (!existing || existing.plan.organizationId !== orgId) {
      return NextResponse.json({ error: "CCP introuvable" }, { status: 404 });
    }
    const updated = await db.cCP.update({ where: { id: params.id }, data: fields });
    return NextResponse.json({ ...updated, resourceType: "ccp" });
  }

  return NextResponse.json({ error: "resourceType requis (plan ou ccp)" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const plan = await db.hACCPPlan.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (plan) {
    await db.hACCPPlan.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  const ccp = await db.cCP.findFirst({
    where: { id: params.id },
    include: { plan: { select: { organizationId: true } } },
  });
  if (ccp && ccp.plan.organizationId === orgId) {
    await db.cCP.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
}
