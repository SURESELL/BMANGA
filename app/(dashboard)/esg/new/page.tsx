"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";

const ESG_INDICATORS_LIBRARY = {
  ENVIRONMENTAL: [
    "Émissions CO₂ (tCO₂e)", "Consommation d'énergie (MWh)", "Consommation d'eau (m³)",
    "Déchets générés (tonnes)", "Déchets recyclés (%)", "Part énergies renouvelables (%)",
    "Biodiversité — sites certifiés", "Rejets liquides (m³)", "Émissions NOx/SOx (kg)",
  ],
  SOCIAL: [
    "Taux de fréquence accidents (TF)", "Taux de gravité accidents (TG)",
    "Heures de formation par salarié", "Taux d'absentéisme (%)",
    "Taux de turnover (%)", "Écart salarial H/F (%)", "% travailleurs handicapés",
    "Satisfaction collaborateurs (score)", "Taux de télétravail (%)",
  ],
  GOVERNANCE: [
    "Nombre d'audits internes réalisés", "Taux de conformité réglementaire (%)",
    "Couverture du code éthique (%)", "Délai moyen paiement fournisseurs (jours)",
    "Part achats responsables (%)", "% femmes dans l'encadrement",
    "Nombre de whistleblowing signalements", "Risques cyber — incidents déclarés",
  ],
};

export default function ESGNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<"ENVIRONMENTAL" | "SOCIAL" | "GOVERNANCE">("ENVIRONMENTAL");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      category: fd.get("category"),
      name: fd.get("name"),
      unit: fd.get("unit") || undefined,
      year: Number(fd.get("year")),
      source: fd.get("source") || undefined,
      notes: fd.get("notes") || undefined,
    };

    const actual = fd.get("actual") as string;
    const target = fd.get("target") as string;
    if (actual) body.actual = parseFloat(actual);
    if (target) body.target = parseFloat(target);

    try {
      const res = await fetch("/api/esg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la création");
      } else {
        router.push("/esg");
        router.refresh();
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const suggestions = ESG_INDICATORS_LIBRARY[category];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/esg" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvel indicateur ESG</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ajoutez un indicateur à votre reporting RSE</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-[#1E3A5F]" />
          <p className="text-sm font-medium text-gray-700">Informations de l&apos;indicateur</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="ENVIRONMENTAL">Environnemental (E)</option>
              <option value="SOCIAL">Social (S)</option>
              <option value="GOVERNANCE">Gouvernance (G)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année <span className="text-red-500">*</span>
            </label>
            <input
              name="year"
              type="number"
              required
              defaultValue={new Date().getFullYear()}
              min="2020"
              max="2100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l&apos;indicateur <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              list="indicator-suggestions"
              placeholder="Ex: Émissions CO₂, Taux de fréquence..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
            <datalist id="indicator-suggestions">
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
            <p className="text-xs text-gray-400 mt-1">Commencez à taper pour voir des suggestions</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
            <input
              name="unit"
              placeholder="Ex: tCO₂e, MWh, %, jours..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source des données</label>
            <input
              name="source"
              placeholder="Ex: Compteur EDF, RH, DSI..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valeur réelle</label>
            <input
              name="actual"
              type="number"
              step="any"
              placeholder="Ex: 42.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectif cible</label>
            <input
              name="target"
              type="number"
              step="any"
              placeholder="Ex: 50"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Méthodologie</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Précisez la méthode de calcul, le périmètre..."
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
            {loading ? "Enregistrement..." : "Enregistrer l'indicateur"}
          </button>
          <a
            href="/esg"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
