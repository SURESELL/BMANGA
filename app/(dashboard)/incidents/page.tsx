import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; severity?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session?.user as { organizationId?: string })?.organizationId
  if (!orgId) redirect("/login")

  const params = await searchParams
  const typeFilter = params.type
  const severityFilter = params.severity

  const incidents = await db.incident.findMany({
    where: {
      organizationId: orgId,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(severityFilter ? { severity: severityFilter as "NEAR_MISS" | "MINOR" | "SIGNIFICANT" | "SERIOUS" | "CRITICAL" | "FATAL" } : {}),
    },
    include: {
      reporter: { select: { firstName: true, lastName: true } },
    },
    orderBy: { occurredAt: "desc" },
  })

  const TYPES = ["INCIDENT", "ACCIDENT", "NEAR_MISS"]
  const SEVERITIES = ["NEAR_MISS", "MINOR", "SIGNIFICANT", "SERIOUS", "CRITICAL", "FATAL"]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Incidents & Accidents</h1>
          <p className="text-gray-500 text-sm mt-1">{incidents.length} événement(s) enregistré(s)</p>
        </div>
        <Link
          href="/incidents/new"
          className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
        >
          + Déclarer un incident
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Type :</span>
          <Link
            href="/incidents"
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${!typeFilter ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Tous
          </Link>
          {TYPES.map((t) => (
            <Link
              key={t}
              href={`/incidents?type=${t}${severityFilter ? `&severity=${severityFilter}` : ""}`}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeFilter === t ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {TYPE_LABELS[t]}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Gravité :</span>
          <Link
            href={`/incidents${typeFilter ? `?type=${typeFilter}` : ""}`}
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${!severityFilter ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Toutes
          </Link>
          {SEVERITIES.map((s) => (
            <Link
              key={s}
              href={`/incidents?severity=${s}${typeFilter ? `&type=${typeFilter}` : ""}`}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityFilter === s ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {SEVERITY_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gravité</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Déclarant</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Aucun incident enregistré.</td>
              </tr>
            ) : incidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[#0D1B2A]">{incident.title}</td>
                <td className="px-6 py-4"><TypeBadge type={incident.type} /></td>
                <td className="px-6 py-4"><SeverityBadge severity={incident.severity} /></td>
                <td className="px-6 py-4"><IncidentStatusBadge status={incident.status} /></td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(incident.occurredAt)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {incident.reporter
                    ? `${incident.reporter.firstName ?? ""} ${incident.reporter.lastName ?? ""}`.trim() || "—"
                    : "—"}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/incidents/${incident.id}`} className="text-[#1E3A5F] hover:text-[#0D1B2A] text-sm font-medium">Voir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  INCIDENT: "Incident",
  ACCIDENT: "Accident",
  NEAR_MISS: "Presque accident",
}

const SEVERITY_LABELS: Record<string, string> = {
  NEAR_MISS: "Presque accident",
  MINOR: "Mineur",
  SIGNIFICANT: "Significatif",
  SERIOUS: "Grave",
  CRITICAL: "Critique",
  FATAL: "Fatal",
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    INCIDENT: "bg-blue-100 text-blue-700",
    ACCIDENT: "bg-red-100 text-red-700",
    NEAR_MISS: "bg-yellow-100 text-yellow-700",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] ?? "bg-gray-100 text-gray-600"}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    NEAR_MISS: "bg-blue-100 text-blue-700",
    MINOR: "bg-green-100 text-green-700",
    SIGNIFICANT: "bg-yellow-100 text-yellow-700",
    SERIOUS: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
    FATAL: "bg-red-200 text-red-900",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[severity] ?? "bg-gray-100 text-gray-600"}`}>
      {SEVERITY_LABELS[severity] ?? severity}
    </span>
  )
}

function IncidentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DECLARED: "bg-red-100 text-red-700",
    UNDER_INVESTIGATION: "bg-yellow-100 text-yellow-700",
    CLOSED: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-100 text-gray-500",
  }
  const labels: Record<string, string> = {
    DECLARED: "Déclaré",
    UNDER_INVESTIGATION: "En investigation",
    CLOSED: "Clôturé",
    ARCHIVED: "Archivé",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[status] ?? status}
    </span>
  )
}
