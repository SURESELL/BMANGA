import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  void req; // unused but required by Next.js route signature
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const role = (session.user as { role?: string })?.role;
  const orgId = (session.user as { organizationId?: string })?.organizationId;

  if (role === "SUPER_ADMIN") {
    const organizations = await db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: { select: { plan: true, status: true } },
        _count: {
          select: { users: true, sites: true },
        },
      },
    });
    return NextResponse.json(organizations);
  }

  // Non-super-admin: return only own org
  if (!orgId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      subscription: { select: { plan: true, status: true } },
      _count: {
        select: { users: true, sites: true },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
  }

  return NextResponse.json(org);
}
