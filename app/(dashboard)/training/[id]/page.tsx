import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Clock, Users, BookOpen, Play, FileText, HelpCircle, Award, PlusCircle } from "lucide-react";
import Link from "next/link";
import { TrainingTypeBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const course = await db.trainingCourse.findFirst({
    where: { id, OR: [{ organizationId: orgId }, { isPublic: true }] },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { quizzes: { select: { id: true, title: true, passingScore: true } } },
      },
      sessions: {
        orderBy: { startDate: "desc" },
        take: 5,
        select: { id: true, status: true, startDate: true, endDate: true, location: true, type: true },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) notFound();

  const enrollment = session.user.id
    ? await db.trainingEnrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: id } },
        include: { moduleProgress: true },
      })
    : null;

  const completedModules = enrollment?.moduleProgress.filter((p) => p.completed).length ?? 0;
  const progressPct = course.modules.length > 0
    ? Math.round((completedModules / course.modules.length) * 100)
    : 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/training" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrainingTypeBadge type={course.type} />
                {course.isCertifying && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Certifiante</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  course.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {course.status === "PUBLISHED" ? "Publiée" : "Brouillon"}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
              {course.description && <p className="text-sm text-gray-500 mt-1">{course.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {!enrollment ? (
                <form action={`/api/training/${id}/enroll`} method="POST">
                  <button type="submit" className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
                    S&apos;inscrire
                  </button>
                </form>
              ) : (
                <Link href={`/training/${id}/learn`} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" /> Continuer
                </Link>
              )}
              <Link href={`/training/${id}/edit`} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Modifier
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            {course.duration && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {course.duration < 60 ? `${course.duration} min` : `${Math.round(course.duration / 60)}h`}</span>
            )}
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {course._count.enrollments} inscrit{course._count.enrollments > 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {course.modules.length} module{course.modules.length > 1 ? "s" : ""}</span>
            {course.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{course.category}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Progress (if enrolled) */}
          {enrollment && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Votre progression</span>
                <span className="text-sm font-bold text-blue-900">{progressPct}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-blue-700 mt-1">{completedModules}/{course.modules.length} modules complétés</p>
            </div>
          )}

          {/* Objectives */}
          {course.objectives && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Objectifs pédagogiques</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{course.objectives}</p>
            </div>
          )}

          {/* Modules */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Contenu de la formation</h2>
              <Link href={`/training/${id}/modules/new`} className="flex items-center gap-1 text-xs text-[#1E3A5F] font-medium hover:underline">
                <PlusCircle className="w-3.5 h-3.5" /> Ajouter un module
              </Link>
            </div>
            {course.modules.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Aucun module créé. <Link href={`/training/${id}/modules/new`} className="text-[#1E3A5F] hover:underline">Ajouter un module</Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {course.modules.map((mod, i) => {
                  const isCompleted = enrollment?.moduleProgress.find((p) => p.moduleId === mod.id)?.completed;
                  return (
                    <li key={mod.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"}`}>
                        {isCompleted ? "✓" : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{mod.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          {mod.videoUrl && <span className="flex items-center gap-1"><Play className="w-3 h-3" /> Vidéo</span>}
                          {mod.pdfUrl && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>}
                          {mod.quizzes.length > 0 && <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> {mod.quizzes.length} quiz</span>}
                          {mod.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {mod.duration} min</span>}
                        </div>
                      </div>
                      <Link href={`/training/${id}/modules/${mod.id}`} className="text-xs text-[#1E3A5F] hover:underline shrink-0">
                        {enrollment ? "Accéder" : "Aperçu"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Sessions */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Sessions planifiées</h3>
              <Link href={`/training/${id}/sessions/new`} className="text-xs text-[#1E3A5F] hover:underline">+ Session</Link>
            </div>
            {course.sessions.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-400 text-center">Aucune session planifiée</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {course.sessions.map((s) => (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <TrainingTypeBadge type={s.type} />
                      <span className={`text-xs font-medium ${
                        s.status === "COMPLETED" ? "text-green-600" :
                        s.status === "IN_PROGRESS" ? "text-blue-600" :
                        s.status === "CANCELED" ? "text-red-500" : "text-gray-600"
                      }`}>
                        {s.status === "PLANNED" ? "Planifiée" : s.status === "COMPLETED" ? "Terminée" : s.status === "IN_PROGRESS" ? "En cours" : s.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{formatDate(s.startDate)}</p>
                    {s.location && <p className="text-xs text-gray-400">{s.location}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Certifying info */}
          {course.isCertifying && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Formation certifiante</span>
              </div>
              <p className="text-xs text-yellow-700">Un certificat sera délivré à l&apos;issue de la formation sous réserve de validation du quiz final.</p>
            </div>
          )}

          {/* Prerequisites */}
          {course.prerequisites && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Prérequis</h3>
              <p className="text-xs text-gray-600">{course.prerequisites}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
