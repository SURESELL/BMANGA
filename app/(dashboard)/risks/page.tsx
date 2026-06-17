import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getRiskLevel } from "@/lib/utils"
import type { RiskLevel } from "@/types"

export default async function RisksPage({
  searchParams,
}: {
  searchParams: Promise<{ riskLevel?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session?.user as { organizationId?: string })?.organizationId
  if (!orgId) redirect("/login")

  const params = await searchParams
  const riskLevelFilter = params.riskLevel as RiskLevel | undefined

  const risks = await db.risk.findMany({
    where: {
      organizationId: orgId,
      ...(riskLevelFilter ? { riskLevel: riskLevelFilter } : {}),
    },
    include: {
      workUnit: { select: { name: true } },
      hazard: { select: { family: true, name: true } },
      actionPlans: { select: { status: true } },
    },
    orderBy: { grossRisk: "desc" },
  })

  const RISK_LEVELS: RiskLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NEGLIGIBLE"]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Évaluation des risques</h1>
          <p className="text-gray-500 text-sm mt-1">{risks.length} risque(s) identifié(s)</p>
        </div>
        <Link
          href="/risks/new"
          className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
        >
          + Nouveau risque
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 mr-1">Filtrer par niveau :</span>
        <Link
          href="/risks"
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!riskLevelFilter ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Tous
        </Link>
        {RISK_LEVELS.map((level) => (
          <Link
            key={level}
            href={`/risks?riskLevel=${level}`}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${riskLevelFilter === level ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {RISK_LEVEL_LABELS[level]}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unité de travail</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Famille de danger</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Risque brut</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Niveau</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Risque résiduel</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan d'action</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {risks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  Aucun risque trouvé.
                </td>
              </tr>
            ) : risks.map((risk) => {
              const level = getRiskLevel(risk.grossRisk)
              const hasOpenActions = risk.actionPlans.some(
                (ap) => ap.status !== "DONE" && ap.status !== "CANCELED"
              )
              return (
                <tr key={risk.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[#0D1B2A]">{risk.workUnit?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{risk.hazard?.family ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{risk.hazardDescription}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700">{risk.grossRisk}</td>
                  <td className="px-6 py-4">
                    <RiskLevelBadge level={level} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{risk.residualRisk}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hasOpenActions ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {hasOpenActions ? "En cours" : "Aucune"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/risks/${risk.id}`} className="text-[#1E3A5F] hover:text-[#0D1B2A] text-sm font-medium">
                      Voir
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  NEGLIGIBLE: "Négligeable",
  LOW: "Faible",
  MEDIUM: "Modéré",
  HIGH: "Élevé",
  CRITICAL: "Critique",
}

function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    NEGLIGIBLE: "bg-gray-100 text-gray-600 border border-gray-200",
    LOW: "bg-green-100 text-green-700 border border-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    HIGH: "bg-orange-100 text-orange-700 border border-orange-200",
    CRITICAL: "bg-red-100 text-red-700 border border-red-200",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[level]}`}>
      {RISK_LEVEL_LABELS[level]}
    </span>
  )
}
