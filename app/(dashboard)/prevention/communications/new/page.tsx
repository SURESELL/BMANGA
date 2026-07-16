"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSafetyCommunicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      type: fd.get("type"),
      title: fd.get("title"),
      content: fd.get("content"),
    };
    const expiresAt = fd.get("expiresAt") as string;
    if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

    try {
      const res = await fetch("/api/safety-communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? data.error ?? "Erreur lors de la création");
      } else {
        const created = await res.json();
        router.push(`/prevention/communications/${created.id}`);
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
        <Link href="/prevention" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle communication sécurité</h1>
          <p className="text-sm text-gray-500 mt-0.5">Créée en brouillon — la publication se fait ensuite depuis la fiche</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
          <select name="type" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C] bg-white">
            <option value="FLASH">Flash sécurité</option>
            <option value="POSTER">Affiche</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre <span className="text-red-500">*</span></label>
          <input name="title" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contenu <span className="text-red-500">*</span></label>
          <textarea name="content" required rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C] resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expire le</label>
          <input name="expiresAt" type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-[#145B8C] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors disabled:opacity-60">
            {loading ? "Enregistrement..." : "Créer (brouillon)"}
          </button>
          <Link href="/prevention" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
