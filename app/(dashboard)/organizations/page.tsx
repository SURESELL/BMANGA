import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { SUBSCRIPTION_PLANS } from "@/types";

export default async function OrganizationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string })?.role;
  const orgId = (session.user as { organizationId?: string })?.organizationId;

  if (role === "SUPER_ADMIN") {
    const organizations = await db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: { select: { plan: true, status: true } },
        _count: {
          select: { users: true, sites: true },
        },
      },
    });

    return (
      <div className="max-w-6xl mx-auto py-10 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A5F]">Organisations</h1>
            <p className="text-gray-500 text-sm mt-1">{organizations.length} organisation{organizations.length !== 1 ? "s" : ""} enregistrée{organizations.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Organisation</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Plan</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600">Utilisateurs</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600">Sites</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Créée le</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizations.map((org) => {
                const planKey = org.subscription?.plan ?? "FREE";
                const planInfo = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS];
                return (
                  <tr key={org.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#1E3A5F]">{org.name}</div>
                      {org.siret && (
                        <div className="text-xs text-gray-400 mt-0.5">SIRET: {org.siret}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                        {planInfo?.label ?? planKey}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-gray-700">
                      {org._count.users}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-gray-700">
                      {org._count.sites}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/organizations/${org.id}`}
                        className="text-xs text-[#1E3A5F] font-semibold hover:underline"
                      >
                        Détail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {organizations.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">
              Aucune organisation enregistrée.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ORG_ADMIN: show own org detail
  if (!orgId) redirect("/login");

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      subscription: { select: { plan: true, status: true } },
      _count: {
        select: { users: true, sites: true },
      },
    },
  });

  if (!org) redirect("/login");

  const planKey = org.subscription?.plan ?? "FREE";
  const planInfo = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS];

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-8">Mon organisation</h1>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1E3A5F]">{org.name}</h2>
            {org.siret && <p className="text-sm text-gray-500 mt-0.5">SIRET: {org.siret}</p>}
          </div>
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">
            {planInfo?.label ?? planKey}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-[#1E3A5F]">{org._count.users}</div>
            <div className="text-xs text-gray-500 mt-1">Utilisateurs</div>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-[#1E3A5F]">{org._count.sites}</div>
            <div className="text-xs text-gray-500 mt-1">Sites</div>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {org.address && (
            <div>
              <dt className="text-gray-500 mb-0.5">Adresse</dt>
              <dd className="font-medium text-gray-800">{org.address}</dd>
            </div>
          )}
          {org.city && (
            <div>
              <dt className="text-gray-500 mb-0.5">Ville</dt>
              <dd className="font-medium text-gray-800">{org.city} {org.postalCode}</dd>
            </div>
          )}
          {org.phone && (
            <div>
              <dt className="text-gray-500 mb-0.5">Téléphone</dt>
              <dd className="font-medium text-gray-800">{org.phone}</dd>
            </div>
          )}
          {org.email && (
            <div>
              <dt className="text-gray-500 mb-0.5">Email</dt>
              <dd className="font-medium text-gray-800">{org.email}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 mb-0.5">Membre depuis</dt>
            <dd className="font-medium text-gray-800">{formatDate(org.createdAt)}</dd>
          </div>
        </dl>

        {/* Edit form placeholder */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500 italic">
            La modification des informations de l'organisation sera disponible prochainement.
          </p>
          <button
            disabled
            className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
          >
            Modifier les informations
          </button>
        </div>
      </div>
    </div>
  );
}
