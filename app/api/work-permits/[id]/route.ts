import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const editSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

const transitionSchema = z.object({
  action: z.enum(["issue", "suspend", "resume", "close"]),
  reason: z.string().max(1000).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const permit = await db.workPermit.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      externalCompany: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
  });

  if (!permit) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(permit);
}

/**
 * Cycle de vie explicite (PLANS.md Phase 5) : DRAFT -> ISSUED -> SUSPENDED
 * -> ISSUED (reprise) -> CLOSED. CLOSED est terminal. Chaque transition est
 * une action nommée (jamais une simple écriture libre de `status`), validée
 * serveur, et journalisée dans AuditLog — c'est l'historique requis par le
 * spec. Distinct d'une simple édition de champs (titre/description/dates),
 * qui ne change jamais le statut et reste possible à tout moment sauf sur un
 * permis clôturé.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const permit = await db.workPermit.findFirst({ where: { id, organizationId: orgId } });
  if (!permit) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  if ("action" in body) {
    const forbidden = requirePermission((session.user as { role?: UserRole }).role, "work_permits", "validate");
    if (forbidden) return forbidden;

    const parsed = transitionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { action, reason } = parsed.data;

    if (permit.status === "CLOSED") {
      return NextResponse.json({ error: "Ce permis est clôturé et ne peut plus changer de statut." }, { status: 409 });
    }

    let data: Record<string, unknown>;
    let auditAction: string;

    switch (action) {
      case "issue":
        if (permit.status !== "DRAFT") {
          return NextResponse.json({ error: `Impossible d'émettre un permis au statut ${permit.status} (doit être DRAFT).` }, { status: 409 });
        }
        data = { status: "ISSUED", issuedAt: new Date(), issuedBy: session.user.id };
        auditAction = "ISSUE_WORK_PERMIT";
        break;
      case "suspend":
        if (permit.status !== "ISSUED") {
          return NextResponse.json({ error: `Impossible de suspendre un permis au statut ${permit.status} (doit être ISSUED).` }, { status: 409 });
        }
        if (!reason) return NextResponse.json({ error: "Un motif de suspension est requis." }, { status: 400 });
        data = { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: reason };
        auditAction = "SUSPEND_WORK_PERMIT";
        break;
      case "resume":
        if (permit.status !== "SUSPENDED") {
          return NextResponse.json({ error: `Impossible de reprendre un permis au statut ${permit.status} (doit être SUSPENDED).` }, { status: 409 });
        }
        data = { status: "ISSUED", resumedAt: new Date() };
        auditAction = "RESUME_WORK_PERMIT";
        break;
      case "close":
        data = { status: "CLOSED", closedAt: new Date(), closedBy: session.user.id };
        auditAction = "CLOSE_WORK_PERMIT";
        break;
    }

    const updated = await db.workPermit.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: auditAction,
        resource: "work_permit",
        resourceId: id,
        details: { previousStatus: permit.status, newStatus: updated.status, reason: reason ?? null },
      },
    });

    return NextResponse.json(updated);
  }

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "work_permits", "update");
  if (forbidden) return forbidden;

  if (permit.status === "CLOSED") {
    return NextResponse.json({ error: "Ce permis est clôturé et ne peut plus être modifié." }, { status: 409 });
  }

  const parsed = editSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { validFrom, validUntil, ...rest } = parsed.data;

  const updated = await db.workPermit.update({
    where: { id },
    data: {
      ...rest,
      ...(validFrom ? { validFrom: new Date(validFrom) } : {}),
      ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "work_permits", "delete");
  if (forbidden) return forbidden;

  const permit = await db.workPermit.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!permit) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (permit.status === "ISSUED" || permit.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Impossible de supprimer un permis actif. Clôturez-le d'abord." },
      { status: 409 }
    );
  }

  await db.workPermit.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "DELETE_WORK_PERMIT",
      resource: "work_permit",
      resourceId: id,
    },
  });

  return NextResponse.json({ success: true });
}
