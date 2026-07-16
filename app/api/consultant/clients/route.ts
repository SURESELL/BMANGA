import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getUserConsultancyWorkspaceId } from "@/lib/consultant/access";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";

const TEMP_PASSWORD_TTL_MS = 48 * 60 * 60 * 1000; // 48h par défaut (PRODUCT_SPEC.md 5.3)

const createClientSchema = z.object({
  name: z.string().min(2).max(200),
  siret: z.string().regex(/^\d{14}$/).optional(),
  sector: z.string().optional(),
  adminEmail: z.string().email(),
  adminName: z.string().min(2).max(100).optional(),
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

  const { name, siret, sector, adminName } = parsed.data;
  const adminEmail = parsed.data.adminEmail.toLowerCase().trim();

  const existingUser = await db.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  let slug = slugify(name);
  const existingSlug = await db.organization.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now()}`;

  // Mot de passe temporaire du premier administrateur du client : haché
  // immédiatement, retourné une seule fois dans cette réponse (jamais stocké
  // ni journalisé en clair), expiration 48h, changement obligatoire imposé à
  // la première connexion — même politique que POST /api/users/invite.
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

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

    const adminUser = await tx.user.create({
      data: {
        email: adminEmail,
        name: adminName ?? adminEmail.split("@")[0],
        role: "ORG_ADMIN",
        organizationId: organization.id,
        isActive: true,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_MS),
        createdByConsultantId: userId,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        userId,
        action: "CONSULTANT_CLIENT_CREATED",
        resource: "organization",
        resourceId: organization.id,
        details: { consultancyWorkspaceId: workspaceId, adminUserId: adminUser.id, adminEmail }, // jamais le mot de passe
      },
    });

    return { organization, adminUser };
  });

  return NextResponse.json(
    {
      ...result.organization,
      admin: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        temporaryPassword,
        temporaryPasswordExpiresAt: result.adminUser.passwordExpiresAt,
      },
    },
    { status: 201 }
  );
}
