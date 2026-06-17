import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertCircle, Clock, Upload, Plus } from "lucide-react";
import { ComplianceBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { ComplianceLevel } from "@/types";
import { COMPLIANCE_LEVELS } from "@/types";

export default async function QualiopiCriterionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const criterion = await db.qualiopiCriterion.findUnique({
    where: { id },
    include: {
      indicators: {
        orderBy: { code: "asc" },
        include: {
          evidences: orgId
            ? { where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }
            : { take: 0 },
        },
      },
    },
  });

  if (!criterion) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <a href="/qualiopi" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white bg-[#1E3A5F] px-2 py-0.5 rounded">{criterion.code}</span>
            <h1 className="text-xl font-bold text-gray-900">{criterion.title}</h1>
          </div>
          {criterion.description && <p className="text-sm text-gray-500 mt-0.5">{criterion.description}</p>}
        </div>
      </div>

      {/* Indicators */}
      <div className="space-y-4">
        {criterion.indicators.map((indicator) => {
          const evidence = indicator.evidences[0];
          const level = (evidence?.complianceLevel ?? "TO_EVALUATE") as ComplianceLevel;

          return (
            <div key={indicator.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                  {indicator.code}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{indicator.title}</h3>
                      {indicator.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{indicator.description}</p>
                      )}
                    </div>
                    <ComplianceBadge level={level} />
                  </div>

                  {/* Evidence */}
                  {evidence ? (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{evidence.title}</p>
                          {evidence.description && <p className="text-xs text-gray-500 mt-0.5">{evidence.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {evidence.fileUrl && (
                            <a href={evidence.fileUrl} className="text-xs text-[#1E3A5F] hover:underline">Voir</a>
                          )}
                          <span className="text-xs text-gray-400">{formatDate(evidence.createdAt)}</span>
                        </div>
                      </div>
                      {evidence.verifiedAt && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Validé le {formatDate(evidence.verifiedAt)}
                          {evidence.verifiedBy && ` par ${evidence.verifiedBy}`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400">Aucune preuve ajoutée</span>
                      <a href={`/qualiopi/${indicator.id}/evidence/new`} className="flex items-center gap-1 text-xs text-[#1E3A5F] font-medium hover:underline">
                        <Plus className="w-3 h-3" /> Ajouter une preuve
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance selector */}
              <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">Niveau de conformité :</span>
                <div className="flex items-center gap-2">
                  {(["COMPLIANT", "PARTIAL", "NON_COMPLIANT", "NOT_APPLICABLE"] as ComplianceLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                        level === lvl
                          ? `${COMPLIANCE_LEVELS[lvl].bg} ${COMPLIANCE_LEVELS[lvl].color} ring-2 ring-offset-1 ring-current`
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {COMPLIANCE_LEVELS[lvl].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
