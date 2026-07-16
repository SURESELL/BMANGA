"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewExternalCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      name: fd.get("name"),
      siret: (fd.get("siret") as string)?.trim() || undefined,
      activity: (fd.get("activity") as string) || undefined,
      contactName: (fd.get("contactName") as string) || undefined,
      contactEmail: (fd.get("contactEmail") as string) || undefined,
      contactPhone: (fd.get("contactPhone") as string) || undefined,
    };
    const insuranceValidUntil = fd.get("insuranceValidUntil") as string;
    if (insuranceValidUntil) body.insuranceValidUntil = new Date(insuranceValidUntil).toISOString();

    try {
      const res = await fetch("/api/external-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? data.error ?? "Erreur lors de la création");
      } else {
        router.push("/external-companies");
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
        <Link href="/external-companies" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle entreprise extérieure</h1>
          <p className="text-sm text-gray-500 mt-0.5">Intervenant externe (prestataire, sous-traitant...)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale <span className="text-red-500">*</span></label>
            <input name="name" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
            <input name="siret" placeholder="14 chiffres" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activité</label>
            <input name="activity" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
            <input name="contactName" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input name="contactPhone" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail contact</label>
            <input name="contactEmail" type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assurance valide jusqu&apos;au</label>
            <input name="insuranceValidUntil" type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-[#145B8C] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors disabled:opacity-60">
            {loading ? "Enregistrement..." : "Créer l'entreprise"}
          </button>
          <Link href="/external-companies" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
