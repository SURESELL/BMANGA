import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Soft-delete the current user's personal data (RGPD right to erasure, Art. 17)
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id!;
  const role = (session.user as { role?: string }).role;

  // Prevent deletion of the last admin of an org
  if (role === "ORG_ADMIN") {
    const orgId = (session.user as { organizationId?: string }).organizationId;
    const adminCount = orgId
      ? await db.user.count({ where: { organizationId: orgId, role: "ORG_ADMIN", isActive: true, deletedAt: null } })
      : 0;
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Vous êtes le seul administrateur. Transférez d'abord les droits avant de supprimer votre compte." },
        { status: 400 }
      );
    }
  }

  // Soft-delete: anonymise personal data, keep audit trails
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        name: "[Supprimé]",
        email: `deleted-${userId}@normia.invalid`,
        image: null,
        isActive: false,
        deletedAt: new Date(),
      },
    }),
    db.auditLog.create({
      data: {
        userId,
        action: "RGPD_DELETE_REQUEST",
        resource: "User",
        resourceId: userId,
      },
    }),
  ]);

  return NextResponse.json({ message: "Compte supprimé conformément au RGPD." });
}
