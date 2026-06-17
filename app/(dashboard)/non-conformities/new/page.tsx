"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NCNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: fd.get("title"),
      description: fd.get("description"),
      type: fd.get("type"),
      rootCause: fd.get("rootCause") || undefined,
      correctiveAction: fd.get("correctiveAction") || undefined,
    };

    const dueDate = fd.get("dueDate") as string;
    if (dueDate) body.dueDate = new Date(dueDate).toISOString();

    try {
      const res = await fetch("/api/non-conformities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la création");
      } else {
        router.push("/non-conformities");
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
        <a href="/non-conformities" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Déclarer une non-conformité</h1>
          <p className="text-sm text-gray-500 mt-0.5">Enregistrez une NC manuelle (hors audit)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <p className="text-sm font-medium text-gray-700">Informations de la NC</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intitulé <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              placeholder="Ex: Procédure de nettoyage non respectée"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gravité <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="MINOR">Mineure</option>
              <option value="MAJOR">Majeure</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Échéance de traitement</label>
            <input
              name="dueDate"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={3}
              placeholder="Décrivez précisément la non-conformité constatée..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cause racine (si identifiée)</label>
            <textarea
              name="rootCause"
              rows={2}
              placeholder="5 Pourquoi, analyse des causes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Action corrective proposée</label>
            <textarea
              name="correctiveAction"
              rows={2}
              placeholder="Mesures à prendre pour corriger et prévenir la récurrence..."
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
            {loading ? "Enregistrement..." : "Déclarer la NC"}
          </button>
          <a
            href="/non-conformities"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
