import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Crée une nouvelle version DRAFT à partir d'un DUERP validé (immuable).
 * C'est le seul moyen de faire évoluer un DUERP une fois validé — voir
 * PATCH /api/duerp/[id] qui refuse toute modification en place dès que
 * `validatedAt` est renseigné (PRODUCT_SPEC.md : "Une version validée du
 * DUERP doit être immuable. Toute modification doit créer une nouvelle
 * version ou révision.").
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const userId = session.user.id;
  if (!orgId || !userId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "duerp", "update");
  if (forbidden) return forbidden;

  const { id } = await ctx.params;

  const source = await db.dUERP.findFirst({
    where: { id, organizationId: orgId },
    include: {
      workUnits: { select: { id: true } },
      risks: { select: { id: true } },
    },
  });

  if (!source) return NextResponse.json({ error: "DUERP introuvable" }, { status: 404 });

  if (!source.validatedAt) {
    return NextResponse.json(
      { error: "Seule une version validée peut faire l'objet d'une révision. Modifiez ce brouillon directement." },
      { status: 400 }
    );
  }

  let body: { year?: unknown; notes?: unknown } = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  const year = typeof body.year === "number" ? body.year : source.year;
  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  const lastVersion = await db.dUERP.findFirst({
    where: { organizationId: orgId, year },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (lastVersion?.version ?? 0) + 1;

  const revision = await db.$transaction(async (tx) => {
    const created = await tx.dUERP.create({
      data: {
        organizationId: orgId,
        year,
        version,
        status: "DRAFT",
        notes,
        previousVersionId: source.id,
        // Reprend le périmètre (unités de travail, risques) de la version
        // validée comme point de départ — l'équipe édite ensuite cette
        // nouvelle version librement tant qu'elle n'est pas à son tour validée.
        workUnits: { connect: source.workUnits.map((w) => ({ id: w.id })) },
        risks: { connect: source.risks.map((r) => ({ id: r.id })) },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: "CREATE_REVISION",
        resource: "DUERP",
        resourceId: created.id,
        details: JSON.stringify({ previousVersionId: source.id, previousVersion: source.version, newVersion: version, year }),
      },
    });

    return created;
  });

  return NextResponse.json(revision, { status: 201 });
}
