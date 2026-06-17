import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ChevronRight, MapPin, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { StatusBadge, SeverityBadge } from "@/components/ui/badge";
import type { ActionStatus } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  INCIDENT: "Incident", ACCIDENT: "Accident", NEAR_MISS: "Presque-accident",
};

const INCIDENT_STATUS_COLORS: Record<string, string> = {
  DECLARED:    "text-blue-600",
  UNDER_INVESTIGATION: "text-orange-600",
  CLOSED:      "text-green-600",
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const incident = await db.incident.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      site: { select: { name: true } },
      reporter: { select: { name: true, email: true } },
      actionPlans: { orderBy: { priority: "desc" } },
    },
  });

  if (!incident) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/incidents" className="hover:underline">Incidents</a>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-xs">{incident.title}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            {TYPE_LABELS[incident.type] ?? incident.type}
          </span>
          <SeverityBadge severity={incident.severity as "MINOR" | "MODERATE" | "SERIOUS" | "CRITICAL" | "FATAL"} />
          <span className={`text-sm font-medium ${INCIDENT_STATUS_COLORS[incident.status] ?? "text-gray-600"}`}>
            {incident.status === "DECLARED" ? "Déclaré" :
             incident.status === "UNDER_INVESTIGATION" ? "En investigation" : "Clôturé"}
          </span>
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Date / heure</p>
          <p className="font-medium text-gray-900 text-sm">{formatDate(incident.occurredAt)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Lieu</p>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <p className="font-medium text-gray-900 text-sm">
              {incident.location ?? incident.site?.name ?? "—"}
            </p>
          </div>
        </div>
        <div className={`border rounded-xl p-4 ${incident.injuredPersons > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Blessés</p>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <p className={`font-bold text-sm ${incident.injuredPersons > 0 ? "text-red-600" : "text-gray-900"}`}>
              {incident.injuredPersons}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Déclaré par</p>
          <p className="font-medium text-gray-900 text-sm">{incident.reporter?.name ?? "—"}</p>
        </div>
      </div>

      {/* Alert flags */}
      {(incident.workStopped || incident.firstAidGiven) && (
        <div className="flex gap-2 flex-wrap">
          {incident.workStopped && (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-full font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> Arrêt de travail
            </span>
          )}
          {incident.firstAidGiven && (
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-sm px-3 py-1.5 rounded-full font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Premiers secours prodigués
            </span>
          )}
        </div>
      )}

      {/* Description */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.description}</p>
      </div>

      {/* Investigation */}
      {(incident.witnesses || incident.immediateActions || incident.rootCauses) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Investigation</h2>
          {incident.witnesses && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Témoins</p>
              <p className="text-sm text-gray-700">{incident.witnesses}</p>
            </div>
          )}
          {incident.immediateActions && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Actions immédiates</p>
              <p className="text-sm text-gray-700">{incident.immediateActions}</p>
            </div>
          )}
          {incident.rootCauses && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Causes racines</p>
              <p className="text-sm text-gray-700">{incident.rootCauses}</p>
            </div>
          )}
        </div>
      )}

      {/* Action plans */}
      {incident.actionPlans.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Plans d&apos;action</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {incident.actionPlans.map((ap) => (
              <div key={ap.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium">{ap.title}</p>
                  {ap.dueDate && (
                    <p className="text-xs text-gray-400 mt-0.5">Échéance : {formatDate(ap.dueDate)}</p>
                  )}
                </div>
                <StatusBadge status={ap.status as ActionStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      {incident.closedAt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800 font-medium">
            Incident clôturé le {formatDate(incident.closedAt)}
          </p>
        </div>
      )}
    </div>
  );
}
