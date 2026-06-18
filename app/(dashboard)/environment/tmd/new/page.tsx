"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";

const HAZARD_CLASSES = [
  { value: "1", label: "1 — Matières et objets explosibles" },
  { value: "2.1", label: "2.1 — Gaz inflammables" },
  { value: "2.2", label: "2.2 — Gaz non inflammables, non toxiques" },
  { value: "2.3", label: "2.3 — Gaz toxiques" },
  { value: "3", label: "3 — Liquides inflammables" },
  { value: "4.1", label: "4.1 — Matières solides inflammables" },
  { value: "4.2", label: "4.2 — Matières sujettes à inflammation spontanée" },
  { value: "4.3", label: "4.3 — Matières hydro-réactives" },
  { value: "5.1", label: "5.1 — Matières comburantes" },
  { value: "5.2", label: "5.2 — Peroxydes organiques" },
  { value: "6.1", label: "6.1 — Matières toxiques" },
  { value: "6.2", label: "6.2 — Matières infectieuses" },
  { value: "7", label: "7 — Matières radioactives" },
  { value: "8", label: "8 — Matières corrosives" },
  { value: "9", label: "9 — Matières et objets dangereux divers" },
];

const PACKAGING_GROUPS = [
  { value: "", label: "Sans groupe d'emballage" },
  { value: "I", label: "I — Grand danger" },
  { value: "II", label: "II — Danger moyen" },
  { value: "III", label: "III — Danger faible" },
];

const TRANSPORT_MODES = [
  { value: "ROAD_ADR", label: "Route (ADR)" },
  { value: "RAIL_RID", label: "Rail (RID)" },
  { value: "WATERWAY_ADN", label: "Voie navigable (ADN)" },
];

export default function TMDNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      unNumber: fd.get("unNumber"),
      designation: fd.get("designation"),
      hazardClass: fd.get("hazardClass"),
      transportMode: fd.get("transportMode"),
    };

    const packagingGroup = fd.get("packagingGroup") as string;
    if (packagingGroup) body.packagingGroup = packagingGroup;

    const quantity = fd.get("quantity") as string;
    if (quantity) body.quantity = parseFloat(quantity);

    const unit = fd.get("unit") as string;
    if (unit) body.unit = unit;

    const notes = fd.get("notes") as string;
    if (notes) body.notes = notes;

    try {
      const res = await fetch("/api/tmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? JSON.stringify(data.error) ?? "Erreur lors de la création");
      } else {
        router.push("/environment");
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
        <a href="/environment" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajouter une matière dangereuse</h1>
          <p className="text-sm text-gray-500 mt-0.5">Transport de matières dangereuses (TMD / ADR / RID / ADN)</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Avertissement réglementaire :</strong> À vérifier avec la source officielle applicable
        (ADR/RID/ADN en vigueur) et validation expert avant usage juridique.
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-5 h-5 text-[#1E3A5F]" />
          <p className="text-sm font-medium text-gray-700">Identification de la matière</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro ONU <span className="text-red-500">*</span>
            </label>
            <input
              name="unNumber"
              required
              pattern="\d{4}"
              maxLength={4}
              placeholder="Ex: 1203"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
            <p className="text-xs text-gray-400 mt-1">4 chiffres (ex : 1203 pour essence)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode de transport <span className="text-red-500">*</span>
            </label>
            <select
              name="transportMode"
              required
              defaultValue="ROAD_ADR"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              {TRANSPORT_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Désignation officielle <span className="text-red-500">*</span>
            </label>
            <input
              name="designation"
              required
              minLength={2}
              maxLength={300}
              placeholder="Ex: ESSENCE POUR MOTEURS"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classe de danger <span className="text-red-500">*</span>
            </label>
            <select
              name="hazardClass"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Sélectionner...</option>
              {HAZARD_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groupe d&apos;emballage</label>
            <select
              name="packagingGroup"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              {PACKAGING_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
            <input
              name="quantity"
              type="number"
              min="0"
              step="any"
              placeholder="Ex: 500"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
            <input
              name="unit"
              placeholder="Ex: L, kg, t"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Précautions particulières, conditions de stockage, références documentaires..."
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
            {loading ? "Enregistrement..." : "Ajouter la matière"}
          </button>
          <a
            href="/environment"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
