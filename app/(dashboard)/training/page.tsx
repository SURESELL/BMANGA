import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function TrainingPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session?.user as { organizationId?: string })?.organizationId
  if (!orgId) redirect("/login")

  const trainings = await db.trainingCourse.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Formations</h1>
          <p className="text-gray-500 text-sm mt-1">{trainings.length} formation(s) disponible(s)</p>
        </div>
        <Link
          href="/training/new"
          className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
        >
          + Créer une formation
        </Link>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Aucune formation créée. Commencez par créer votre première formation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainings.map((training) => (
            <TrainingCard
              key={training.id}
              training={training}
              enrollmentCount={training._count.enrollments}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrainingCard({
  training,
  enrollmentCount,
}: {
  training: {
    id: string
    title: string
    type: string
    duration?: number | null
    status: string
  }
  enrollmentCount: number
}) {
  const typeStyles: Record<string, string> = {
    E_LEARNING: "bg-purple-100 text-purple-700",
    FACE_TO_FACE: "bg-blue-100 text-blue-700",
    HYBRID: "bg-teal-100 text-teal-700",
    VIRTUAL_CLASS: "bg-indigo-100 text-indigo-700",
    WEBINAR: "bg-pink-100 text-pink-700",
  }
  const typeLabels: Record<string, string> = {
    E_LEARNING: "E-learning",
    FACE_TO_FACE: "Présentiel",
    HYBRID: "Hybride",
    VIRTUAL_CLASS: "Classe virtuelle",
    WEBINAR: "Webinaire",
  }
  const statusStyles: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700",
    PUBLISHED: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-100 text-gray-500",
  }
  const statusLabels: Record<string, string> = {
    DRAFT: "Brouillon",
    PUBLISHED: "Publié",
    ARCHIVED: "Archivé",
  }

  return (
    <Link href={`/training/${training.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
        {/* Thumbnail placeholder */}
        <div className="h-32 bg-gradient-to-br from-[#1E3A5F] to-[#0D1B2A] flex items-center justify-center">
          <svg className="w-12 h-12 text-white opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#0D1B2A] line-clamp-2">{training.title}</h3>
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeStyles[training.type] ?? "bg-gray-100 text-gray-600"}`}>
              {typeLabels[training.type] ?? training.type}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[training.status] ?? "bg-gray-100 text-gray-600"}`}>
              {statusLabels[training.status] ?? training.status}
            </span>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {training.duration != null && (
                <span>{training.duration} min</span>
              )}
              <span>{enrollmentCount} inscrit(s)</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
