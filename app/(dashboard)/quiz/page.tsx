import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HelpCircle, CheckCircle, Clock, PlusCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Quiz" };

export default async function QuizPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const userId = session.user.id!;

  // Get all quizzes from org's courses
  const quizzes = orgId
    ? await db.quiz.findMany({
        where: { module: { course: { OR: [{ organizationId: orgId }, { isPublic: true }] } } },
        include: {
          module: { select: { title: true, course: { select: { id: true, title: true } } } },
          _count: { select: { questions: true, attempts: { where: { userId } } } },
          attempts: { where: { userId }, orderBy: { startedAt: "desc" }, take: 1 },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz</h1>
          <p className="text-sm text-gray-500 mt-1">{quizzes.length} quiz disponible{quizzes.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun quiz disponible</p>
          <p className="text-sm text-gray-400 mt-1">Les quiz sont créés dans les modules de formation</p>
          <Link href="/training" className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#1E3A5F] font-medium hover:underline">
            Voir les formations
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => {
            const lastAttempt = quiz.attempts[0];
            const attempted = quiz._count.attempts > 0;

            return (
              <div key={quiz.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#1E3A5F] hover:shadow-sm transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${attempted && lastAttempt?.passed ? "bg-green-100" : attempted ? "bg-red-100" : "bg-blue-100"}`}>
                    <HelpCircle className={`w-5 h-5 ${attempted && lastAttempt?.passed ? "text-green-600" : attempted ? "text-red-600" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{quiz.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{quiz.module.course.title} › {quiz.module.title}</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-gray-500 mb-4">
                  <div className="flex justify-between">
                    <span>Questions</span>
                    <span className="font-medium text-gray-700">{quiz._count.questions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Score de passage</span>
                    <span className="font-medium text-gray-700">{quiz.passingScore}%</span>
                  </div>
                  {quiz.timeLimit && (
                    <div className="flex justify-between">
                      <span>Durée limite</span>
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <Clock className="w-3 h-3" /> {quiz.timeLimit} min
                      </span>
                    </div>
                  )}
                </div>

                {lastAttempt && (
                  <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${lastAttempt.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {lastAttempt.passed ? <CheckCircle className="w-3.5 h-3.5" /> : "✗"}
                        {lastAttempt.passed ? "Réussi" : "Échoué"} — Score : {Math.round(lastAttempt.score)}%
                      </span>
                      <span className="text-xs opacity-70">{formatDate(lastAttempt.startedAt)}</span>
                    </div>
                  </div>
                )}

                <Link
                  href={`/quiz/${quiz.id}`}
                  className="block w-full text-center bg-[#1E3A5F] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
                >
                  {attempted ? (lastAttempt?.passed ? "Refaire le quiz" : "Réessayer") : "Commencer"}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
