import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const site = await db.site.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: {
      _count: { select: { risks: true, epiItems: true } },
    },
  });

  if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 404 });

  return NextResponse.json(site);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const existing = await db.site.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Site introuvable" }, { status: 404 });

  let body: { name?: string; address?: string; city?: string; postalCode?: string; managerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const updated = await db.site.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
      ...(body.managerId !== undefined && { managerId: body.managerId }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const site = await db.site.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: { _count: { select: { risks: true } } },
  });

  if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
  if (site._count.risks > 0) {
    return NextResponse.json(
      { error: "Ce site contient des risques liés. Supprimez-les d'abord." },
      { status: 400 }
    );
  }

  await db.site.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
