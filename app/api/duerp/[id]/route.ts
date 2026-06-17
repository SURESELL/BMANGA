import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const duerp = await db.dUERP.findFirst({
    where: { id, organizationId: orgId },
    include: {
      workUnits: {
        include: {
          risks: {
            include: { hazard: true },
          },
        },
      },
      risks: {
        include: {
          hazard: true,
          workUnit: true,
          actionPlans: {
            include: { owner: true },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  if (!duerp) {
    return NextResponse.json({ error: "DUERP introuvable" }, { status: 404 });
  }

  return NextResponse.json(duerp);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const userId = session.user.id;

  if (!orgId || !userId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const { id } = await ctx.params;

  // Verify org isolation
  const existing = await db.dUERP.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "DUERP introuvable" }, { status: 404 });
  }

  let body: { status?: unknown; validatedAt?: unknown; notes?: unknown };
  try {
    body = (await req.json()) as { status?: unknown; validatedAt?: unknown; notes?: unknown };
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const validStatuses = ["DRAFT", "ACTIVE", "VALIDATED", "ARCHIVED", "CLOSED"];
    if (typeof body.status !== "string" || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    updateData.status = body.status;
    if (body.status === "VALIDATED" && !body.validatedAt) {
      updateData.validatedAt = new Date();
    }
  }

  if (body.validatedAt !== undefined) {
    updateData.validatedAt = body.validatedAt ? new Date(body.validatedAt as string) : null;
  }

  if (body.notes !== undefined) {
    updateData.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
  }

  const updated = await db.dUERP.update({
    where: { id },
    data: updateData,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId,
      action: "UPDATE",
      resource: "DUERP",
      resourceId: id,
      details: JSON.stringify(updateData),
    },
  });

  return NextResponse.json(updated);
}
