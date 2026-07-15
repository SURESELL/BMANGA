import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { TrainingEnrollmentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const EnrollSchema = z.object({ learnerId: z.string() });
const UpdateStatusSchema = z.object({
  enrollmentId: z.string(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

type Params = { params: Promise<{ id: string; sessionId: string }> };

function toWireShape<T extends { user: unknown }>(enrollment: T) {
  const { user, ...rest } = enrollment;
  return { ...rest, learner: user };
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "training", "update");
  if (forbidden) return forbidden;

  const { id, sessionId } = await params;

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, courseId: id, organizationId: orgId },
    include: { _count: { select: { enrollments: true } } },
  });
  if (!trainingSession) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  if (trainingSession.maxLearners && trainingSession._count.enrollments >= trainingSession.maxLearners) {
    return NextResponse.json({ error: "Capacité maximale atteinte" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = EnrollSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.trainingEnrollment.findFirst({
    where: { sessionId, userId: parsed.data.learnerId },
  });
  if (existing) return NextResponse.json({ error: "Déjà inscrit" }, { status: 409 });

  const enrollment = await db.trainingEnrollment.create({
    data: {
      sessionId,
      courseId: id,
      userId: parsed.data.learnerId,
      status: "PENDING",
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(toWireShape(enrollment), { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "training", "update");
  if (forbidden) return forbidden;

  const { id, sessionId } = await params;
  const body = await req.json();
  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { enrollmentId, status } = parsed.data;

  // La session ET son organisation doivent correspondre — sans cette
  // vérification, un appelant pouvait modifier le statut d'une inscription
  // appartenant à une autre organisation en devinant un enrollmentId.
  const enrollment = await db.trainingEnrollment.findFirst({
    where: { id: enrollmentId, sessionId, session: { courseId: id, organizationId: orgId } },
  });
  if (!enrollment) return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });

  const updated = await db.trainingEnrollment.update({
    where: { id: enrollmentId },
    data: { status: status as TrainingEnrollmentStatus },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(toWireShape(updated));
}
