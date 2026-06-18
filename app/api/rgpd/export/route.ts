import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id!;
  const orgId = (session.user as { organizationId?: string }).organizationId;

  const [user, incidents, actionPlans, enrollments] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        organizationId: true,
      },
    }),
    db.incident.findMany({
      where: { reporterId: userId },
      select: { id: true, title: true, occurredAt: true, status: true },
    }),
    db.actionPlan.findMany({
      where: { assignedToId: userId },
      select: { id: true, title: true, status: true, dueDate: true },
    }),
    db.trainingEnrollment.findMany({
      where: { userId },
      select: { id: true, enrolledAt: true, completedAt: true, passed: true },
    }),
  ]);

  const auditLogs = await db.auditLog.findMany({
    where: { userId, organizationId: orgId ?? undefined },
    select: { action: true, resource: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const exportData = {
    exportedAt: new Date().toISOString(),
    notice: "Export des données personnelles conformément au RGPD (Art. 15 et 20)",
    user,
    incidents,
    actionPlans,
    trainingEnrollments: enrollments,
    auditLogs,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="normia-export-${userId}-${Date.now()}.json"`,
    },
  });
}
