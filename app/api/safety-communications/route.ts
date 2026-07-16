import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const createSchema = z.object({
  type: z.enum(["POSTER", "FLASH"]),
  title: z.string().min(2).max(200),
  content: z.string().min(1),
  siteId: z.string().optional(),
  fileUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get("published") === "true";

  const communications = await db.safetyCommunication.findMany({
    where: {
      organizationId: orgId,
      ...(publishedOnly ? { publishedAt: { not: null } } : {}),
    },
    include: { site: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(communications);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "safety_communications", "create");
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const { siteId, expiresAt, ...rest } = parsed.data;

  if (siteId) {
    const site = await db.site.findFirst({ where: { id: siteId, organizationId: orgId } });
    if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 400 });
  }

  // Créée non publiée par défaut — la publication (visible aux utilisateurs
  // de l'organisation) est une action distincte nécessitant la permission
  // "validate", voir PATCH /api/safety-communications/[id].
  const communication = await db.safetyCommunication.create({
    data: {
      organizationId: orgId,
      createdById: session.user.id,
      ...(siteId ? { siteId } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      ...rest,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_SAFETY_COMMUNICATION",
      resource: "safety_communication",
      resourceId: communication.id,
    },
  });

  return NextResponse.json(communication, { status: 201 });
}
