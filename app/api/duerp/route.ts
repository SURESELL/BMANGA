import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const duerps = await db.dUERP.findMany({
    where: { organizationId: orgId },
    orderBy: [{ year: "desc" }, { version: "desc" }],
    include: {
      _count: {
        select: { workUnits: true, risks: true },
      },
    },
  });

  return NextResponse.json(duerps);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const userId = session.user.id;

  if (!orgId || !userId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "duerp", "create");
  if (forbidden) return forbidden;

  let body: { year?: unknown; notes?: unknown };
  try {
    body = (await req.json()) as { year?: unknown; notes?: unknown };
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  const year = typeof body.year === "number" ? body.year : Number(body.year);
  const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

  if (!year || isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }

  // Compute next version for that year+org
  const lastVersion = await db.dUERP.findFirst({
    where: { organizationId: orgId, year },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (lastVersion?.version ?? 0) + 1;

  const duerp = await db.dUERP.create({
    data: {
      organizationId: orgId,
      year,
      version,
      notes: notes ?? null,
      status: "DRAFT",
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId,
      action: "CREATE",
      resource: "DUERP",
      resourceId: duerp.id,
      details: JSON.stringify({ year, version }),
    },
  });

  return NextResponse.json(duerp, { status: 201 });
}
