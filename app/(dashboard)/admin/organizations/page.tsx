"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Users, CheckCircle, XCircle } from "lucide-react";

type Org = {
  id: string;
  name: string;
  createdAt: string;
  subscription: { plan: string; status: string; seats: number } | null;
  _count: { users: number };
};

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE" || status === "TRIALING";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-600",
    STARTER: "bg-blue-100 text-blue-700",
    PROFESSIONAL: "bg-purple-100 text-purple-700",
    ENTERPRISE: "bg-[#1E3A5F] text-white",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[plan] ?? "bg-gray-100 text-gray-600"}`}>
      {plan}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
        </td>
      ))}
    </tr>
  );
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/organizations")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
        return res.json();
      })
      .then(setOrgs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalOrgs = orgs.length;
  const activeOrgs = orgs.filter(
    (o) => o.subscription?.status === "ACTIVE" || o.subscription?.status === "TRIALING"
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Organisations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestion multi-tenant</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-[#1E3A5F]/10 rounded-lg">
            <Building2 className="w-5 h-5 text-[#1E3A5F]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E3A5F]">{loading ? "—" : totalOrgs}</div>
            <div className="text-xs text-gray-500">Total organisations</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{loading ? "—" : activeOrgs}</div>
            <div className="text-xs text-gray-500">Organisations actives</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Nom</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Plan</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-600">Utilisateurs</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Créé le</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Statut</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : orgs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                  Aucune organisation enregistrée.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#1E3A5F]">{org.name}</td>
                  <td className="px-6 py-4">
                    <PlanBadge plan={org.subscription?.plan ?? "FREE"} />
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">{org._count.users}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(org.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={org.subscription?.status ?? "CANCELED"} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="text-xs text-[#1E3A5F] font-semibold hover:underline"
                    >
                      Voir détail →
                    </Link>
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
