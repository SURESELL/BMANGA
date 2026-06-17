import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PlusCircle, ShieldAlert, AlertTriangle, CheckCircle, FlaskConical } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NORMIA_DISCLAIMER } from "@/types";

export const metadata = { title: "HACCP / PMS" };

const HAZARD_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  BIOLOGICAL: { label: "Biologique", bg: "bg-green-100",  color: "text-green-700" },
  CHEMICAL:   { label: "Chimique",   bg: "bg-yellow-100", color: "text-yellow-700" },
  PHYSICAL:   { label: "Physique",   bg: "bg-blue-100",   color: "text-blue-700" },
  ALLERGEN:   { label: "Allergène",  bg: "bg-orange-100", color: "text-orange-700" },
};

export default async function HACCPPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const plans = orgId
    ? await db.hACCPPlan.findMany({
        where: { organizationId: orgId },
        include: {
          ccps: true,
          prpos: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const stats = {
    plans: plans.length,
    ccps: plans.reduce((s, p) => s + p.ccps.length, 0),
    prpos: plans.reduce((s, p) => s + p.prpos.length, 0),
    validated: plans.filter((p) => p.validatedAt !== null).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HACCP / PMS</h1>
          <p className="text-sm text-gray-500 mt-1">Plans de maîtrise sanitaire, CCP et PRPo</p>
        </div>
        <a
          href="/haccp/new"
          className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Nouveau plan
        </a>
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
          <p className="text-2xl font-bold text-[#1E3A5F]">{stats.plans}</p>
          <p className="text-xs text-gray-500 mt-0.5">Plans PMS</p>
        </div>
        <div className="bg-green-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.validated}</p>
          <p className="text-xs text-gray-500 mt-0.5">Plans validés</p>
        </div>
        <div className="bg-red-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.ccps}</p>
          <p className="text-xs text-gray-500 mt-0.5">Points CCP</p>
        </div>
        <div className="bg-blue-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.prpos}</p>
          <p className="text-xs text-gray-500 mt-0.5">PRPo</p>
        </div>
      </div>

      {/* Plans */}
      {plans.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun plan HACCP / PMS</p>
          <p className="text-sm text-gray-400 mt-1">
            Créez votre premier Plan de Maîtrise Sanitaire conforme au règlement CE 852/2004
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Plan header */}
              <div className="flex items-start justify-between p-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      v{plan.version}
                    </span>
                    {plan.validatedAt ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Validé
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        En cours
                      </span>
                    )}
                  </div>
                  {plan.productType && (
                    <p className="text-sm text-gray-500">Produit : {plan.productType}</p>
                  )}
                  {plan.scope && (
                    <p className="text-xs text-gray-400 mt-0.5">Périmètre : {plan.scope}</p>
                  )}
                  {plan.validatedAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Validé le {formatDate(plan.validatedAt)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{plan.ccps.length} CCP</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{plan.prpos.length} PRPo</span>
                  <a
                    href={`/haccp/${plan.id}`}
                    className="text-xs text-[#1E3A5F] hover:underline ml-2"
                  >
                    Voir →
                  </a>
                </div>
              </div>

              {/* CCP table */}
              {plan.ccps.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-red-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Points Critiques de Contrôle (CCP)
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Étape</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Danger</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Type</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden lg:table-cell">Limite critique</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden lg:table-cell">Surveillance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {plan.ccps.map((ccp) => {
                        const hz = HAZARD_STYLES[ccp.hazardType] ?? HAZARD_STYLES.BIOLOGICAL;
                        return (
                          <tr key={ccp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{ccp.step}</td>
                            <td className="px-4 py-3 text-gray-700">{ccp.hazard}</td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hz.bg} ${hz.color}`}>
                                {hz.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                              {ccp.criticalLimit}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                              {ccp.monitoring}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PRPo list */}
              {plan.prpos.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-blue-50 border-b border-gray-100 border-t border-gray-100">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      PRPo — Programmes Prérequis Opérationnels
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {plan.prpos.map((prpo) => (
                      <div
                        key={prpo.id}
                        className="flex items-start justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{prpo.name}</p>
                          {prpo.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{prpo.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          {prpo.frequency && (
                            <p className="text-xs text-gray-500">{prpo.frequency}</p>
                          )}
                          {prpo.responsible && (
                            <p className="text-xs text-gray-400">{prpo.responsible}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reference info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-700 mb-3 text-sm">Références réglementaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="space-y-1.5">
            <p><span className="font-medium">Règlement CE 852/2004</span> — Hygiène des denrées alimentaires</p>
            <p><span className="font-medium">Règlement CE 853/2004</span> — Règles spécifiques d&apos;hygiène (produits animaux)</p>
            <p><span className="font-medium">Arrêté du 21/12/2009</span> — Règles sanitaires applicables aux activités de commerce de détail</p>
          </div>
          <div className="space-y-1.5">
            <p><span className="font-medium">Codex Alimentarius</span> — Système HACCP (principes généraux d&apos;hygiène alimentaire)</p>
            <p><span className="font-medium">Note de service DGAL/SDSSA</span> — Guides de bonnes pratiques d&apos;hygiène (GBPH)</p>
            <p className="text-amber-700 font-medium">⚠ Toutes les références doivent être vérifiées avec un expert en sécurité alimentaire.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
