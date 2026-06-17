"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, ClipboardList } from "lucide-react";
import Link from "next/link";

const ACTION_TYPES = [
  { value: "CORRECTIVE",   label: "Corrective",    desc: "Éliminer une non-conformité détectée" },
  { value: "PREVENTIVE",   label: "Préventive",    desc: "Prévenir une non-conformité potentielle" },
  { value: "IMPROVEMENT",  label: "Amélioration",  desc: "Améliorer les performances" },
];

export default function NewActionPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const riskId = searchParams.get("riskId");
  const incidentId = searchParams.get("incidentId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "CORRECTIVE",
    priority: "3",
    ownerId: "",
    dueDate: "",
    budget: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/users/org").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/action-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        priority: parseInt(form.priority),
        ownerId: form.ownerId || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        notes: form.notes || undefined,
        riskId: riskId ?? undefined,
        incidentId: incidentId ?? undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de la création.");
      setLoading(false);
      return;
    }

    router.push("/action-plans");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/action-plans" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle action</h1>
          {riskId && <p className="text-sm text-gray-500 mt-0.5">Liée à un risque identifié</p>}
          {incidentId && <p className="text-sm text-gray-500 mt-0.5">Liée à un incident déclaré</p>}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#1E3A5F]" /> Description de l&apos;action
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titre de l&apos;action <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              placeholder="ex: Mettre en place des protections sur machines" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
              placeholder="Décrivez les actions à réaliser..." />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d&apos;action</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTION_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => update("type", t.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === t.value ? "border-[#1E3A5F] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <p className={`text-xs font-semibold ${form.type === t.value ? "text-[#1E3A5F]" : "text-gray-700"}`}>{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Planification</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité</label>
              <select value={form.priority} onChange={(e) => update("priority", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                <option value="1">P1 — Critique (immédiat)</option>
                <option value="2">P2 — Haute (1 semaine)</option>
                <option value="3">P3 — Moyenne (1 mois)</option>
                <option value="4">P4 — Basse (3 mois)</option>
                <option value="5">P5 — Très basse (6 mois)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Échéance</label>
              <input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsable</label>
            <select value={form.ownerId} onChange={(e) => update("ownerId", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
              <option value="">Non assigné</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget estimé (€)</label>
            <input type="number" value={form.budget} onChange={(e) => update("budget", e.target.value)}
              min={0} step={0.01}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              placeholder="ex: 1500.00" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
              placeholder="Informations complémentaires..." />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/action-plans" className="flex-1 text-center border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : "Créer l'action"}
          </button>
        </div>
      </form>
    </div>
  );
}
