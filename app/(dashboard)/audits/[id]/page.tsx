import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ClipboardList, AlertCircle, CheckCircle, Eye, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { StatusBadge, ComplianceBadge } from "@/components/ui/badge";
import type { ActionStatus, ComplianceLevel } from "@/types";

const AUDIT_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Audit interne", SUPPLIER: "Audit fournisseur", SAFETY: "Sécurité",
  ENVIRONMENT: "Environnement", HACCP: "HACCP", QUALIOPI: "Qualiopi", ISO: "ISO",
};

const FINDING_TYPE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  OBSERVATION:  { label: "Observation",  bg: "bg-blue-100",   color: "text-blue-700" },
  MINOR_NC:     { label: "NC mineure",   bg: "bg-yellow-100", color: "text-yellow-700" },
  MAJOR_NC:     { label: "NC majeure",   bg: "bg-orange-100", color: "text-orange-700" },
  OPPORTUNITY:  { label: "Opportunité",  bg: "bg-green-100",  color: "text-green-700" },
};

const AUDIT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PLANNED:     { label: "Planifié",    color: "text-blue-600" },
  IN_PROGRESS: { label: "En cours",   color: "text-orange-600" },
  CLOSED:      { label: "Clôturé",    color: "text-green-600" },
  CANCELED:    { label: "Annulé",     color: "text-gray-500" },
};

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const audit = await db.audit.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      site: { select: { name: true } },
      checklists: { orderBy: [{ section: "asc" }, { order: "asc" }] },
      findings: { orderBy: { createdAt: "desc" } },
      nonConformities: { orderBy: { createdAt: "desc" } },
      actionPlans: { orderBy: { priority: "desc" }, take: 10 },
    },
  });

  if (!audit) notFound();

  const statusCfg = AUDIT_STATUS_LABELS[audit.status] ?? AUDIT_STATUS_LABELS.PLANNED;
  const sections = [...new Set(audit.checklists.map((c) => c.section))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a href="/audits" className="hover:underline">Audits</a>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium truncate max-w-xs">{audit.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{audit.title}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
              {AUDIT_TYPE_LABELS[audit.type] ?? audit.type}
            </span>
            <span className={`text-sm font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
            {audit.site && <span className="text-sm text-gray-500">{audit.site.name}</span>}
            {audit.score !== null && (
              <span className={`text-sm font-bold ${audit.score >= 70 ? "text-green-600" : audit.score >= 50 ? "text-orange-600" : "text-red-600"}`}>
                Score : {audit.score}%
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-sm text-gray-500 shrink-0">
          {audit.scheduledAt && <p>Planifié : {formatDate(audit.scheduledAt)}</p>}
          {audit.startedAt && <p>Démarré : {formatDate(audit.startedAt)}</p>}
          {audit.closedAt && <p>Clôturé : {formatDate(audit.closedAt)}</p>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-[#1E3A5F]">{audit.checklists.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Points de contrôle</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-orange-600">{audit.findings.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Constats</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-red-600">{audit.nonConformities.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Non-conformités</p>
        </div>
      </div>

      {/* Notes */}
      {audit.notes && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-700">{audit.notes}</p>
        </div>
      )}

      {/* Checklist by section */}
      {audit.checklists.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Grille de contrôle</h2>
          </div>
          {sections.map((section) => (
            <div key={section}>
              <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{section}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {audit.checklists
                  .filter((c) => c.section === section)
                  .map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}</span>
                      <p className="text-sm text-gray-700 flex-1">{item.question}</p>
                      <Eye className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Findings */}
      {audit.findings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Constats</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {audit.findings.map((f) => {
              const typeCfg = FINDING_TYPE_STYLES[f.type] ?? FINDING_TYPE_STYLES.OBSERVATION;
              return (
                <div key={f.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${typeCfg.bg} ${typeCfg.color}`}>
                    {typeCfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{f.description}</p>
                    {f.reference && <p className="text-xs text-gray-400 mt-0.5">Réf : {f.reference}</p>}
                  </div>
                  <ComplianceBadge level={f.complianceLevel as ComplianceLevel} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-conformities */}
      {audit.nonConformities.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Non-conformités détectées</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {audit.nonConformities.map((nc) => (
              <div key={nc.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{nc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{nc.description}</p>
                </div>
                <StatusBadge status={nc.status as ActionStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action plans */}
      {audit.actionPlans.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Plans d&apos;action associés</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {audit.actionPlans.map((ap) => (
              <div key={ap.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <CheckCircle className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{ap.title}</p>
                  {ap.dueDate && <p className="text-xs text-gray-400 mt-0.5">Échéance : {formatDate(ap.dueDate)}</p>}
                </div>
                <StatusBadge status={ap.status as ActionStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      {audit.checklists.length === 0 && audit.findings.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Aucun contenu enregistré pour cet audit</p>
        </div>
      )}
    </div>
  );
}
