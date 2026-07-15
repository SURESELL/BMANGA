import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkUserLimit } from "@/lib/billing/entitlements";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["VIEWER", "LEARNER", "EMPLOYEE", "TRAINER", "AUDITOR", "CONSULTANT", "SITE_MANAGER", "ORG_ADMIN"]),
});

const TEMP_PASSWORD_TTL_MS = 48 * 60 * 60 * 1000; // 48h par défaut (PRODUCT_SPEC.md 5.3)

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "users", "create");
  if (forbidden) return forbidden;

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { email: rawEmail, name, role } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  const limitCheck = await checkUserLimit(orgId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Limite d'utilisateurs atteinte pour votre offre (${limitCheck.limit} maximum). Passez à une offre supérieure pour en inviter d'autres.` },
      { status: 403 }
    );
  }

  // Check for existing user in org
  const existing = await db.user.findFirst({ where: { email, organizationId: orgId, deletedAt: null } });
  if (existing) return NextResponse.json({ error: "Cet utilisateur est déjà dans l'organisation." }, { status: 409 });

  // Mot de passe temporaire : haché immédiatement, retourné une seule fois
  // dans cette réponse (jamais stocké ni journalisé en clair), expiration
  // 48h, changement obligatoire imposé à la première connexion.
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await db.user.create({
    data: {
      email,
      name: name ?? email.split("@")[0],
      role,
      organizationId: orgId,
      isActive: true,
      passwordHash,
      mustChangePassword: true,
      passwordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_MS),
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "INVITE_USER",
      resource: "User",
      resourceId: user.id,
      organizationId: orgId,
      details: { email, role }, // jamais le mot de passe
    },
  });

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      temporaryPassword,
      temporaryPasswordExpiresAt: user.passwordExpiresAt,
    },
    { status: 201 }
  );
}
