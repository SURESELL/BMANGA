"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Remplace un ancien <form action="/api/duerp/[id]" method="POST"> avec un
 * champ caché `_method=PATCH` : ce mécanisme de "method override" n'est
 * implémenté nulle part dans ce dépôt (ni middleware, ni route POST), et la
 * route DUERP n'expose qu'un handler PATCH. Ce bouton échouait donc
 * systématiquement (405) — jamais fonctionnel. Corrigé par un vrai appel
 * fetch PATCH côté client.
 */
export function ValidateDuerpButton({ duerpId }: { duerpId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    if (!confirm("Valider ce DUERP ? Cette version deviendra immuable — toute évolution nécessitera une révision.")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/duerp/${duerpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "VALIDATED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de la validation.");
      } else {
        router.refresh();
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
        onClick={handleValidate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#145B8C] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition disabled:opacity-60"
      >
        {loading ? "Validation…" : "Valider"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
