import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Tableaux de bord analytiques — NORMIA" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) {
    return (
      <div className="text-center py-12 text-gray-500">Aucune organisation associée.</div>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    risksByLevel,
    actionsByStatus,
    incidentsByStatus,
    incidentsBySeverity,
    totalEnrollments,
    certifiedEnrollments,
    auditsThisMonth,
    overdueActions,
    criticalRisksCount,
    totalRisks,
    totalActions,
    openIncidents,
    totalIncidents,
    recentActivity,
  ] = await Promise.all([
    db.risk.groupBy({ by: ["riskLevel"], where: { organizationId: orgId }, _count: { id: true } }),
    db.actionPlan.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: { id: true } }),
    db.incident.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: { id: true } }),
    db.incident.groupBy({ by: ["severity"], where: { organizationId: orgId }, _count: { id: true } }),
    db.trainingEnrollment.count({ where: { course: { organizationId: orgId } } }),
    db.trainingEnrollment.count({ where: { course: { organizationId: orgId }, progress: 100 } }),
    db.audit.count({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    db.actionPlan.count({
      where: {
        organizationId: orgId,
        status: { notIn: ["DONE", "CANCELED"] },
        dueDate: { lt: now },
      },
    }),
    db.risk.count({ where: { organizationId: orgId, riskLevel: "CRITICAL" } }),
    db.risk.count({ where: { organizationId: orgId } }),
    db.actionPlan.count({ where: { organizationId: orgId } }),
    db.incident.count({ where: { organizationId: orgId, status: "DECLARED" } }),
    db.incident.count({ where: { organizationId: orgId } }),
    db.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const trainingRate =
    totalEnrollments > 0 ? Math.round((certifiedEnrollments / totalEnrollments) * 100) : 0;
  const complianceScore = Math.max(
    0,
    Math.min(100, 100 - criticalRisksCount * 5 - overdueActions * 3)
  );

  const riskDist = Object.fromEntries(risksByLevel.map((r) => [r.riskLevel, r._count.id]));
  const actionDist = Object.fromEntries(actionsByStatus.map((a) => [a.status, a._count.id]));
  const incidentSeverityDist = Object.fromEntries(
    incidentsBySeverity.map((i) => [i.severity, i._count.id])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Tableaux de bord analytiques</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue consolidée de la conformité et performance HSE de votre organisation
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Risques critiques"
          value={String(criticalRisksCount)}
          sub={`/ ${totalRisks} risques`}
          accent={criticalRisksCount === 0 ? "green" : criticalRisksCount <= 3 ? "orange" : "red"}
        />
        <KPICard
          title="Actions en retard"
          value={String(overdueActions)}
          sub={`/ ${totalActions} actions`}
          accent={overdueActions === 0 ? "green" : overdueActions <= 5 ? "orange" : "red"}
        />
        <KPICard
          title="Incidents ouverts"
          value={String(openIncidents)}
          sub={`/ ${totalIncidents} incidents`}
          accent={openIncidents === 0 ? "green" : "orange"}
        />
        <KPICard
          title="Taux de formation"
          value={`${trainingRate}%`}
          sub={`${certifiedEnrollments}/${totalEnrollments} certifiés`}
          accent={trainingRate >= 70 ? "green" : "orange"}
        />
        <KPICard
          title="Audits ce mois"
          value={String(auditsThisMonth)}
          sub="planifiés sur la période"
          accent="blue"
        />
        <KPICard
          title="Score conformité"
          value={`${complianceScore}%`}
          sub="estimation globale"
          accent={complianceScore >= 70 ? "green" : complianceScore >= 50 ? "orange" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Risques par niveau</h2>
          {totalRisks === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun risque enregistré</p>
          ) : (
            <div className="space-y-3">
              {(
                [
                  { level: "CRITICAL",   label: "Critique",     badge: "bg-red-100 text-red-700",     bar: "bg-red-500" },
                  { level: "HIGH",       label: "Élevé",        badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500" },
                  { level: "MEDIUM",     label: "Moyen",        badge: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-500" },
                  { level: "LOW",        label: "Faible",       badge: "bg-blue-100 text-blue-700",   bar: "bg-blue-400" },
                  { level: "NEGLIGIBLE", label: "Négligeable",  badge: "bg-gray-100 text-gray-600",   bar: "bg-gray-400" },
                ] as const
              ).map(({ level, label, badge, bar }) => {
                const count = riskDist[level] ?? 0;
                const pct = totalRisks > 0 ? Math.round((count / totalRisks) * 100) : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-28 text-center ${badge}`}>
                      {label}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action plans by status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Plans d&apos;action par statut</h2>
          {totalActions === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun plan d&apos;action</p>
          ) : (
            <div className="space-y-3">
              {(
                [
                  { status: "TODO",        label: "À faire",   bar: "bg-blue-500" },
                  { status: "IN_PROGRESS", label: "En cours",  bar: "bg-yellow-500" },
                  { status: "DONE",        label: "Terminé",   bar: "bg-green-500" },
                  { status: "CANCELED",    label: "Annulé",    bar: "bg-gray-400" },
                ] as const
              ).map(({ status, label, bar }) => {
                const count = actionDist[status] ?? 0;
                const pct = totalActions > 0 ? Math.round((count / totalActions) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Incidents by severity */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Incidents par gravité</h2>
          {totalIncidents === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun incident enregistré</p>
          ) : (
            <div className="space-y-3">
              {(
                [
                  { sev: "FATAL",       label: "Fatal",            badge: "bg-red-900 text-white",           bar: "bg-red-900" },
                  { sev: "CRITICAL",    label: "Critique",         badge: "bg-red-100 text-red-700",         bar: "bg-red-500" },
                  { sev: "SERIOUS",     label: "Grave",            badge: "bg-orange-100 text-orange-700",   bar: "bg-orange-500" },
                  { sev: "SIGNIFICANT", label: "Significatif",     badge: "bg-yellow-100 text-yellow-700",   bar: "bg-yellow-500" },
                  { sev: "MINOR",       label: "Mineur",           badge: "bg-blue-100 text-blue-700",       bar: "bg-blue-400" },
                  { sev: "NEAR_MISS",   label: "Presque-accident", badge: "bg-gray-100 text-gray-600",       bar: "bg-gray-400" },
                ] as const
              ).map(({ sev, label, badge, bar }) => {
                const count = incidentSeverityDist[sev] ?? 0;
                const pct = totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
                return (
                  <div key={sev} className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-32 text-center ${badge}`}>
                      {label}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Activité récente</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune activité enregistrée</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-[#1E3A5F] mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      <span className="font-medium">{log.action}</span>
                      {" — "}
                      <span className="text-gray-500">{log.resource}</span>
                      {log.resourceId && (
                        <span className="text-gray-400 text-xs"> #{log.resourceId.slice(0, 8)}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.user?.name ?? log.user?.email ?? "Système"} · {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string;
  sub: string;
  accent: "green" | "orange" | "red" | "blue";
}) {
  const styles = {
    green:  { bg: "bg-green-50",  val: "text-green-700",  border: "border-green-200" },
    orange: { bg: "bg-orange-50", val: "text-orange-700", border: "border-orange-200" },
    red:    { bg: "bg-red-50",    val: "text-red-700",    border: "border-red-200" },
    blue:   { bg: "bg-blue-50",   val: "text-[#1E3A5F]",  border: "border-blue-200" },
  };
  const s = styles[accent];
  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-5`}>
      <p className={`text-3xl font-bold ${s.val}`}>{value}</p>
      <p className="text-sm font-semibold text-gray-800 mt-1">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
