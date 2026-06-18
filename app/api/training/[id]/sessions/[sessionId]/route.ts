import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; sessionId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id, sessionId } = await params;

  const course = await db.trainingCourse.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!course) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, courseId: id },
    include: {
      trainer: { select: { id: true, name: true, email: true } },
      enrollments: {
        include: { learner: { select: { id: true, name: true, email: true } } },
        orderBy: { enrolledAt: "asc" },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!trainingSession) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({ ...trainingSession, course: { title: course.title } });
}
