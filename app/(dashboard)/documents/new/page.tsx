"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Upload } from "lucide-react";

const DOC_TYPES = [
  { value: "POLICY", label: "Politique" },
  { value: "PROCEDURE", label: "Procédure" },
  { value: "FORM", label: "Formulaire" },
  { value: "RECORD", label: "Enregistrement" },
  { value: "INSTRUCTION", label: "Instruction" },
  { value: "REPORT", label: "Rapport" },
  { value: "CONTRACT", label: "Contrat" },
  { value: "OTHER", label: "Autre" },
];

const DOC_STATUSES = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "PENDING_REVIEW", label: "En révision" },
  { value: "APPROVED", label: "Approuvé" },
  { value: "ARCHIVED", label: "Archivé" },
];

export default function DocumentNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);

    const fileInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput?.files?.length) {
      alert("Upload S3 bientôt disponible. Enregistrement sans fichier.");
    }

    const tagsRaw = (fd.get("tags") as string) ?? "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      title: fd.get("title"),
      description: (fd.get("description") as string) || undefined,
      type: fd.get("type"),
      category: (fd.get("category") as string) || undefined,
      version: (fd.get("version") as string) || "1.0",
      status: fd.get("status"),
      tags,
      notes: (fd.get("notes") as string) || undefined,
    };

    const expiresAt = fd.get("expiresAt") as string;
    if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? JSON.stringify(data.error) ?? "Erreur lors de la création");
      } else {
        router.push("/documents");
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
        <a href="/documents" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajouter un document</h1>
          <p className="text-sm text-gray-500 mt-0.5">GED — Gestion Électronique des Documents</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-[#1E3A5F]" />
          <p className="text-sm font-medium text-gray-700">Informations du document</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              minLength={2}
              maxLength={200}
              placeholder="Ex: Procédure de gestion des déchets chimiques"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Sélectionner...</option>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              name="status"
              defaultValue="DRAFT"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              {DOC_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <input
              name="category"
              placeholder="Ex: HSE, Qualité, RH..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input
              name="version"
              defaultValue="1.0"
              placeholder="1.0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d&apos;expiration</label>
            <input
              name="expiresAt"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              name="tags"
              placeholder="hse, securite, qualite (séparés par des virgules)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fichier</label>
            <div className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-4 bg-gray-50">
              <Upload className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="file" className="text-sm text-gray-600 flex-1" />
            </div>
            <p className="text-xs text-gray-400 mt-1">L&apos;upload direct sera disponible prochainement (S3)</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Décrivez le contenu ou l'objectif du document..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Notes internes, remarques..."
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
            {loading ? "Enregistrement..." : "Enregistrer le document"}
          </button>
          <a
            href="/documents"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
