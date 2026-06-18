"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RISK_FAMILIES } from "@/types"

function getRiskLevelFromScore(score: number): { label: string; color: string } {
  if (score <= 2) return { label: "Négligeable", color: "bg-gray-100 text-gray-600 border border-gray-200" }
  if (score <= 5) return { label: "Faible", color: "bg-green-100 text-green-700 border border-green-200" }
  if (score <= 12) return { label: "Modéré", color: "bg-yellow-100 text-yellow-700 border border-yellow-200" }
  if (score <= 20) return { label: "Élevé", color: "bg-orange-100 text-orange-700 border border-orange-200" }
  return { label: "Critique", color: "bg-red-100 text-red-700 border border-red-200" }
}

export default function NewRiskPage() {
  const router = useRouter()
  const [workUnits, setWorkUnits] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    workUnitId: "",
    hazardFamily: "",
    hazardDescription: "",
    exposedPersons: "",
    existingMeasures: "",
    grossFrequency: 1,
    grossGravity: 1,
    grossMastery: 1,
  })

  const grossRisk = Math.round((form.grossFrequency * form.grossGravity) / form.grossMastery)
  const riskLevel = getRiskLevelFromScore(grossRisk)

  useEffect(() => {
    fetch("/api/work-units")
      .then((r) => r.json())
      .then((data) => setWorkUnits(data.workUnits ?? []))
      .catch(() => {})
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (name: string, value: number) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, grossRisk }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création")
      router.push("/risks")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Nouveau risque</h1>
        <p className="text-gray-500 text-sm mt-1">Évaluez et documentez un nouveau risque professionnel</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unité de travail *</label>
          <select
            name="workUnitId"
            value={form.workUnitId}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
          >
            <option value="">Sélectionner une unité de travail</option>
            {workUnits.map((wu) => (
              <option key={wu.id} value={wu.id}>{wu.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Famille de danger *</label>
          <select
            name="hazardFamily"
            value={form.hazardFamily}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
          >
            <option value="">Sélectionner une famille</option>
            {RISK_FAMILIES.map((f) => (
              <option key={f.code} value={f.code}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description du danger *</label>
          <textarea
            name="hazardDescription"
            value={form.hazardDescription}
            onChange={handleChange}
            required
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent resize-none"
            placeholder="Décrivez le danger identifié..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Personnes exposées</label>
          <input
            type="text"
            name="exposedPersons"
            value={form.exposedPersons}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            placeholder="Ex: Opérateurs de ligne, techniciens..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mesures existantes</label>
          <textarea
            name="existingMeasures"
            value={form.existingMeasures}
            onChange={handleChange}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent resize-none"
            placeholder="Mesures de prévention déjà en place..."
          />
        </div>

        {/* Scoring */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Cotation du risque</h3>
          <div className="grid grid-cols-3 gap-4">
            <ScoreInput
              label="Fréquence"
              name="grossFrequency"
              value={form.grossFrequency}
              max={5}
              onChange={(v) => handleNumberChange("grossFrequency", v)}
              hint="1 = Rare → 5 = Très fréquent"
            />
            <ScoreInput
              label="Gravité"
              name="grossGravity"
              value={form.grossGravity}
              max={5}
              onChange={(v) => handleNumberChange("grossGravity", v)}
              hint="1 = Légère → 5 = Catastrophique"
            />
            <ScoreInput
              label="Maîtrise"
              name="grossMastery"
              value={form.grossMastery}
              max={3}
              onChange={(v) => handleNumberChange("grossMastery", v)}
              hint="1 = Faible → 3 = Bonne"
            />
          </div>

          {/* Live score */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Score de risque brut</p>
              <p className="text-3xl font-bold text-[#0D1B2A]">{grossRisk}</p>
              <p className="text-xs text-gray-400 mt-0.5">F({form.grossFrequency}) × G({form.grossGravity}) / M({form.grossMastery})</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${riskLevel.color}`}>
              {riskLevel.label}
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/risks")}
            className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer le risque"}
          </button>
        </div>
      </form>
    </div>
  )
}

function ScoreInput({
  label,
  name,
  value,
  max,
  onChange,
  hint,
}: {
  label: string
  name: string
  value: number
  max: number
  onChange: (v: number) => void
  hint: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
              value === n
                ? "bg-[#1E3A5F] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  )
}
