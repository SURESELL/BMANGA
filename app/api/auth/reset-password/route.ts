import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, hashResetToken, isPasswordStrong } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const rl = checkRateLimit(`reset-password:${token.slice(0, 16)}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  if (!isPasswordStrong(password)) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre." },
      { status: 400 }
    );
  }

  const tokenHash = hashResetToken(token);
  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() < Date.now() ||
    !resetToken.user.isActive
  ) {
    return NextResponse.json({ error: "Ce lien de réinitialisation est invalide ou expiré." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        organizationId: resetToken.user.organizationId,
        userId: resetToken.userId,
        action: "PASSWORD_RESET_COMPLETED",
        resource: "user",
        resourceId: resetToken.userId,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
