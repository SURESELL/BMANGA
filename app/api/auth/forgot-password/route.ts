import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateResetToken } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  const rl = checkRateLimit(`forgot-password:${email}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    // Toujours une réponse générique pour ne pas confirmer l'existence du compte.
    return NextResponse.json({ success: true });
  }

  const user = await db.user.findUnique({ where: { email } });

  if (user && user.isActive) {
    const { token, tokenHash } = generateResetToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Réinitialisation de votre mot de passe PREUVIA DUERP",
      html: `<p>Bonjour,</p><p>Cliquez sur ce lien pour définir un nouveau mot de passe (valable 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
    });

    await db.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        resource: "user",
        resourceId: user.id,
      },
    });
  }

  // Réponse identique que le compte existe ou non — évite l'énumération d'e-mails.
  return NextResponse.json({ success: true });
}
