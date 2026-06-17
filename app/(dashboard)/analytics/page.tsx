import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BarChart3, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, BookOpen, ClipboardList } from "lucide-react";
import { RISK_LEVELS } from "@/types";
import type { RiskLevel } from "@/types";

export const metadata = { title: "Tableaux de bord" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return (
    <div className="text-center py-12 text-gray-500">Aucune organisation associée.</div>
  );

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [risks, actions, incidents, trainings, audits] = await Promise.all([
    db.risk.groupBy({ by: ["riskLevel"], where: { organizationId: orgId }, _count: { riskLevel: true } }),
    db.actionPlan.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: { status: true } }),
    db.incident.findMany({
      where: { organizationId: orgId },
      select: { id: true, severity: true, occurredAt: true, status: true },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    db.trainingEnrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: { completedAt: true, passed: true, enrolledAt: true },
    }),
    db.audit.findMany({
      where: { organizationId: orgId },
      select: { id: true, score: true, status: true, closedAt: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // Risk distribution
  const riskDist = Object.fromEntries(risks.map((r) => [r.riskLevel, r._count.riskLevel]));
  const totalRisks = risks.reduce((s, r) => s + r._count.riskLevel, 0);

  // Action stats
  const actionDist = Object.fromEntries(actions.map((a) => [a.status, a._count.status]));
  const overdueActions = await db.actionPlan.count({
    where: { organizationId: orgId, status: { notIn: ["DONE", "CANCELED"] }, dueDate: { lt: now } },
  });

  // Incident trend (last 30 vs prev 30)
  const recent30 = incidents.filter((i) => i.occurredAt >= thirtyDaysAgo).length;
  const prev30 = incidents.filter((i) => i.occurredAt >= sixtyDaysAgo && i.occurredAt < thirtyDaysAgo).length;
  const incidentTrend = prev30 > 0 ? Math.round(((recent30 - prev30) / prev30) * 100) : 0;

  // Training completion rate
  const completedTrainings = trainings.filter((t) => t.completedAt !== null).length;
  const completionRate = trainings.length > 0 ? Math.round((completedTrainings / trainings.length) * 100) : 0;

  // Audit scores
  const closedAudits = audits.filter((a) => a.score !== null);
  const avgAuditScore = closedAudits.length > 0
    ? Math.round(closedAudits.reduce((s, a) => s + (a.score ?? 0), 0) / closedAudits.length)
    : 0;

  // Global compliance score
  const criticalRisks = (riskDist.CRITICAL ?? 0) + (riskDist.HIGH ?? 0);
  const complianceScore = Math.max(0, Math.min(100, 100 - criticalRisks * 5 - overdueActions * 3));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableaux de bord</h1>
        <p className="text-sm text-gray-500 mt-1">Vue analytique de votre conformité et performance HSE</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Score conformité"
          value={`${complianceScore}%`}
          icon={ShieldCheck}
          color={complianceScore >= 70 ? "green" : complianceScore >= 50 ? "orange" : "red"}
          subtitle="Estimation globale"
        />
        <KPICard
          title="Risques critiques"
          value={String(criticalRisks)}
          icon={AlertTriangle}
          color={criticalRisks === 0 ? "green" : criticalRisks <= 3 ? "orange" : "red"}
          subtitle={`/ ${totalRisks} risques total`}
        />
        <KPICard
          title="Taux complétion formations"
          value={`${completionRate}%`}
          icon={BookOpen}
          color={completionRate >= 70 ? "green" : "orange"}
          subtitle={`${completedTrainings}/${trainings.length} inscrits`}
        />
        <KPICard
          title="Score audits moyen"
          value={`${avgAuditScore}%`}
          icon={ClipboardList}
          color={avgAuditScore >= 70 ? "green" : avgAuditScore >= 50 ? "orange" : "red"}
          subtitle={`${closedAudits.length} audits clôturés`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Répartition des risques par niveau</h2>
          {totalRisks === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun risque enregistré</p>
          ) : (
            <div className="space-y-3">
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "NEGLIGIBLE"] as RiskLevel[]).map((level) => {
                const count = riskDist[level] ?? 0;
                const pct = totalRisks > 0 ? Math.round((count / totalRisks) * 100) : 0;
                const cfg = RISK_LEVELS[level];
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-gray-600">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${cfg.bg.replace("bg-", "bg-").replace("-100", "-500")}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action plans status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">État des plans d&apos;action</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "TODO",        label: "À faire",    color: "bg-blue-100 text-blue-700" },
              { key: "IN_PROGRESS", label: "En cours",   color: "bg-yellow-100 text-yellow-700" },
              { key: "DONE",        label: "Terminées",  color: "bg-green-100 text-green-700" },
              { key: "OVERDUE",     label: "En retard",  color: "bg-red-100 text-red-700", overrideValue: overdueActions },
            ].map((s) => (
              <div key={s.key} className={`rounded-xl p-4 ${s.color}`}>
                <p className="text-2xl font-bold">{s.overrideValue ?? (actionDist[s.key] ?? 0)}</p>
                <p className="text-sm font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Incidents — 30 derniers jours</h2>
            <div className={`flex items-center gap-1 text-sm font-medium ${incidentTrend <= 0 ? "text-green-600" : "text-red-600"}`}>
              {incidentTrend <= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {incidentTrend > 0 ? "+" : ""}{incidentTrend}% vs mois préc.
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">{recent30}</div>
          <p className="text-sm text-gray-500">incidents déclarés</p>

          {/* Breakdown by severity */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Accidents", filter: "ACCIDENT", color: "text-red-600 bg-red-50" },
              { label: "Incidents",  filter: "INCIDENT",  color: "text-orange-600 bg-orange-50" },
              { label: "Presque acc.", filter: "NEAR_MISS", color: "text-gray-600 bg-gray-50" },
            ].map((s) => {
              const count = incidents.filter((i) => i.occurredAt >= thirtyDaysAgo && (i as { type?: string }).type === s.filter).length;
              return (
                <div key={s.filter} className={`rounded-lg p-3 text-center ${s.color}`}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit scores */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Scores par type d&apos;audit</h2>
          {closedAudits.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun audit clôturé</p>
          ) : (
            <div className="space-y-3">
              {["INTERNAL", "SAFETY", "ENVIRONMENT", "QUALIOPI", "HACCP", "ISO"].map((type) => {
                const typeAudits = closedAudits.filter((a) => a.type === type);
                if (typeAudits.length === 0) return null;
                const avg = Math.round(typeAudits.reduce((s, a) => s + (a.score ?? 0), 0) / typeAudits.length);
                const labels: Record<string, string> = {
                  INTERNAL: "Audit interne", SAFETY: "Sécurité", ENVIRONMENT: "Environnement",
                  QUALIOPI: "Qualiopi", HACCP: "HACCP", ISO: "ISO",
                };
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-gray-700">{labels[type]}</span>
                      <span className={`font-bold ${avg >= 70 ? "text-green-600" : avg >= 50 ? "text-orange-500" : "text-red-600"}`}>{avg}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${avg >= 70 ? "bg-green-500" : avg >= 50 ? "bg-orange-400" : "bg-red-500"}`}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, subtitle }: {
  title: string; value: string; icon: React.ComponentType<{ className?: string }>;
  color: "green" | "orange" | "red"; subtitle: string;
}) {
  const colors = {
    green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-600",  val: "text-green-700" },
    orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600", val: "text-orange-700" },
    red:    { bg: "bg-red-50",    icon: "bg-red-100 text-red-600",    val: "text-red-700" },
  };
  const c = colors[color];
  return (
    <div className={`${c.bg} border border-gray-200 rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.icon} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  );
}
