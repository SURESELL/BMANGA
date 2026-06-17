import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Award, CheckCircle, AlertCircle, Clock, ChevronRight } from "lucide-react";
import type { ComplianceLevel } from "@/types";
import { COMPLIANCE_LEVELS } from "@/types";

export const metadata = { title: "Qualiopi" };

export default async function QualiopiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const criteria = await db.qualiopiCriterion.findMany({
    orderBy: { order: "asc" },
    include: {
      indicators: {
        include: {
          evidences: orgId
            ? { where: { organizationId: orgId }, select: { complianceLevel: true } }
            : { take: 0 },
        },
      },
    },
  });

  // Compute compliance per criterion
  const criteriaWithStats = criteria.map((c) => {
    const allIndicators = c.indicators.length;
    if (allIndicators === 0) return { ...c, score: 0, compliant: 0, total: 0 };

    const compliant = c.indicators.filter((i) => {
      const evidence = i.evidences[0];
      return evidence?.complianceLevel === "COMPLIANT";
    }).length;

    const partial = c.indicators.filter((i) => {
      const evidence = i.evidences[0];
      return evidence?.complianceLevel === "PARTIAL";
    }).length;

    const score = allIndicators > 0
      ? Math.round(((compliant + partial * 0.5) / allIndicators) * 100)
      : 0;

    return { ...c, score, compliant, partial, total: allIndicators };
  });

  const globalScore = criteriaWithStats.length > 0
    ? Math.round(criteriaWithStats.reduce((sum, c) => sum + c.score, 0) / criteriaWithStats.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qualiopi</h1>
          <p className="text-sm text-gray-500 mt-1">Référentiel National Qualité — Certification des organismes de formation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-2xl font-bold ${globalScore >= 70 ? "text-green-600" : globalScore >= 50 ? "text-orange-500" : "text-red-600"}`}>
            {globalScore}%
          </div>
          <span className="text-sm text-gray-500">de conformité globale</span>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression globale Qualiopi</span>
          <span className="text-sm font-bold text-gray-900">{globalScore}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${globalScore >= 70 ? "bg-green-500" : globalScore >= 50 ? "bg-orange-500" : "bg-red-500"}`}
            style={{ width: `${globalScore}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Conforme
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            Partiel
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            À évaluer
          </div>
        </div>
      </div>

      {/* 7 Criteria */}
      <div className="space-y-3">
        {criteriaWithStats.map((criterion) => (
          <a
            key={criterion.id}
            href={`/qualiopi/${criterion.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-[#1E3A5F] hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              {/* Code badge */}
              <div className="w-12 h-12 rounded-xl bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-lg shrink-0">
                {criterion.code}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{criterion.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${criterion.score >= 70 ? "text-green-600" : criterion.score >= 50 ? "text-orange-500" : "text-gray-400"}`}>
                      {criterion.score}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1E3A5F] transition-colors" />
                  </div>
                </div>

                {criterion.description && (
                  <p className="text-xs text-gray-500 mt-1">{criterion.description}</p>
                )}

                {/* Progress bar per criterion */}
                <div className="mt-3">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${criterion.score >= 70 ? "bg-green-500" : criterion.score >= 50 ? "bg-orange-400" : "bg-gray-300"}`}
                      style={{ width: `${criterion.score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                    <span>{criterion.total} indicateur{criterion.total > 1 ? "s" : ""}</span>
                    <span>{criterion.compliant} conforme{criterion.compliant > 1 ? "s" : ""} · {criterion.partial} partiel{criterion.partial > 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Indicators preview */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {criterion.indicators.slice(0, 8).map((indicator) => {
                    const evidence = indicator.evidences[0];
                    const level = (evidence?.complianceLevel ?? "TO_EVALUATE") as ComplianceLevel;
                    const icon =
                      level === "COMPLIANT" ? <CheckCircle className="w-3 h-3" /> :
                      level === "NON_COMPLIANT" ? <AlertCircle className="w-3 h-3" /> :
                      <Clock className="w-3 h-3" />;
                    return (
                      <span
                        key={indicator.id}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${COMPLIANCE_LEVELS[level].bg} ${COMPLIANCE_LEVELS[level].color}`}
                        title={indicator.title}
                      >
                        {icon}
                        {indicator.code}
                      </span>
                    );
                  })}
                  {criterion.indicators.length > 8 && (
                    <span className="text-xs text-gray-400 px-1">+{criterion.indicators.length - 8}</span>
                  )}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <strong>⚠ Information :</strong> Les 7 critères Qualiopi sont issus du Référentiel National Qualité (RNQ) publié par France Compétences. Vérifier la version applicable sur <a href="https://www.francecompetences.fr" target="_blank" rel="noopener noreferrer" className="underline">francecompetences.fr</a> avant tout usage officiel.
      </div>
    </div>
  );
}
