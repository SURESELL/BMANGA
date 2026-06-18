import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ShieldCheck, AlertTriangle, ClipboardList, BookOpen,
  CheckCircle, TrendingUp, TrendingDown, Clock, FileWarning
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RISK_LEVELS } from "@/types";

export default async function DashboardPage() {
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string })?.organizationId;

  // Fetch stats if org exists
  let stats = {
    totalRisks: 0, criticalRisks: 0,
    overdueActions: 0, totalActions: 0,
    openIncidents: 0, totalIncidents: 0,
    completedTrainings: 0, totalTrainings: 0,
    complianceScore: 0, riskScore: 0,
  };

  let recentIncidents: { id: string; title: string; severity: string; occurredAt: Date }[] = [];
  let overdueActions: { id: string; title: string; dueDate: Date | null; status: string }[] = [];

  if (orgId) {
    const [risks, actions, incidents, trainings] = await Promise.all([
      db.risk.findMany({ where: { organizationId: orgId }, select: { riskLevel: true } }),
      db.actionPlan.findMany({ where: { organizationId: orgId }, select: { status: true, dueDate: true } }),
      db.incident.findMany({ where: { organizationId: orgId }, select: { status: true } }),
      db.trainingCourse.findMany({ where: { organizationId: orgId }, select: { status: true } }),
    ]);

    const criticalRisks = risks.filter((r) => r.riskLevel === "CRITICAL" || r.riskLevel === "HIGH").length;
    const now = new Date();
    const overdue = actions.filter((a) => a.status !== "DONE" && a.dueDate && a.dueDate < now).length;

    stats = {
      totalRisks: risks.length,
      criticalRisks,
      overdueActions: overdue,
      totalActions: actions.length,
      openIncidents: incidents.filter((i) => i.status !== "CLOSED" && i.status !== "ARCHIVED").length,
      totalIncidents: incidents.length,
      completedTrainings: trainings.filter((t) => t.status === "PUBLISHED").length,
      totalTrainings: trainings.length,
      complianceScore: Math.max(0, 100 - criticalRisks * 5 - overdue * 3),
      riskScore: risks.length > 0 ? Math.round((criticalRisks / risks.length) * 100) : 0,
    };

    recentIncidents = (await db.incident.findMany({
      where: { organizationId: orgId },
      orderBy: { occurredAt: "desc" },
      take: 5,
      select: { id: true, title: true, severity: true, occurredAt: true },
    })) as typeof recentIncidents;

    overdueActions = (await db.actionPlan.findMany({
      where: { organizationId: orgId, status: { notIn: ["DONE", "CANCELED"] }, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: { id: true, title: true, dueDate: true, status: true },
    })) as typeof overdueActions;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d&apos;ensemble de votre conformité et risques</p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title="Score conformité"
          value={`${stats.complianceScore}%`}
          icon={ShieldCheck}
          color="green"
          trend={stats.complianceScore >= 70 ? "up" : "down"}
          hint={stats.complianceScore >= 70 ? "Bon niveau" : "À améliorer"}
        />
        <ScoreCard
          title="Risques critiques"
          value={String(stats.criticalRisks)}
          icon={AlertTriangle}
          color="red"
          trend={stats.criticalRisks === 0 ? "up" : "down"}
          hint={`sur ${stats.totalRisks} risques`}
        />
        <ScoreCard
          title="Actions en retard"
          value={String(stats.overdueActions)}
          icon={Clock}
          color="orange"
          trend={stats.overdueActions === 0 ? "up" : "down"}
          hint={`sur ${stats.totalActions} actions`}
        />
        <ScoreCard
          title="Incidents ouverts"
          value={String(stats.openIncidents)}
          icon={FileWarning}
          color="blue"
          trend={stats.openIncidents === 0 ? "up" : "down"}
          hint={`sur ${stats.totalIncidents} total`}
        />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance gauge */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Score global conformité</h3>
            <span className={`text-2xl font-bold ${stats.complianceScore >= 70 ? "text-green-600" : stats.complianceScore >= 50 ? "text-orange-500" : "text-red-600"}`}>
              {stats.complianceScore}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${stats.complianceScore >= 70 ? "bg-green-500" : stats.complianceScore >= 50 ? "bg-orange-500" : "bg-red-500"}`}
              style={{ width: `${stats.complianceScore}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-gray-500">
            <div className="text-center"><div className="font-bold text-gray-900 text-sm">{stats.totalRisks}</div>Risques</div>
            <div className="text-center"><div className="font-bold text-gray-900 text-sm">{stats.totalActions}</div>Actions</div>
            <div className="text-center"><div className="font-bold text-gray-900 text-sm">{stats.totalIncidents}</div>Incidents</div>
          </div>
        </div>

        {/* Recent incidents */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Incidents récents</h3>
            <a href="/incidents" className="text-xs text-[#1E3A5F] hover:underline">Voir tout</a>
          </div>
          {recentIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle className="w-8 h-8 mb-2 text-green-400" />
              <p className="text-sm">Aucun incident récent</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentIncidents.map((inc) => (
                <li key={inc.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    inc.severity === "CRITICAL" || inc.severity === "FATAL" ? "bg-red-500" :
                    inc.severity === "SERIOUS" ? "bg-orange-500" : "bg-yellow-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{inc.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(inc.occurredAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Actions en retard</h3>
            <a href="/action-plans" className="text-xs text-[#1E3A5F] hover:underline">Voir tout</a>
          </div>
          {overdueActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle className="w-8 h-8 mb-2 text-green-400" />
              <p className="text-sm">Aucune action en retard</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {overdueActions.map((action) => (
                <li key={action.id} className="flex items-start gap-3">
                  <Clock className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{action.title}</p>
                    <p className="text-xs text-red-500">Échéance : {formatDate(action.dueDate)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-[#1E3A5F] hover:shadow-sm transition-all group"
          >
            <div className={`w-9 h-9 rounded-lg ${link.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
              <link.icon className={`w-4 h-4 ${link.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-400">{link.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ScoreCard({
  title, value, icon: Icon, color, trend, hint
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "green" | "red" | "orange" | "blue";
  trend: "up" | "down";
  hint: string;
}) {
  const colors = {
    green:  { bg: "bg-green-100",  text: "text-green-700",  icon: "text-green-600" },
    red:    { bg: "bg-red-100",    text: "text-red-700",    icon: "text-red-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-700", icon: "text-orange-600" },
    blue:   { bg: "bg-blue-100",   text: "text-blue-700",   icon: "text-blue-600" },
  };
  const c = colors[color];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        {trend === "up"
          ? <TrendingUp className="w-4 h-4 text-green-500" />
          : <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

const QUICK_LINKS = [
  { label: "Nouveau risque", description: "DUERP", href: "/risks/new", icon: AlertTriangle, bg: "bg-blue-100", color: "text-blue-600" },
  { label: "Déclarer incident", description: "Sécurité", href: "/incidents/new", icon: FileWarning, bg: "bg-red-100", color: "text-red-600" },
  { label: "Créer formation", description: "LMS", href: "/training/new", icon: BookOpen, bg: "bg-purple-100", color: "text-purple-600" },
  { label: "Planifier audit", description: "Qualité", href: "/audits/new", icon: ClipboardList, bg: "bg-orange-100", color: "text-orange-600" },
];
