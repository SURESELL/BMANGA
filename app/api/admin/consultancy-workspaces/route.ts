import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";

const TEMP_PASSWORD_TTL_MS = 48 * 60 * 60 * 1000; // 48h par défaut (PRODUCT_SPEC.md 5.3)

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(200),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(2).max(100).optional(),
});

/**
 * Provisionnement d'un cabinet consultant. Avant cette route, rien dans le
 * dépôt ne pouvait jamais créer une ConsultancyWorkspace ni assigner
 * User.consultancyWorkspaceId — l'espace consultant (POST /api/consultant/*)
 * était donc inaccessible en pratique (systématiquement 403, aucun compte
 * n'ayant de cabinet). Réservé au Super Admin PREUVIA : seule la plateforme
 * peut créer un cabinet, jamais un utilisateur qui s'auto-déclarerait consultant.
 */
export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workspaces = await db.consultancyWorkspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, clientAccess: true } },
      members: { select: { id: true, email: true, name: true }, take: 5 },
    },
  });

  return NextResponse.json(workspaces);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, ownerName } = parsed.data;
  const ownerEmail = parsed.data.ownerEmail.toLowerCase().trim();

  const existingUser = await db.user.findUnique({ where: { email: ownerEmail } });
  if (existingUser) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  let slug = slugify(name);
  const existingSlug = await db.consultancyWorkspace.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now()}`;

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const result = await db.$transaction(async (tx) => {
    const workspace = await tx.consultancyWorkspace.create({ data: { name, slug } });

    const owner = await tx.user.create({
      data: {
        email: ownerEmail,
        name: ownerName ?? ownerEmail.split("@")[0],
        role: "CONSULTANT",
        consultancyWorkspaceId: workspace.id,
        isActive: true,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_MS),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session!.user!.id,
        action: "CONSULTANCY_WORKSPACE_CREATED",
        resource: "consultancy_workspace",
        resourceId: workspace.id,
        details: { name, ownerUserId: owner.id, ownerEmail }, // jamais le mot de passe
      },
    });

    return { workspace, owner };
  });

  return NextResponse.json(
    {
      ...result.workspace,
      owner: {
        id: result.owner.id,
        email: result.owner.email,
        temporaryPassword,
        temporaryPasswordExpiresAt: result.owner.passwordExpiresAt,
      },
    },
    { status: 201 }
  );
}
