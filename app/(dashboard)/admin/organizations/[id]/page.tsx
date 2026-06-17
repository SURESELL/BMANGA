"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, ShieldCheck, AlertTriangle } from "lucide-react";

type OrgUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type OrgDetail = {
  id: string;
  name: string;
  createdAt: string;
  subscription: { plan: string; status: string; seats: number } | null;
  users: OrgUser[];
  _count: { users: number };
};

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: "bg-red-100 text-red-700",
    ORG_ADMIN: "bg-purple-100 text-purple-700",
    SITE_MANAGER: "bg-blue-100 text-blue-700",
    TRAINER: "bg-yellow-100 text-yellow-700",
    EMPLOYEE: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[role] ?? "bg-gray-100 text-gray-600"}`}>
      {role.replace("_", " ")}
    </span>
  );
}

export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/organizations/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
        return res.json();
      })
      .then(setOrg)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDisable() {
    setDisabling(true);
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      router.push("/admin/organizations");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDisabling(false);
      setShowConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error || "Organisation introuvable"}
        </div>
      </div>
    );
  }

  const activeUsers = org.users.filter((u) => u.isActive).length;
  const byRole = org.users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/organizations")}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">{org.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Créée le {new Date(org.createdAt).toLocaleDateString("fr-FR")} · Plan {org.subscription?.plan ?? "FREE"} · {org.subscription?.seats ?? 5} sièges
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-[#1E3A5F]/10 rounded-lg">
            <Users className="w-5 h-5 text-[#1E3A5F]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E3A5F]">{org._count.users}</div>
            <div className="text-xs text-gray-500">Total utilisateurs</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            <div className="text-xs text-gray-500">Utilisateurs actifs</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-2 font-medium">Par rôle</div>
          <div className="space-y-1">
            {Object.entries(byRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{role.replace("_", " ")}</span>
                <span className="font-semibold text-[#1E3A5F]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-[#1E3A5F]">Utilisateurs</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Nom</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Rôle</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Statut</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Créé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {org.users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  Aucun utilisateur dans cette organisation.
                </td>
              </tr>
            ) : (
              org.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{user.name ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 text-sm">Zone dangereuse</h3>
            <p className="text-xs text-red-600 mt-1">
              Désactiver l'organisation bloquera l'accès à tous ses utilisateurs.
            </p>
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                Désactiver l'organisation
              </button>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <p className="text-sm font-medium text-red-700">Confirmer la désactivation ?</p>
                <button
                  onClick={handleDisable}
                  disabled={disabling}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {disabling ? "En cours..." : "Oui, désactiver"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
