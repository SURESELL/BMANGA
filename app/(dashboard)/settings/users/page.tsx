"use client";

import { useState, useEffect } from "react";
import { UserPlus, Trash2, Shield, Mail, ArrowLeft } from "lucide-react";

const ROLES = [
  { value: "VIEWER",       label: "Lecteur",           description: "Accès lecture seule" },
  { value: "EMPLOYEE",     label: "Employé",           description: "Déclare incidents et risques" },
  { value: "LEARNER",      label: "Apprenant",         description: "Accès aux formations" },
  { value: "TRAINER",      label: "Formateur",         description: "Crée et gère les formations" },
  { value: "AUDITOR",      label: "Auditeur",          description: "Conduit les audits" },
  { value: "CONSULTANT",   label: "Consultant QHSE",   description: "Accès multi-modules" },
  { value: "SITE_MANAGER", label: "Responsable site",  description: "Gère un site" },
  { value: "ORG_ADMIN",    label: "Administrateur",    description: "Accès complet" },
];

const ROLE_COLORS: Record<string, string> = {
  VIEWER: "bg-gray-100 text-gray-600",
  LEARNER: "bg-blue-100 text-blue-700",
  EMPLOYEE: "bg-green-100 text-green-700",
  TRAINER: "bg-purple-100 text-purple-700",
  AUDITOR: "bg-orange-100 text-orange-700",
  CONSULTANT: "bg-teal-100 text-teal-700",
  SITE_MANAGER: "bg-yellow-100 text-yellow-700",
  ORG_ADMIN: "bg-red-100 text-red-700",
  SUPER_ADMIN: "bg-gray-900 text-white",
};

interface OrgUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    fetch("/api/users/org")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);
    setFormError("");
    setFormSuccess("");

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          name: fd.get("name") || undefined,
          role: fd.get("role"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Erreur lors de l'invitation");
      } else {
        setFormSuccess(`Utilisateur ${data.email} ajouté avec le rôle ${ROLES.find((r) => r.value === data.role)?.label ?? data.role}.`);
        setUsers((prev) => [...prev, data]);
        (e.target as HTMLFormElement).reset();
        setTimeout(() => { setShowForm(false); setFormSuccess(""); }, 2000);
      }
    } catch {
      setFormError("Erreur réseau");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/settings" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invitez et gérez les membres de votre organisation</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Inviter
        </button>
      </div>

      {/* Invite form */}
      {showForm && (
        <form onSubmit={handleInvite} className="bg-white border border-[#1E3A5F] rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Inviter un utilisateur</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom / Nom</label>
              <input
                name="name"
                placeholder="Jean Dupont"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                name="email"
                type="email"
                required
                placeholder="jean.dupont@exemple.fr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rôle <span className="text-red-500">*</span></label>
              <select
                name="role"
                required
                defaultValue="EMPLOYEE"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{formError}</p>}
          {formSuccess && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">{formSuccess}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={inviting}
              className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60"
            >
              {inviting ? "Invitation..." : "Confirmer l'invitation"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Users list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Membres</h2>
          <span className="text-xs text-gray-500">{users.length} utilisateur{users.length > 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-gray-400 text-sm">Aucun utilisateur</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{user.name ?? "—"}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {ROLES.find((r) => r.value === user.role)?.label ?? user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles reference */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-700">Référentiel des rôles</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ROLES.map((role) => (
            <div key={role.value} className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[role.value]}`}>
                {role.label}
              </span>
              <span className="text-xs text-gray-500">{role.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
