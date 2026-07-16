"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviseDuerpButton({ duerpId }: { duerpId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevise() {
    if (!confirm("Créer une nouvelle révision (brouillon) à partir de cette version validée ?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/duerp/${duerpId}/revise`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de la création de la révision.");
      } else {
        router.push(`/duerp/${data.id}`);
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleRevise}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-60"
      >
        {loading ? "Création…" : "Créer une révision"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
