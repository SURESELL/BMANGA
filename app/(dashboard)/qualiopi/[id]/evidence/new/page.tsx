"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";

const COMPLIANCE_LEVELS = [
  { value: "COMPLIANT",       label: "Conforme",         color: "text-green-700 bg-green-50 border-green-200" },
  { value: "PARTIAL",         label: "Partiel",          color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  { value: "NON_COMPLIANT",   label: "Non conforme",     color: "text-red-700 bg-red-50 border-red-200" },
  { value: "NOT_APPLICABLE",  label: "Non applicable",   color: "text-gray-600 bg-gray-50 border-gray-200" },
  { value: "TO_EVALUATE",     label: "À évaluer",        color: "text-blue-700 bg-blue-50 border-blue-200" },
];

interface Indicator { id: string; code: string; title: string; criterion: { code: string; title: string } }

export default function QualiopiEvidenceNewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  useEffect(() => {
    fetch("/api/qualiopi")
      .then((r) => r.json())
      .then((criteria) => {
        for (const criterion of criteria) {
          for (const ind of criterion.indicators ?? []) {
            if (ind.id === id) {
              setIndicator({ ...ind, criterion: { code: criterion.code, title: criterion.title } });
              return;
            }
          }
        }
      })
      .catch(() => {});
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);

    const fileInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput?.files?.length) {
      alert("Upload S3 bientôt disponible. Enregistrement sans fichier.");
    }

    const body: Record<string, unknown> = {
      indicatorId: id,
      title: fd.get("title"),
      complianceLevel: fd.get("complianceLevel"),
    };

    const description = fd.get("description") as string;
    if (description) body.description = description;

    const notes = fd.get("notes") as string;
    if (notes) body.notes = notes;

    try {
      const res = await fetch("/api/qualiopi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? JSON.stringify(data.error) ?? "Erreur");
      } else {
        router.back();
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
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajouter une preuve Qualiopi</h1>
          {indicator && (
            <p className="text-sm text-gray-500 mt-0.5">
              {indicator.criterion.code} — {indicator.code} : {indicator.title}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Note :</strong> À vérifier avec le référentiel Qualiopi officiel et validation d&apos;un expert avant usage dans le cadre d&apos;un audit.
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-5 h-5 text-[#1E3A5F]" />
          <p className="text-sm font-medium text-gray-700">Informations de la preuve</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre de la preuve <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              minLength={3}
              maxLength={200}
              placeholder="Ex: Procédure d'accueil des apprenants — version 2025"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Décrivez comment cette preuve démontre la conformité..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niveau de conformité <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPLIANCE_LEVELS.map((lvl) => (
                <label key={lvl.value} className="cursor-pointer">
                  <input type="radio" name="complianceLevel" value={lvl.value} required className="sr-only peer" />
                  <span className={`inline-block text-xs px-3 py-1.5 rounded-full border font-medium transition-all peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-current cursor-pointer ${lvl.color}`}>
                    {lvl.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fichier justificatif</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1E3A5F]/10 file:text-[#1E3A5F] hover:file:bg-[#1E3A5F]/20"
            />
            <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, images — Upload S3 bientôt disponible</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Remarques, date de prochaine mise à jour..."
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
            {loading ? "Enregistrement..." : "Ajouter la preuve"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
