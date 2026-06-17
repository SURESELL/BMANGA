import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Leaf, PlusCircle, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import { ComplianceBadge } from "@/components/ui/badge";
import { NORMIA_DISCLAIMER } from "@/types";
import type { ComplianceLevel } from "@/types";

export const metadata = { title: "Environnement / ICPE" };

const IMPACT_LABELS: Record<string, { label: string; color: string }> = {
  AIR:         { label: "Air",          color: "bg-sky-100 text-sky-700" },
  WATER:       { label: "Eau",          color: "bg-blue-100 text-blue-700" },
  SOIL:        { label: "Sol",          color: "bg-yellow-100 text-yellow-700" },
  WASTE:       { label: "Déchets",      color: "bg-orange-100 text-orange-700" },
  ENERGY:      { label: "Énergie",      color: "bg-purple-100 text-purple-700" },
  BIODIVERSITY:{ label: "Biodiversité", color: "bg-green-100 text-green-700" },
  NOISE:       { label: "Bruit",        color: "bg-gray-100 text-gray-600" },
};

const ICPE_REGIME_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  DECLARATION:    { label: "Déclaration",    bg: "bg-green-100",  color: "text-green-700" },
  ENREGISTREMENT: { label: "Enregistrement", bg: "bg-yellow-100", color: "text-yellow-700" },
  AUTORISATION:   { label: "Autorisation",   bg: "bg-red-100",    color: "text-red-700" },
};

const TRANSPORT_MODE_LABELS: Record<string, string> = {
  ROAD_ADR:    "Route (ADR)",
  RAIL_RID:    "Rail (RID)",
  WATERWAY_ADN:"Voie navigable (ADN)",
};

export default async function EnvironmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const [aspects, icpeItems, tmdItems] = await Promise.all([
    orgId
      ? db.environmentalAspect.findMany({
          where: { organizationId: orgId },
          orderBy: [{ significance: "asc" }, { impactType: "asc" }],
        })
      : [],
    orgId
      ? db.iCPEItem.findMany({
          where: { organizationId: orgId },
          orderBy: { regime: "asc" },
        })
      : [],
    orgId
      ? db.tMDItem.findMany({
          where: { organizationId: orgId },
          orderBy: { hazardClass: "asc" },
        })
      : [],
  ]);

  const significantAspects = aspects.filter((a) => a.significance === "SIGNIFICANT").length;
  const icpeAuth = icpeItems.filter((i) => i.regime === "AUTORISATION").length;
  const icpeOverdue = icpeItems.filter((i) => i.nextInspectionAt && isOverdue(i.nextInspectionAt)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environnement & ICPE</h1>
          <p className="text-sm text-gray-500 mt-1">Aspects environnementaux, ICPE et transport de matières dangereuses</p>
        </div>
        <div className="flex gap-2">
          <a href="/environment/icpe/new" className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            + ICPE
          </a>
          <a href="/environment/new" className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
            <PlusCircle className="w-4 h-4" /> Aspect env.
          </a>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{NORMIA_DISCLAIMER}</p>
        </div>
      </div>

      {/* Alerts */}
      {icpeOverdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-800 font-medium">
              {icpeOverdue} inspection{icpeOverdue > 1 ? "s" : ""} ICPE en retard — planifiez immédiatement.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A5F]">{aspects.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aspects environnementaux</p>
        </div>
        <div className="bg-orange-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{significantAspects}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aspects significatifs</p>
        </div>
        <div className="bg-red-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{icpeAuth}</p>
          <p className="text-xs text-gray-500 mt-0.5">ICPE sous autorisation</p>
        </div>
        <div className="bg-blue-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{tmdItems.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Matières TMD/ADR</p>
        </div>
      </div>

      {/* Environmental Aspects */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Aspects environnementaux</h2>
          <span className="text-xs text-gray-500">{aspects.length} aspects</span>
        </div>
        {aspects.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Leaf className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun aspect enregistré</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activité / Aspect</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Impact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Significatif</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Conformité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {aspects.map((a) => {
                const impactCfg = IMPACT_LABELS[a.impactType] ?? IMPACT_LABELS.AIR;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{a.activity}</p>
                      <p className="text-xs text-gray-500">{a.aspect}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{a.impact}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${impactCfg.color}`}>
                        {impactCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.significance === "SIGNIFICANT" ? (
                        <span className="flex items-center gap-1 text-xs text-orange-700">
                          <AlertTriangle className="w-3 h-3" /> Oui
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" /> Non
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <ComplianceBadge level={a.complianceLevel as ComplianceLevel} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ICPE Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Installations classées (ICPE)</h2>
          <span className="text-xs text-gray-500">{icpeItems.length} rubriques</span>
        </div>
        {icpeItems.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-gray-400 text-sm">Aucune rubrique ICPE enregistrée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rubrique</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Désignation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Régime</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Quantité</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prochaine inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {icpeItems.map((item) => {
                const regimeCfg = ICPE_REGIME_STYLES[item.regime] ?? ICPE_REGIME_STYLES.DECLARATION;
                const overdue = item.nextInspectionAt && isOverdue(item.nextInspectionAt);
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${overdue ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{item.rubrique}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{item.designation}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${regimeCfg.bg} ${regimeCfg.color}`}>
                        {regimeCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                      {item.actualQuantity ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {item.nextInspectionAt ? (
                        <div className="flex items-center gap-1">
                          {overdue ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          )}
                          <span className={`text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                            {formatDate(item.nextInspectionAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* TMD / ADR */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Transport de Matières Dangereuses (TMD/ADR)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Accord européen relatif au transport international des marchandises dangereuses</p>
          </div>
          <a href="/environment/tmd/new" className="text-xs text-[#1E3A5F] hover:underline">
            + Ajouter
          </a>
        </div>
        {tmdItems.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-gray-400 text-sm">Aucune matière dangereuse enregistrée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">N° ONU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Désignation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Classe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mode transport</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Quantité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tmdItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{item.unNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{item.designation}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      Classe {item.hazardClass}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {item.packagingGroup ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {TRANSPORT_MODE_LABELS[item.transportMode] ?? item.transportMode}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                    {item.quantity ? `${item.quantity} ${item.unit ?? ""}`.trim() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
