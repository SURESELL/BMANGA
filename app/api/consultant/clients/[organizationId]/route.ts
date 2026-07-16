import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserConsultancyWorkspaceId } from "@/lib/consultant/access";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) {
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

  const { organizationId } = await params;

  const access = await db.consultantClientAccess.findUnique({
    where: { consultancyWorkspaceId_organizationId: { consultancyWorkspaceId: workspaceId, organizationId } },
  });

  if (!access || access.status === "REVOKED") {
    return NextResponse.json({ error: "Accès introuvable." }, { status: 404 });
  }

  await db.consultantClientAccess.update({
    where: { id: access.id },
    data: { status: "REVOKED", revokedByUserId: userId, revokedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "CONSULTANT_ACCESS_REVOKED",
      resource: "consultant_client_access",
      resourceId: access.id,
      details: { consultancyWorkspaceId: workspaceId },
    },
  });

  return NextResponse.json({ success: true });
}
