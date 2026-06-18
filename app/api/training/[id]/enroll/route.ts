import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: courseId } = await params;
  const userId = session.user.id!;

  const course = await db.trainingCourse.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });

  const existing = await db.trainingEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing) return NextResponse.json({ error: "Déjà inscrit" }, { status: 409 });

  const enrollment = await db.trainingEnrollment.create({
    data: { userId, courseId, progress: 0 },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
