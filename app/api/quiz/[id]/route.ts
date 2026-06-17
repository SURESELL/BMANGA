import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          answers: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
        },
        select: {
          id: true, text: true, type: true, points: true, order: true,
          answers: true,
        },
      },
      module: { select: { title: true, course: { select: { id: true, title: true } } } },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });
  return NextResponse.json(quiz);
}
