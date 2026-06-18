"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";

const TRAINING_TYPES = [
  { value: "E_LEARNING",    label: "E-learning" },
  { value: "FACE_TO_FACE",  label: "Présentiel" },
  { value: "HYBRID",        label: "Hybride" },
  { value: "VIRTUAL_CLASS", label: "Classe virtuelle" },
  { value: "WEBINAR",       label: "Webinaire" },
];

const LEVELS = [
  { value: "BEGINNER",     label: "Débutant" },
  { value: "INTERMEDIATE", label: "Intermédiaire" },
  { value: "ADVANCED",     label: "Avancé" },
];

const CATEGORIES = [
  "Sécurité au travail", "Incendie / Évacuation", "Habilitations électriques",
  "Premiers secours (SST/PSC1)", "CACES / Conduite engins", "Risques chimiques",
  "HACCP / Hygiène alimentaire", "Qualité / ISO", "Environnement", "Management",
  "Réglementaire", "Informatique / Cyber", "RPS / QVT", "Autre",
];

export default function NewTrainingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    objectives: "",
    prerequisites: "",
    type: "E_LEARNING",
    level: "BEGINNER",
    category: "",
    duration: "",
    price: "",
    isCertifying: false,
    isPublic: false,
  });

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        duration: form.duration ? parseInt(form.duration) : undefined,
        price: form.price ? parseFloat(form.price) : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de la création.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/training/${data.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/training" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créer une formation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Définissez les informations de votre nouvelle formation</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1E3A5F]" /> Informations générales
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titre de la formation <span className="text-red-500">*</span>
            </label>
            <input
              type="text" value={form.title} onChange={(e) => update("title", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              placeholder="ex: Formation Sauveteur Secouriste du Travail (SST)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description} onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
              placeholder="Décrivez le contenu et les bénéfices de cette formation..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Objectifs pédagogiques</label>
            <textarea
              value={form.objectives} onChange={(e) => update("objectives", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
              placeholder="À l'issue de cette formation, le participant sera capable de..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prérequis</label>
            <input
              type="text" value={form.prerequisites} onChange={(e) => update("prerequisites", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              placeholder="ex: Aucun prérequis / Formation X recommandée"
            />
          </div>
        </div>

        {/* Type & settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Type & modalités</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de formation <span className="text-red-500">*</span></label>
              <select value={form.type} onChange={(e) => update("type", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                {TRAINING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau</label>
              <select value={form.level} onChange={(e) => update("level", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie</label>
              <select value={form.category} onChange={(e) => update("category", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                <option value="">Sélectionner...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée (minutes)</label>
              <input
                type="number" value={form.duration} onChange={(e) => update("duration", e.target.value)}
                min={1} max={99999}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                placeholder="ex: 420 (7h)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix HT (€) — laisser vide si interne</label>
            <input
              type="number" value={form.price} onChange={(e) => update("price", e.target.value)}
              min={0} step={0.01}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              placeholder="ex: 350.00"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isCertifying} onChange={(e) => update("isCertifying", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F]" />
              <div>
                <span className="text-sm font-medium text-gray-900">Formation certifiante</span>
                <p className="text-xs text-gray-500">Délivrance d&apos;un certificat de réalisation ou de compétences</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isPublic} onChange={(e) => update("isPublic", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F]" />
              <div>
                <span className="text-sm font-medium text-gray-900">Formation publique</span>
                <p className="text-xs text-gray-500">Visible dans le catalogue public (inter-entreprises)</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/training" className="flex-1 text-center border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : "Créer la formation"}
          </button>
        </div>
      </form>
    </div>
  );
}
