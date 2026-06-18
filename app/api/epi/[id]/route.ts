import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const epi = await db.ePIItem.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (epi) return NextResponse.json({ ...epi, resourceType: "epi" });

  const verification = await db.periodicVerification.findFirst({
    where: { id: params.id, organizationId: orgId },
  });
  if (verification) return NextResponse.json({ ...verification, resourceType: "verification" });

  return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  if (resourceType === "epi") {
    const existing = await db.ePIItem.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "EPI introuvable" }, { status: 404 });
    const updated = await db.ePIItem.update({ where: { id: params.id }, data: fields });
    return NextResponse.json({ ...updated, resourceType: "epi" });
  }

  if (resourceType === "verification") {
    const existing = await db.periodicVerification.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!existing) return NextResponse.json({ error: "Vérification introuvable" }, { status: 404 });
    const updated = await db.periodicVerification.update({ where: { id: params.id }, data: fields });
    return NextResponse.json({ ...updated, resourceType: "verification" });
  }

  return NextResponse.json({ error: "resourceType requis (epi ou verification)" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const epi = await db.ePIItem.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (epi) {
    await db.ePIItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  const verification = await db.periodicVerification.findFirst({
    where: { id: params.id, organizationId: orgId },
  });
  if (verification) {
    await db.periodicVerification.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
}
