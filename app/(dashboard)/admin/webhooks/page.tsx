import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Webhooks — Super Admin" };

export default async function AdminWebhooksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  const events = await db.webhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const failedCount = events.filter((e) => e.error || !e.processedAt).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#145B8C]">Webhooks</h1>
        <p className="text-sm text-gray-500 mt-0.5">Événements entrants (Stripe...) — traçabilité plateforme</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-2xl font-bold text-[#145B8C]">{events.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Événements récents (200 derniers)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className={`text-2xl font-bold ${failedCount > 0 ? "text-red-600" : "text-green-600"}`}>{failedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">En échec ou non traités</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Fournisseur</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Organisation</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Reçu le</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-gray-400">Aucun événement reçu.</td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.type}</td>
                  <td className="px-4 py-3 text-gray-500">{e.provider}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.organizationId ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    {e.error ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        <AlertTriangle className="w-3 h-3" /> {e.error.slice(0, 40)}
                      </span>
                    ) : e.processedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        <CheckCircle className="w-3 h-3" /> Traité
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        <Clock className="w-3 h-3" /> En attente
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
