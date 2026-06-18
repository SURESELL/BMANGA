"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ESGIndicator {
  id: string;
  name: string;
  category: string;
  year: number;
  unit: string | null;
  target: number | null;
  actual: number | null;
  source: string | null;
  notes: string | null;
}

function categoryStyle(category: string) {
  switch (category) {
    case "ENVIRONMENTAL": return { label: "Environnemental", color: "bg-green-100 text-green-700" };
    case "SOCIAL": return { label: "Social", color: "bg-blue-100 text-blue-700" };
    case "GOVERNANCE": return { label: "Gouvernance", color: "bg-purple-100 text-purple-700" };
    default: return { label: category, color: "bg-gray-100 text-gray-600" };
  }
}

export default function ESGDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [indicator, setIndicator] = useState<ESGIndicator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/esg/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setIndicator(data);
        setNotes(data.notes ?? "");
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSaveNotes() {
    setSaving(true);
    const res = await fetch(`/api/esg/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Erreur"); }
    else { setIndicator((i) => i ? { ...i, notes: data.notes } : i); setEditingNotes(false); }
    setSaving(false);
  }

  if (loading) return <div className="max-w-3xl mx-auto py-10 px-4 text-gray-400">Chargement…</div>;
  if (error) return <div className="max-w-3xl mx-auto py-10 px-4 text-red-500">{error}</div>;
  if (!indicator) return null;

  const cat = categoryStyle(indicator.category);
  const progress =
    indicator.target && indicator.actual !== null
      ? Math.min(100, Math.round((indicator.actual / indicator.target) * 100))
      : null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href="/esg" className="text-sm text-[#1E3A5F] hover:underline">← Retour aux indicateurs ESG</Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-2 ${cat.color}`}>
              {cat.label}
            </span>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">{indicator.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Année {indicator.year}{indicator.unit ? ` · ${indicator.unit}` : ""}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-500">Progression</span>
            <span className="font-medium text-gray-700">
              {indicator.actual ?? "—"} / {indicator.target ?? "—"}{indicator.unit ? ` ${indicator.unit}` : ""}
              {progress !== null && (
                <span className="ml-2 text-[#1E3A5F] font-semibold">{progress}%</span>
              )}
            </span>
          </div>
          {progress !== null ? (
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-[#1E3A5F]" : "bg-yellow-400"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : (
            <div className="w-full bg-gray-100 rounded-full h-3" />
          )}
        </div>

        {indicator.source && (
          <div className="mt-5 text-sm">
            <span className="text-gray-500">Source : </span>
            <span className="text-gray-800">{indicator.source}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notes</h2>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-xs text-[#1E3A5F] hover:underline"
            >
              Modifier
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
              placeholder="Ajouter des notes…"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="rounded-lg bg-[#1E3A5F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                onClick={() => { setEditingNotes(false); setNotes(indicator.notes ?? ""); }}
                className="rounded-lg border border-gray-300 text-gray-600 px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[3rem]">
            {indicator.notes || <span className="text-gray-400 italic">Aucune note.</span>}
          </p>
        )}
      </div>
    </div>
  );
}
