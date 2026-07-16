"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/billing/plans";

export function BankTransferButton({ planId, planLabel }: { planId: PlanId; planLabel: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de la création de la facture.");
        return;
      }
      if (data.hostedInvoiceUrl) {
        window.location.href = data.hostedInvoiceUrl;
      } else {
        window.location.reload();
      }
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="block text-center w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? "Génération de la facture…" : `Payer ${planLabel} par virement`}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
