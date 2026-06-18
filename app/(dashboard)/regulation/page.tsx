import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText, AlertTriangle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { ComplianceBadge } from "@/components/ui/badge";
import { NORMIA_DISCLAIMER } from "@/types";
import type { ComplianceLevel, RiskLevel } from "@/types";
import { RISK_LEVELS } from "@/types";

export const metadata = { title: "Réglementation" };

const DOMAIN_LABELS: Record<string, { label: string; color: string }> = {
  HSE:       { label: "HSE",         color: "bg-blue-100 text-blue-700" },
  FOOD:      { label: "Alimentaire", color: "bg-green-100 text-green-700" },
  ENV:       { label: "Environnement", color: "bg-teal-100 text-teal-700" },
  TRANSPORT: { label: "Transport",   color: "bg-purple-100 text-purple-700" },
  QUALITY:   { label: "Qualité",     color: "bg-yellow-100 text-yellow-700" },
  SOCIAL:    { label: "Social",      color: "bg-orange-100 text-orange-700" },
  FISCAL:    { label: "Fiscal",      color: "bg-gray-100 text-gray-600" },
};

export default async function RegulationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  // Global regulations + org-specific
  const regulations = await db.regulation.findMany({
    where: { OR: [{ organizationId: null }, { organizationId: orgId }] },
    include: {
      obligations: {
        select: {
          id: true, title: true, complianceLevel: true, criticality: true,
          dueDate: true, disclaimer: true, isValidatedByExpert: true,
        },
      },
    },
    orderBy: { domain: "asc" },
  });

  const stats = {
    total: regulations.reduce((s, r) => s + r.obligations.length, 0),
    compliant: regulations.reduce((s, r) => s + r.obligations.filter((o) => o.complianceLevel === "COMPLIANT").length, 0),
    critical: regulations.reduce((s, r) => s + r.obligations.filter((o) => o.criticality === "CRITICAL" && o.complianceLevel !== "COMPLIANT").length, 0),
    toEvaluate: regulations.reduce((s, r) => s + r.obligations.filter((o) => o.complianceLevel === "TO_EVALUATE").length, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moteur réglementaire</h1>
          <p className="text-sm text-gray-500 mt-1">Obligations légales, sources officielles et suivi de conformité</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{NORMIA_DISCLAIMER}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A5F]">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Obligations totales</p>
        </div>
        <div className="bg-green-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
          <p className="text-xs text-gray-500 mt-0.5">Conformes</p>
        </div>
        <div className="bg-red-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          <p className="text-xs text-gray-500 mt-0.5">Critiques non conformes</p>
        </div>
        <div className="bg-blue-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.toEvaluate}</p>
          <p className="text-xs text-gray-500 mt-0.5">À évaluer</p>
        </div>
      </div>

      {/* Regulations list */}
      {regulations.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune réglementation configurée</p>
          <p className="text-sm text-gray-400 mt-1">Le référentiel réglementaire sera enrichi progressivement</p>
        </div>
      ) : (
        <div className="space-y-4">
          {regulations.map((reg) => {
            const domainCfg = DOMAIN_LABELS[reg.domain] ?? DOMAIN_LABELS.HSE;
            const compliantCount = reg.obligations.filter((o) => o.complianceLevel === "COMPLIANT").length;

            return (
              <div key={reg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-start gap-4 p-5 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${domainCfg.color}`}>{domainCfg.label}</span>
                      {reg.officialLink && (
                        <a href={reg.officialLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-0.5">
                          Source <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{reg.title}</h3>
                    {reg.description && <p className="text-xs text-gray-500 mt-0.5">{reg.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Source : {reg.source}
                      {reg.applicableScope && ` — Champ : ${reg.applicableScope}`}
                    </p>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-xs text-gray-500">{reg.obligations.length} obligation{reg.obligations.length > 1 ? "s" : ""}</p>
                    <p className="text-xs text-green-600">{compliantCount} conforme{compliantCount > 1 ? "s" : ""}</p>
                  </div>
                </div>

                {/* Obligations */}
                {reg.obligations.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {reg.obligations.map((obl) => {
                      const level = obl.complianceLevel as ComplianceLevel;
                      const criticality = obl.criticality as RiskLevel;
                      return (
                        <div key={obl.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800">{obl.title}</p>
                              {!obl.isValidatedByExpert && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Non validé expert</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 italic">{obl.disclaimer}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RISK_LEVELS[criticality]?.bg ?? "bg-gray-100"} ${RISK_LEVELS[criticality]?.color ?? "text-gray-600"}`}>
                              {RISK_LEVELS[criticality]?.label ?? criticality}
                            </span>
                            <ComplianceBadge level={level} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
