import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserConsultancyWorkspaceId, hasActiveClientAccess } from "@/lib/consultant/access";

/**
 * Vue d'ensemble en lecture seule d'un client pour son cabinet consultant
 * (Phase 2, PLANS.md — "rapports par client", partiel). L'accès n'est
 * JAMAIS accordé sur la base de l'organizationId de l'URL seul : il faut un
 * accès ACTIF du cabinet à cette organisation précise
 * (hasActiveClientAccess), dérivé du userId de la session, jamais d'un
 * paramètre client. Une organisation qui ne serait pas cliente de ce cabinet
 * (ou dont l'accès a été révoqué) renvoie 404, jamais les données.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "CONSULTANT" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Permissions insuffisantes." }, { status: 403 });
  }

  const workspaceId = await getUserConsultancyWorkspaceId(session.user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: "Aucun espace consultant associé à ce compte." }, { status: 403 });
  }

  const { organizationId } = await params;

  const allowed = await hasActiveClientAccess(workspaceId, organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Client introuvable ou accès révoqué." }, { status: 404 });
  }

  const [organization, subscription, siteCount, userCount, latestDuerp, risksByLevel, openIncidentCount] =
    await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, siret: true, sector: true, createdAt: true },
      }),
      db.subscription.findUnique({
        where: { organizationId },
        select: { plan: true, status: true, currentPeriodEnd: true },
      }),
      db.site.count({ where: { organizationId, deletedAt: null } }),
      db.user.count({ where: { organizationId, isActive: true } }),
      db.dUERP.findFirst({
        where: { organizationId },
        orderBy: [{ year: "desc" }, { version: "desc" }],
        select: { id: true, year: true, version: true, status: true, validatedAt: true, nextReviewDate: true },
      }),
      db.risk.groupBy({
        by: ["riskLevel"],
        where: { organizationId },
        _count: { _all: true },
      }),
      db.incident.count({
        where: { organizationId, status: { in: ["DECLARED", "UNDER_INVESTIGATION"] } },
      }),
    ]);

  if (!organization) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    organization,
    subscription: subscription ?? { plan: "DIAGNOSTIC", status: "FREE", currentPeriodEnd: null },
    siteCount,
    userCount,
    latestDuerp,
    risksByLevel: risksByLevel.map((r) => ({ level: r.riskLevel, count: r._count._all })),
    openIncidentCount,
  });
}
