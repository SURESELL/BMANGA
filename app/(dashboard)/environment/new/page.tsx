"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf } from "lucide-react";

export default function EnvironmentNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      activity: fd.get("activity"),
      aspect: fd.get("aspect"),
      impact: fd.get("impact"),
      impactType: fd.get("impactType"),
      significance: fd.get("significance"),
      controlMeasures: fd.get("controlMeasures") || undefined,
    };

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
          <h1 className="text-2xl font-bold text-gray-900">Nouvel aspect environnemental</h1>
          <p className="text-sm text-gray-500 mt-0.5">ISO 14001 — Identification des aspects et impacts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-gray-700">Identification de l&apos;aspect</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activité concernée <span className="text-red-500">*</span>
            </label>
            <input
              name="activity"
              required
              placeholder="Ex: Nettoyage des machines, Utilisation de solvants..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aspect environnemental <span className="text-red-500">*</span>
            </label>
            <input
              name="aspect"
              required
              placeholder="Ex: Rejet de déchets chimiques liquides, Consommation d'énergie..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impact environnemental <span className="text-red-500">*</span>
            </label>
            <input
              name="impact"
              required
              placeholder="Ex: Pollution des eaux souterraines, Épuisement des ressources..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d&apos;impact <span className="text-red-500">*</span>
            </label>
            <select
              name="impactType"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Sélectionner...</option>
              <option value="AIR">Air</option>
              <option value="WATER">Eau</option>
              <option value="SOIL">Sol</option>
              <option value="WASTE">Déchets</option>
              <option value="ENERGY">Énergie</option>
              <option value="BIODIVERSITY">Biodiversité</option>
              <option value="NOISE">Bruit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Significativité</label>
            <select
              name="significance"
              defaultValue="NOT_SIGNIFICANT"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="NOT_SIGNIFICANT">Non significatif</option>
              <option value="SIGNIFICANT">Significatif</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesures de maîtrise existantes</label>
            <textarea
              name="controlMeasures"
              rows={3}
              placeholder="Procédures, équipements, certifications en place..."
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
            {loading ? "Enregistrement..." : "Enregistrer l'aspect"}
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
