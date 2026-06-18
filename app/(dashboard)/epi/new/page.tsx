"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HardHat } from "lucide-react";

const EPI_CATEGORIES = [
  "Protection de la tête (casque)", "Protection des yeux et du visage",
  "Protection de l'ouïe", "Protection des voies respiratoires",
  "Protection des mains et des bras", "Protection des pieds",
  "Protection du corps (vêtements)", "Protection contre les chutes",
  "Gilets de haute visibilité", "Autre",
];

export default function EPINewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);

    const body: Record<string, unknown> = {
      name: fd.get("name"),
      category: fd.get("category"),
      reference: fd.get("reference") || undefined,
      standard: fd.get("standard") || undefined,
      quantity: Number(fd.get("quantity") ?? 1),
      assignedTo: fd.get("assignedTo") || undefined,
      notes: fd.get("notes") || undefined,
    };

    const expiryDate = fd.get("expiryDate") as string;
    if (expiryDate) body.expiryDate = new Date(expiryDate).toISOString();

    const nextControlDate = fd.get("nextControlDate") as string;
    if (nextControlDate) body.nextControlDate = new Date(nextControlDate).toISOString();

    try {
      const res = await fetch("/api/epi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la création");
      } else {
        router.push("/epi");
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
        <a href="/epi" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajouter un EPI</h1>
          <p className="text-sm text-gray-500 mt-0.5">Équipement de Protection Individuelle</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
            <HardHat className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-sm font-medium text-gray-700">Informations EPI</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l&apos;EPI <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              placeholder="Ex: Casque de chantier classe 1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Sélectionner...</option>
              {EPI_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence / Modèle</label>
            <input
              name="reference"
              placeholder="Ex: MSA V-Gard 500"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Norme applicable</label>
            <input
              name="standard"
              placeholder="Ex: EN 397, EN ISO 20345"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
            <input
              name="quantity"
              type="number"
              min="0"
              defaultValue="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attribué à</label>
            <input
              name="assignedTo"
              placeholder="Nom / service"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d&apos;expiration</label>
            <input
              name="expiryDate"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prochain contrôle</label>
            <input
              name="nextControlDate"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Informations complémentaires..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            />
          </div>
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
            {loading ? "Enregistrement..." : "Enregistrer l'EPI"}
          </button>
          <a
            href="/epi"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
