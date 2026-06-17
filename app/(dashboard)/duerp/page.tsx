import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function DuerpPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session?.user as { organizationId?: string })?.organizationId
  if (!orgId) redirect("/login")

  const duerps = await db.dUERP.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { workUnits: true, risks: true } },
    },
    orderBy: { year: "desc" },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Document Unique d'Évaluation des Risques</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos DUERP par année</p>
        </div>
        <Link
          href="/duerp/new"
          className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
        >
          + Nouveau DUERP
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Version</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Année</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unités de travail</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Risques</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Validé le</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {duerps.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  Aucun DUERP trouvé. Créez votre premier document unique.
                </td>
              </tr>
            ) : duerps.map((duerp) => (
              <tr key={duerp.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[#0D1B2A]">v{duerp.version}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{duerp.year}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={duerp.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{duerp._count.workUnits}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{duerp._count.risks}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {duerp.validatedAt ? formatDate(duerp.validatedAt) : "—"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/duerp/${duerp.id}`}
                      className="text-[#1E3A5F] hover:text-[#0D1B2A] text-sm font-medium"
                    >
                      Voir
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link
                      href={`/api/duerp/${duerp.id}/export`}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      PDF
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    VALIDATED: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-100 text-gray-600",
  }
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    IN_PROGRESS: "En cours",
    VALIDATED: "Validé",
    ARCHIVED: "Archivé",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[status] ?? status}
    </span>
  )
}
