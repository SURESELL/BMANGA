"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewIncidentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "INCIDENT" as "INCIDENT" | "ACCIDENT" | "NEAR_MISS",
    severity: "MINOR" as "NEAR_MISS" | "MINOR" | "SIGNIFICANT" | "SERIOUS" | "CRITICAL" | "FATAL",
    occurredAt: "",
    location: "",
    injuredPersons: 0,
    firstAidGiven: false,
    workStopped: false,
    witnesses: "",
    immediateActions: "",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value
    setForm((prev) => ({ ...prev, [target.name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la déclaration")
      router.push("/incidents")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Déclarer un incident</h1>
        <p className="text-gray-500 text-sm mt-1">Renseignez les informations relatives à l'événement</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            placeholder="Résumé de l'événement..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            placeholder="Décrivez les circonstances de l'événement..."
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type d'événement *</label>
          <div className="flex gap-4">
            {[
              { value: "INCIDENT", label: "Incident" },
              { value: "ACCIDENT", label: "Accident" },
              { value: "NEAR_MISS", label: "Presque accident" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={opt.value}
                  checked={form.type === opt.value}
                  onChange={handleChange}
                  className="text-[#1E3A5F]"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gravité *</label>
            <select
              name="severity"
              value={form.severity}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            >
              <option value="NEAR_MISS">Presque accident</option>
              <option value="MINOR">Mineur</option>
              <option value="SIGNIFICANT">Significatif</option>
              <option value="SERIOUS">Grave</option>
              <option value="CRITICAL">Critique</option>
              <option value="FATAL">Fatal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date et heure *</label>
            <input
              type="datetime-local"
              name="occurredAt"
              value={form.occurredAt}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            placeholder="Atelier, bureau, parking..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personnes blessées</label>
            <input
              type="number"
              name="injuredPersons"
              value={form.injuredPersons}
              onChange={handleChange}
              min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>
          <div className="flex flex-col gap-3 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="firstAidGiven"
                checked={form.firstAidGiven}
                onChange={handleChange}
                className="rounded text-[#1E3A5F]"
              />
              <span className="text-sm text-gray-700">Premiers secours prodigués</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="workStopped"
                checked={form.workStopped}
                onChange={handleChange}
                className="rounded text-[#1E3A5F]"
              />
              <span className="text-sm text-gray-700">Arrêt de travail</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Témoins</label>
          <input
            type="text"
            name="witnesses"
            value={form.witnesses}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            placeholder="Noms des témoins éventuels..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Actions immédiates</label>
          <textarea
            name="immediateActions"
            value={form.immediateActions}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            placeholder="Actions prises immédiatement après l'événement..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/incidents")}
            className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Déclarer l'incident"}
          </button>
        </div>
      </form>
    </div>
  )
}
