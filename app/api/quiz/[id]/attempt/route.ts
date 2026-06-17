import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const attemptSchema = z.object({
  answers: z.record(z.string(), z.string()), // questionId -> answerId
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: quizId } = await params;
  const userId = session.user.id!;

  const body = await req.json();
  const parsed = attemptSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { answers: { where: { isCorrect: true }, select: { id: true } } },
        select: { id: true, points: true, answers: true },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });

  // Calculate score
  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
  let earnedPoints = 0;

  for (const question of quiz.questions) {
    const givenAnswerId = parsed.data.answers[question.id];
    const correctAnswerId = question.answers[0]?.id;
    if (givenAnswerId && correctAnswerId && givenAnswerId === correctAnswerId) {
      earnedPoints += question.points;
    }
  }

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = score >= quiz.passingScore;

  const attempt = await db.quizAttempt.create({
    data: {
      quizId,
      userId,
      score,
      passed,
      completedAt: new Date(),
      answers: parsed.data.answers,
    },
  });

  // If passed and course is certifying, create certificate
  if (passed) {
    const module = await db.trainingModule.findFirst({
      where: { quizzes: { some: { id: quizId } } },
      include: { course: true },
    });

    if (module?.course.isCertifying) {
      // Check all modules completed
      const enrollment = await db.trainingEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId: module.courseId } },
        include: { moduleProgress: true },
      });

      if (enrollment) {
        await db.trainingEnrollment.update({
          where: { id: enrollment.id },
          data: { score, passed },
        });

        // Check if all modules done -> issue certificate
        const allModules = await db.trainingModule.count({ where: { courseId: module.courseId } });
        const completedModules = enrollment.moduleProgress.filter((p) => p.completed).length;

        if (completedModules >= allModules - 1) {
          await db.certificate.create({
            data: {
              userId,
              courseId: module.courseId,
              title: module.course.title,
              score,
              issuedAt: new Date(),
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ score, passed, attemptId: attempt.id }, { status: 201 });
}
