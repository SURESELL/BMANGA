"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { NORMIA_DISCLAIMER } from "@/types";

export default function ICPENewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      resourceType: "icpe",
      rubrique: fd.get("rubrique"),
      designation: fd.get("designation"),
      regime: fd.get("regime"),
      threshold: fd.get("threshold") || undefined,
      actualQuantity: fd.get("actualQuantity") || undefined,
      prescriptions: fd.get("prescriptions") || undefined,
    };

    const nextInspectionAt = fd.get("nextInspectionAt") as string;
    if (nextInspectionAt) body.nextInspectionAt = new Date(nextInspectionAt).toISOString();

    try {
      const res = await fetch("/api/environment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la création");
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
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle rubrique ICPE</h1>
          <p className="text-sm text-gray-500 mt-0.5">Installation Classée pour la Protection de l&apos;Environnement</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{NORMIA_DISCLAIMER}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° de rubrique <span className="text-red-500">*</span>
            </label>
            <input
              name="rubrique"
              required
              placeholder="Ex: 1510, 2662, 3000..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Régime <span className="text-red-500">*</span>
            </label>
            <select
              name="regime"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Sélectionner...</option>
              <option value="DECLARATION">Déclaration (D)</option>
              <option value="ENREGISTREMENT">Enregistrement (E)</option>
              <option value="AUTORISATION">Autorisation (A)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Désignation de l&apos;activité <span className="text-red-500">*</span>
            </label>
            <input
              name="designation"
              required
              placeholder="Ex: Entrepôts couverts — Stockage de matières combustibles"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seuil de classement</label>
            <input
              name="threshold"
              placeholder="Ex: > 5 000 m², > 100 t..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité / Volume réel</label>
            <input
              name="actualQuantity"
              placeholder="Ex: 6 200 m², 150 t..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prochaine inspection</label>
            <input
              name="nextInspectionAt"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prescriptions / Conditions</label>
            <textarea
              name="prescriptions"
              rows={3}
              placeholder="Prescriptions de l'arrêté préfectoral, conditions d'exploitation..."
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
            {loading ? "Enregistrement..." : "Enregistrer la rubrique ICPE"}
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
