import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, isPasswordStrong, verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const rl = checkRateLimit(`change-password:${session.user.id}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  const { currentPassword, newPassword } = parsed.data;

  if (!isPasswordStrong(newPassword)) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre." },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false, passwordExpiresAt: null },
  });

  await db.auditLog.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      action: "PASSWORD_CHANGED",
      resource: "user",
      resourceId: user.id,
    },
  });

  return NextResponse.json({ success: true });
}
