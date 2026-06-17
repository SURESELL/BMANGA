import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PlusCircle, ClipboardList, Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Audits" };

const AUDIT_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Audit interne",
  SUPPLIER: "Fournisseur",
  SAFETY: "Sécurité",
  ENVIRONMENT: "Environnement",
  HACCP: "HACCP",
  QUALIOPI: "Qualiopi",
  ISO: "ISO",
};

const AUDIT_STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  PLANNED:     { label: "Planifié",    bg: "bg-blue-100",   color: "text-blue-700" },
  IN_PROGRESS: { label: "En cours",   bg: "bg-yellow-100", color: "text-yellow-700" },
  COMPLETED:   { label: "Terminé",    bg: "bg-green-100",  color: "text-green-700" },
  CLOSED:      { label: "Clôturé",    bg: "bg-gray-100",   color: "text-gray-600" },
};

export default async function AuditsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const audits = orgId
    ? await db.audit.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        include: {
          site: { select: { name: true } },
          findings: { select: { id: true } },
          nonConformities: { select: { id: true } },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audits</h1>
          <p className="text-sm text-gray-500 mt-1">{audits.length} audit{audits.length > 1 ? "s" : ""}</p>
        </div>
        <a href="/audits/new" className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
          <PlusCircle className="w-4 h-4" /> Planifier un audit
        </a>
      </div>

      {audits.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun audit planifié</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre premier audit pour commencer l&apos;évaluation</p>
          <a href="/audits/new" className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#1E3A5F] font-medium hover:underline">
            <PlusCircle className="w-3.5 h-3.5" /> Planifier un audit
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audits.map((audit) => {
            const statusStyle = AUDIT_STATUS_STYLES[audit.status] ?? AUDIT_STATUS_STYLES.PLANNED;
            return (
              <a key={audit.id} href={`/audits/${audit.id}`} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#1E3A5F] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {AUDIT_TYPE_LABELS[audit.type] ?? audit.type}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.color}`}>
                    {statusStyle.label}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{audit.title}</h3>
                {audit.site && (
                  <p className="text-xs text-gray-500 mb-3">Site : {audit.site.name}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {audit.scheduledAt ? formatDate(audit.scheduledAt) : "Non planifié"}
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{audit.findings.length} constat{audit.findings.length > 1 ? "s" : ""}</span>
                    {audit.nonConformities.length > 0 && (
                      <span className="text-red-500">{audit.nonConformities.length} NC</span>
                    )}
                  </div>
                </div>
                {audit.score != null && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Score</span>
                      <span className="text-xs font-bold text-gray-900">{Math.round(audit.score)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${audit.score >= 70 ? "bg-green-500" : audit.score >= 50 ? "bg-orange-500" : "bg-red-500"}`}
                        style={{ width: `${audit.score}%` }} />
                    </div>
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
