"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";

const PRODUCT_TYPES = [
  "Produits laitiers", "Viandes et charcuteries", "Produits de la mer",
  "Fruits et légumes", "Plats cuisinés", "Pâtisserie / Boulangerie",
  "Boissons", "Épicerie sèche", "Restauration collective", "Autre",
];

export default function HACCPNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      productType: fd.get("productType") || undefined,
      scope: fd.get("scope") || undefined,
      version: Number(fd.get("version") ?? 1),
    };

    try {
      const res = await fetch("/api/haccp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la création");
      } else {
        router.push("/haccp");
        router.refresh();
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/haccp" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau plan HACCP / PMS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan de Maîtrise Sanitaire</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-gray-700">Informations du plan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du plan <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              placeholder="Ex: PMS Laboratoire de fabrication — Site Paris"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de produit</label>
            <select
              name="productType"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Sélectionner...</option>
              {PRODUCT_TYPES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input
              name="version"
              type="number"
              min="1"
              defaultValue="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Périmètre / Activités couvertes</label>
            <textarea
              name="scope"
              rows={3}
              placeholder="Décrivez les activités et étapes couvertes par ce plan PMS..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          ⚠️ Après création, vous pourrez ajouter les CCP (Points Critiques de Contrôle) et les PRPo depuis la fiche du plan. À valider avec un professionnel en sécurité alimentaire.
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60"
          >
            {loading ? "Création..." : "Créer le plan PMS"}
          </button>
          <a
            href="/haccp"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
