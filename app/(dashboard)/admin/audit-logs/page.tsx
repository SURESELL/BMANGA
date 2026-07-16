import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Journal d'audit — Super Admin" };

export default async function AdminAuditLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      organization: { select: { name: true } },
      user: { select: { email: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#145B8C]">Journal d&apos;audit</h1>
        <p className="text-sm text-gray-500 mt-0.5">Actions journalisées sur l&apos;ensemble de la plateforme (200 dernières)</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Ressource</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Organisation</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Utilisateur</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-gray-400">Aucune entrée.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{log.action}</td>
                  <td className="px-4 py-3 text-gray-600">{log.resource}{log.resourceId ? ` (${log.resourceId.slice(0, 10)}…)` : ""}</td>
                  <td className="px-4 py-3 text-gray-500">{log.organization?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{log.user?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
