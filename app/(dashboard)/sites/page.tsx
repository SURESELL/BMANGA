import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function SitesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) redirect("/login");

  const sites = await db.site.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { workUnits: true, users: true },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Sites</h1>
          <p className="text-gray-500 text-sm mt-1">
            {sites.length} site{sites.length !== 1 ? "s" : ""} enregistré{sites.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/sites/new"
          className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#162d4a] transition"
        >
          + Ajouter un site
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="bg-white rounded-xl shadow border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">Aucun site enregistré.</p>
          <Link
            href="/sites/new"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] text-white px-5 py-2 text-sm font-semibold hover:bg-[#162d4a] transition"
          >
            Créer le premier site
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Nom</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Adresse</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Ville</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600">Unités de travail</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600">Utilisateurs</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-[#1E3A5F]">{site.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {site.address ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {site.city
                      ? `${site.city}${site.postalCode ? ` (${site.postalCode})` : ""}`
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-gray-700">
                    {site._count.workUnits}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-gray-700">
                    {site._count.users}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/sites/${site.id}`}
                      className="text-xs text-[#1E3A5F] font-semibold hover:underline"
                    >
                      Détail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
