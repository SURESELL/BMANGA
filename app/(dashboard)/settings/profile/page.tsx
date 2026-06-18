"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, User, Download, Trash2, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrateur", ORG_ADMIN: "Administrateur",
  SITE_MANAGER: "Responsable site", CONSULTANT: "Consultant QHSE",
  AUDITOR: "Auditeur", TRAINER: "Formateur", EMPLOYEE: "Employé",
  LEARNER: "Apprenant", VIEWER: "Lecteur",
};

interface UserData {
  id: string; name: string | null; email: string; role: string;
  image?: string | null; createdAt?: string; lastLoginAt?: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/users/me").then((r) => r.json()).then(setUser);
  }, []);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const [key, value] of fd.entries()) {
      if (typeof value === "string" && value.trim()) body[key] = value.trim();
    }

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setUser((prev) => prev ? { ...prev, ...updated } : updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      const data = await res.json();
      setError(data.error?.message ?? "Erreur");
    }
    setLoading(false);
  }

  async function handleExport() {
    window.open("/api/rgpd/export", "_blank");
  }

  async function handleDelete() {
    const res = await fetch("/api/rgpd/delete", { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/login";
    } else {
      const data = await res.json();
      setError(data.error ?? "Impossible de supprimer le compte.");
      setShowDeleteConfirm(false);
    }
  }

  if (!user) return <div className="text-center py-12 text-sm text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/settings" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez vos informations personnelles</p>
        </div>
      </div>

      {/* Avatar + role */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {(user.name ?? user.email).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user.name ?? "—"}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>
        <div className="ml-auto text-right text-xs text-gray-400">
          {user.createdAt && <p>Membre depuis {formatDate(new Date(user.createdAt))}</p>}
          {user.lastLoginAt && <p>Dernière connexion {formatDate(new Date(user.lastLoginAt))}</p>}
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleUpdate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-5 h-5 text-[#1E3A5F]" />
          <p className="text-sm font-semibold text-gray-700">Modifier mes informations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input
              name="name"
              defaultValue={user.name ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={user.email}
              disabled
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-0.5">L&apos;email ne peut pas être modifié ici</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">Profil mis à jour.</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#1E3A5F] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60"
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      {/* RGPD */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">Mes données (RGPD)</p>
        </div>
        <p className="text-xs text-gray-500">Conformément au RGPD, vous pouvez exporter ou supprimer vos données personnelles.</p>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Exporter mes données (Art. 20)
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Supprimer mon compte (Art. 17)
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 w-full">
              <p className="text-sm text-red-700 flex-1">Confirmer la suppression ? Cette action est irréversible.</p>
              <button onClick={handleDelete} className="text-sm font-medium text-red-700 underline">Confirmer</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-gray-500 ml-2">Annuler</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
