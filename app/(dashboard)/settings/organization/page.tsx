"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Save } from "lucide-react";

const SECTORS = [
  "Agriculture", "Agroalimentaire", "Bâtiment / BTP", "Chimie / Pétrochimie",
  "Commerce", "Énergie", "Formation professionnelle", "Hôtellerie / Restauration",
  "Industrie manufacturière", "Logistique / Transport", "Numérique / IT",
  "Santé / Médico-social", "Services aux entreprises", "Autre",
];

const SIZES = [
  { value: "MICRO",  label: "Micro (< 10 salariés)" },
  { value: "SMALL",  label: "TPE/PME (10–49 salariés)" },
  { value: "MEDIUM", label: "ETI (50–249 salariés)" },
  { value: "LARGE",  label: "Grande entreprise (250+)" },
];

interface OrgData {
  name?: string; email?: string; phone?: string; siret?: string;
  sector?: string | null; industry?: string | null; size?: string | null;
  address?: string | null; city?: string | null; postalCode?: string | null;
  country?: string | null; website?: string | null;
}

export default function OrganizationSettingsPage() {
  const [org, setOrg] = useState<OrgData>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/organizations/me")
      .then((r) => r.json())
      .then((data) => { setOrg(data); setFetching(false); })
      .catch(() => setFetching(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const [key, value] of fd.entries()) {
      if (typeof value === "string" && value.trim()) body[key] = value.trim();
    }

    try {
      const res = await fetch("/api/organizations/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la mise à jour");
      } else {
        const updated = await res.json();
        setOrg(updated);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <div className="text-center py-12 text-gray-500 text-sm">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/settings" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organisation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Informations générales de votre entreprise</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-[#1E3A5F]" />
            <p className="text-sm font-semibold text-gray-700">Identité</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
              <input
                name="name"
                defaultValue={org.name ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
              <input
                name="siret"
                defaultValue={org.siret ?? ""}
                placeholder="12345678901234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d&apos;activité</label>
              <select
                name="sector"
                defaultValue={org.sector ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
              >
                <option value="">Sélectionner...</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taille de l&apos;entreprise</label>
              <select
                name="size"
                defaultValue={org.size ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
              >
                <option value="">Sélectionner...</option>
                {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
              <input
                name="website"
                type="url"
                defaultValue={org.website ?? ""}
                placeholder="https://www.example.fr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={org.email ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                name="phone"
                defaultValue={org.phone ?? ""}
                placeholder="+33 1 23 45 67 89"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Adresse du siège</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                name="address"
                defaultValue={org.address ?? ""}
                placeholder="12 rue de la Paix"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input
                name="postalCode"
                defaultValue={org.postalCode ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                name="city"
                defaultValue={org.city ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
              <input
                name="country"
                defaultValue={org.country ?? "France"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-medium">
            Modifications enregistrées.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-[#1E3A5F] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {loading ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </form>
    </div>
  );
}
