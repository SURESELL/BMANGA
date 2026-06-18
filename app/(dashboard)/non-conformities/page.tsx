import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AlertCircle, PlusCircle } from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import type { ActionStatus } from "@/types";

export const metadata = { title: "Non-conformités" };

const NC_TYPE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  MINOR:    { label: "Mineure",   bg: "bg-yellow-100", color: "text-yellow-700" },
  MAJOR:    { label: "Majeure",   bg: "bg-orange-100", color: "text-orange-700" },
  CRITICAL: { label: "Critique",  bg: "bg-red-100",    color: "text-red-700" },
};

export default async function NonConformitiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const ncs = orgId
    ? await db.nonConformity.findMany({
        where: { organizationId: orgId },
        include: { audit: { select: { title: true, type: true } } },
        orderBy: [{ type: "asc" }, { createdAt: "desc" }],
      })
    : [];

  const stats = {
    total: ncs.length,
    open: ncs.filter((n) => n.status !== "DONE" && n.status !== "CANCELED").length,
    critical: ncs.filter((n) => n.type === "CRITICAL" && n.status !== "DONE").length,
    overdue: ncs.filter((n) => n.status !== "DONE" && n.status !== "CANCELED" && isOverdue(n.dueDate)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Non-conformités</h1>
          <p className="text-sm text-gray-500 mt-1">{ncs.length} non-conformité{ncs.length > 1 ? "s" : ""}</p>
        </div>
        <a href="/non-conformities/new" className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
          <PlusCircle className="w-4 h-4" /> Déclarer une NC
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A5F]">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-orange-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ouvertes</p>
        </div>
        <div className="bg-red-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          <p className="text-xs text-gray-500 mt-0.5">Critiques ouvertes</p>
        </div>
        <div className="bg-red-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          <p className="text-xs text-gray-500 mt-0.5">En retard</p>
        </div>
      </div>

      {ncs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune non-conformité</p>
          <p className="text-sm text-gray-400 mt-1">Les NC sont créées depuis les audits ou déclarées manuellement</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Non-conformité</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ncs.map((nc) => {
                const typeCfg = NC_TYPE_STYLES[nc.type] ?? NC_TYPE_STYLES.MINOR;
                const overdue = nc.status !== "DONE" && nc.status !== "CANCELED" && isOverdue(nc.dueDate);
                return (
                  <tr key={nc.id} className={`hover:bg-gray-50 transition-colors ${overdue ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{nc.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{nc.description}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeCfg.bg} ${typeCfg.color}`}>{typeCfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={nc.status as ActionStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {nc.audit ? `Audit : ${nc.audit.title}` : "Manuel"}
                    </td>
                    <td className="px-4 py-3">
                      {nc.dueDate ? (
                        <span className={`text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                          {overdue ? "⚠ " : ""}{formatDate(nc.dueDate)}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
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
