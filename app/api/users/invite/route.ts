import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["VIEWER", "LEARNER", "EMPLOYEE", "TRAINER", "AUDITOR", "CONSULTANT", "SITE_MANAGER", "ORG_ADMIN"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const callerRole = (session.user as { role?: string }).role;
  if (!["ORG_ADMIN", "SUPER_ADMIN"].includes(callerRole ?? "")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { email, name, role } = parsed.data;

  // Check seat limit
  const [subscription, currentCount] = await Promise.all([
    db.subscription.findFirst({ where: { organizationId: orgId, status: "ACTIVE" } }),
    db.user.count({ where: { organizationId: orgId, isActive: true, deletedAt: null } }),
  ]);

  if (subscription && subscription.seats > 0 && currentCount >= subscription.seats) {
    return NextResponse.json({ error: "Limite de licences atteinte. Mettez à niveau votre abonnement." }, { status: 402 });
  }

  // Check for existing user in org
  const existing = await db.user.findFirst({ where: { email, organizationId: orgId, deletedAt: null } });
  if (existing) return NextResponse.json({ error: "Cet utilisateur est déjà dans l'organisation." }, { status: 409 });

  // Create pending user (no password — they'll set it on first login)
  const user = await db.user.create({
    data: {
      email,
      name: name ?? email.split("@")[0],
      role,
      organizationId: orgId,
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id!,
      action: "INVITE_USER",
      resource: "User",
      resourceId: user.id,
      organizationId: orgId,
      metadata: { email, role },
    },
  });

  return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
}
