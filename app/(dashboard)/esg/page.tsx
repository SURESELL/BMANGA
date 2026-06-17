import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TrendingUp, TrendingDown, Minus, PlusCircle, Leaf, Users, Shield } from "lucide-react";

export const metadata = { title: "ESG / RSE" };

const CATEGORY_CONFIG = {
  ENVIRONMENTAL: { label: "Environnemental",  icon: Leaf,   bg: "bg-green-50",  color: "text-green-700",  border: "border-green-200" },
  SOCIAL:        { label: "Social",           icon: Users,  bg: "bg-blue-50",   color: "text-blue-700",   border: "border-blue-200" },
  GOVERNANCE:    { label: "Gouvernance",      icon: Shield, bg: "bg-purple-50", color: "text-purple-700", border: "border-purple-200" },
} as const;

type ESGCategory = keyof typeof CATEGORY_CONFIG;

export default async function ESGPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const currentYear = new Date().getFullYear();

  const indicators = orgId
    ? await db.eSGIndicator.findMany({
        where: { organizationId: orgId },
        orderBy: [{ category: "asc" }, { year: "desc" }, { name: "asc" }],
      })
    : [];

  const currentYear_indicators = indicators.filter((i) => i.year === currentYear);
  const byCategory = {
    ENVIRONMENTAL: currentYear_indicators.filter((i) => i.category === "ENVIRONMENTAL"),
    SOCIAL:        currentYear_indicators.filter((i) => i.category === "SOCIAL"),
    GOVERNANCE:    currentYear_indicators.filter((i) => i.category === "GOVERNANCE"),
  };

  const withTarget = currentYear_indicators.filter((i) => i.target !== null && i.actual !== null);
  const onTrack = withTarget.filter((i) => i.actual! >= i.target!).length;
  const completionRate = withTarget.length > 0 ? Math.round((onTrack / withTarget.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ESG / RSE</h1>
          <p className="text-sm text-gray-500 mt-1">
            Indicateurs Environnementaux, Sociaux et de Gouvernance — {currentYear}
          </p>
        </div>
        <a
          href="/esg/new"
          className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Ajouter indicateur
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A5F]">{currentYear_indicators.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Indicateurs {currentYear}</p>
        </div>
        <div className="bg-green-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
          <p className="text-xs text-gray-500 mt-0.5">Objectifs atteints</p>
        </div>
        <div className="bg-blue-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{byCategory.SOCIAL.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Indicateurs sociaux</p>
        </div>
        <div className="bg-purple-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{byCategory.GOVERNANCE.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Indicateurs gouvernance</p>
        </div>
      </div>

      {indicators.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun indicateur ESG</p>
          <p className="text-sm text-gray-400 mt-1">
            Définissez vos indicateurs E, S et G pour piloter votre démarche RSE
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {(["ENVIRONMENTAL", "SOCIAL", "GOVERNANCE"] as ESGCategory[]).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const catIndicators = byCategory[cat];
            if (catIndicators.length === 0) return null;
            const Icon = cfg.icon;

            return (
              <div key={cat} className={`bg-white border ${cfg.border} rounded-xl overflow-hidden`}>
                <div className={`flex items-center gap-2 px-5 py-4 border-b ${cfg.border} ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <h2 className={`font-semibold ${cfg.color}`}>{cfg.label}</h2>
                  <span className="ml-auto text-xs text-gray-500">{catIndicators.length} indicateurs</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {catIndicators.map((ind) => {
                    const hasProgress = ind.target !== null && ind.actual !== null;
                    const progress = hasProgress
                      ? Math.min(100, Math.round((ind.actual! / ind.target!) * 100))
                      : null;
                    const isGood = progress !== null && progress >= 100;
                    const isBehind = progress !== null && progress < 70;

                    return (
                      <div key={ind.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{ind.name}</p>
                            {ind.source && (
                              <p className="text-xs text-gray-400 mt-0.5">Source : {ind.source}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            {ind.actual !== null && (
                              <p className={`text-lg font-bold ${isGood ? "text-green-600" : isBehind ? "text-red-600" : "text-orange-600"}`}>
                                {ind.actual} {ind.unit ?? ""}
                              </p>
                            )}
                            {ind.target !== null && (
                              <p className="text-xs text-gray-400">Cible : {ind.target} {ind.unit ?? ""}</p>
                            )}
                          </div>
                        </div>

                        {hasProgress && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${isGood ? "bg-green-500" : isBehind ? "bg-red-400" : "bg-orange-400"}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className={`flex items-center gap-0.5 text-xs font-medium shrink-0 ${isGood ? "text-green-600" : isBehind ? "text-red-600" : "text-orange-600"}`}>
                              {isGood ? <TrendingUp className="w-3 h-3" /> :
                               isBehind ? <TrendingDown className="w-3 h-3" /> :
                               <Minus className="w-3 h-3" />}
                              {progress}%
                            </div>
                          </div>
                        )}

                        {ind.notes && (
                          <p className="text-xs text-gray-500 mt-1.5 italic">{ind.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Year history */}
      {indicators.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">
            Historique disponible :{" "}
            {[...new Set(indicators.map((i) => i.year))].sort((a, b) => b - a).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
