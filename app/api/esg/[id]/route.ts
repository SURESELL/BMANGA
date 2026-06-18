import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const indicator = await db.eSGIndicator.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!indicator) return NextResponse.json({ error: "Indicateur introuvable" }, { status: 404 });

  return NextResponse.json(indicator);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const existing = await db.eSGIndicator.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Indicateur introuvable" }, { status: 404 });

  let body: { notes?: string; actual?: number; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const updated = await db.eSGIndicator.update({
    where: { id: params.id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.actual !== undefined && { actual: body.actual }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const existing = await db.eSGIndicator.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Indicateur introuvable" }, { status: 404 });

  await db.eSGIndicator.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
