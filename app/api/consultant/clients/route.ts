import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getUserConsultancyWorkspaceId } from "@/lib/consultant/access";

const createClientSchema = z.object({
  name: z.string().min(2).max(200),
  siret: z.string().regex(/^\d{14}$/).optional(),
  sector: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const workspaceId = await getUserConsultancyWorkspaceId(userId);
  if (!workspaceId) {
    return NextResponse.json({ error: "Aucun espace consultant associé à ce compte." }, { status: 403 });
  }

  // Filtre strictement par la table de liaison — jamais par un organizationId
  // fourni côté client — pour garantir qu'un cabinet ne voit que SES clients.
  const access = await db.consultantClientAccess.findMany({
    where: { consultancyWorkspaceId: workspaceId, status: "ACTIVE" },
    include: {
      organization: {
        select: { id: true, name: true, siret: true, sector: true, createdAt: true },
      },
    },
    orderBy: { grantedAt: "desc" },
  });

  return NextResponse.json(access.map((a) => ({ ...a.organization, accessGrantedAt: a.grantedAt })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const role = (session.user as { role?: string }).role;
  if (role !== "CONSULTANT" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Permissions insuffisantes." }, { status: 403 });
  }

  const workspaceId = await getUserConsultancyWorkspaceId(userId);
  if (!workspaceId) {
    return NextResponse.json({ error: "Aucun espace consultant associé à ce compte." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, siret, sector } = parsed.data;

  let slug = slugify(name);
  const existingSlug = await db.organization.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now()}`;

  const result = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug, siret, sector },
    });

    await tx.consultantClientAccess.create({
      data: {
        consultancyWorkspaceId: workspaceId,
        organizationId: organization.id,
        grantedByUserId: userId,
      },
    });

    await tx.subscription.create({
      data: { organizationId: organization.id, plan: "DIAGNOSTIC", status: "FREE" },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        userId,
        action: "CONSULTANT_CLIENT_CREATED",
        resource: "organization",
        resourceId: organization.id,
        details: { consultancyWorkspaceId: workspaceId },
      },
    });

    return organization;
  });

  return NextResponse.json(result, { status: 201 });
}
