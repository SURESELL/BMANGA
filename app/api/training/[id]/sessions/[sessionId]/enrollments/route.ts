import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const EnrollSchema = z.object({ learnerId: z.string() });

type Params = { params: Promise<{ id: string; sessionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

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
    where: { sessionId, learnerId: parsed.data.learnerId },
  });
  if (existing) return NextResponse.json({ error: "Déjà inscrit" }, { status: 409 });

  const enrollment = await db.trainingEnrollment.create({
    data: {
      sessionId,
      learnerId: parsed.data.learnerId,
      status: "PENDING",
    },
    include: { learner: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(enrollment, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sessionId } = await params;
  const body = await req.json();
  const { enrollmentId, status } = body;

  if (!enrollmentId || !status) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  const enrollment = await db.trainingEnrollment.findFirst({ where: { id: enrollmentId, sessionId } });
  if (!enrollment) return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });

  const updated = await db.trainingEnrollment.update({
    where: { id: enrollmentId },
    data: { status },
    include: { learner: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
}
