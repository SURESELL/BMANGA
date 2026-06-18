import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const sites = await db.site.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { workUnits: true, users: true },
      },
    },
  });

  return NextResponse.json(sites);
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

  let body: {
    name?: unknown;
    address?: unknown;
    city?: unknown;
    postalCode?: unknown;
    phone?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Le nom du site est requis" }, { status: 400 });
  }

  const site = await db.site.create({
    data: {
      organizationId: orgId,
      name: (body.name as string).trim(),
      address: typeof body.address === "string" ? body.address.trim() || null : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      postalCode: typeof body.postalCode === "string" ? body.postalCode.trim() || null : null,
      phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId,
      action: "CREATE",
      resource: "Site",
      resourceId: site.id,
      details: JSON.stringify({ name: site.name }),
    },
  });

  return NextResponse.json(site, { status: 201 });
}
