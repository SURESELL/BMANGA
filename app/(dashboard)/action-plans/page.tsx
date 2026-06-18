import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PlusCircle, Clock, CheckCircle, AlertCircle, ClipboardList } from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import type { ActionStatus } from "@/types";

export const metadata = { title: "Plans d'action" };

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "P1 - Critique",  color: "text-red-700 bg-red-100" },
  2: { label: "P2 - Haute",     color: "text-orange-700 bg-orange-100" },
  3: { label: "P3 - Moyenne",   color: "text-yellow-700 bg-yellow-100" },
  4: { label: "P4 - Basse",     color: "text-blue-700 bg-blue-100" },
  5: { label: "P5 - Très basse", color: "text-gray-600 bg-gray-100" },
};

export default async function ActionPlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const actions = orgId
    ? await db.actionPlan.findMany({
        where: { organizationId: orgId },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
        include: {
          owner: { select: { name: true } },
          risk: { select: { hazardDescription: true } },
          incident: { select: { title: true } },
        },
      })
    : [];

  const stats = {
    total: actions.length,
    todo: actions.filter((a) => a.status === "TODO").length,
    inProgress: actions.filter((a) => a.status === "IN_PROGRESS").length,
    done: actions.filter((a) => a.status === "DONE").length,
    overdue: actions.filter((a) => a.status !== "DONE" && a.status !== "CANCELED" && isOverdue(a.dueDate)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans d&apos;action</h1>
          <p className="text-sm text-gray-500 mt-1">{stats.total} action{stats.total > 1 ? "s" : ""}</p>
        </div>
        <a href="/action-plans/new" className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
          <PlusCircle className="w-4 h-4" /> Nouvelle action
        </a>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="À faire" value={stats.todo} icon={ClipboardList} color="blue" />
        <MiniStat label="En cours" value={stats.inProgress} icon={Clock} color="yellow" />
        <MiniStat label="Terminées" value={stats.done} icon={CheckCircle} color="green" />
        <MiniStat label="En retard" value={stats.overdue} icon={AlertCircle} color="red" />
      </div>

      {/* Actions table */}
      {actions.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune action planifiée</p>
          <p className="text-sm text-gray-400 mt-1">Les actions sont créées depuis les risques et incidents</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Priorité</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Responsable</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Échéance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actions.map((action) => {
                const overdue = action.status !== "DONE" && action.status !== "CANCELED" && isOverdue(action.dueDate);
                const priority = PRIORITY_LABELS[action.priority] ?? PRIORITY_LABELS[3];
                return (
                  <tr key={action.id} className={`transition-colors ${overdue ? "bg-red-50/30 hover:bg-red-50" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{action.title}</p>
                      {action.risk && <p className="text-xs text-gray-400">Risque : {action.risk.hazardDescription.slice(0, 50)}…</p>}
                      {action.incident && <p className="text-xs text-gray-400">Incident : {action.incident.title}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color}`}>{priority.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={action.status as ActionStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden lg:table-cell">
                      {action.owner?.name ?? <span className="text-gray-400">Non assigné</span>}
                    </td>
                    <td className="px-4 py-3">
                      {action.dueDate ? (
                        <span className={`text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                          {overdue ? "⚠ " : ""}{formatDate(action.dueDate)}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/action-plans/${action.id}`} className="text-xs text-[#1E3A5F] hover:underline">Voir</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600", yellow: "bg-yellow-100 text-yellow-600",
    green: "bg-green-100 text-green-600", red: "bg-red-100 text-red-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
