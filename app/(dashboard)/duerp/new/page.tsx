"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NewDUERPPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/duerp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, notes }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de la création");
      }

      router.push("/duerp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link
          href="/duerp"
          className="text-sm text-[#1E3A5F] hover:underline flex items-center gap-1"
        >
          ← Retour à la liste
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Nouveau DUERP
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Créez une nouvelle version du Document Unique d'Évaluation des Risques Professionnels.
        </p>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="year"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Année <span className="text-red-500">*</span>
            </label>
            <input
              id="year"
              type="number"
              min={2000}
              max={2100}
              required
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={cn(
                "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent",
                "transition"
              )}
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes / Contexte
            </label>
            <textarea
              id="notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Décrivez le contexte de cette version, les changements majeurs..."
              className={cn(
                "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent",
                "transition resize-none"
              )}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex-1 bg-[#1E3A5F] text-white rounded-lg px-6 py-2.5 text-sm font-semibold",
                "hover:bg-[#162d4a] transition",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading ? "Création en cours..." : "Créer le DUERP"}
            </button>
            <Link
              href="/duerp"
              className={cn(
                "flex-1 text-center rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700",
                "hover:bg-gray-50 transition"
              )}
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
