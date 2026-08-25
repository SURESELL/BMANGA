import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { memberships: { take: 1 } },
  });

  // Constant-shape response whether or not the user exists, to avoid
  // leaking account existence via timing/response differences.
  const genericError = NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  if (!user || user.deletedAt) {
    return genericError;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: "Account temporarily locked due to repeated failed attempts. Try again later." },
      { status: 423 }
    );
  }

  const valid = await verifyPassword(user.passwordHash, password);

  if (!valid) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      failedAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
        : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failedAttempts, lockedUntil },
    });

    const membership = user.memberships[0];
    if (membership) {
      await writeAuditLog({
        workspaceId: membership.workspaceId,
        userId: user.id,
        action: "login_failed",
      });
    }

    return genericError;
  }

  const membership = user.memberships[0];
  if (!membership) {
    return NextResponse.json({ error: "No workspace configured for this account" }, { status: 500 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  await setSessionCookie({ sub: user.id, workspaceId: membership.workspaceId, email: user.email });
  await writeAuditLog({ workspaceId: membership.workspaceId, userId: user.id, action: "login" });

  return NextResponse.json({ ok: true });
}
