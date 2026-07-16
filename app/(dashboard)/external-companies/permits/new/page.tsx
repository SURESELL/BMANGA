"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const PERMIT_TYPES = [
  { value: "FIRE", label: "Point chaud / Feu" },
  { value: "HEIGHT", label: "Travail en hauteur" },
  { value: "LIFTING", label: "Levage" },
  { value: "CONFINED_SPACE", label: "Espace confiné" },
  { value: "ELECTRICAL", label: "Électrique" },
  { value: "LOCKOUT", label: "Consignation" },
  { value: "ATEX", label: "ATEX" },
  { value: "CHEMICAL", label: "Chimique" },
];

interface Company { id: string; name: string; }
interface Site { id: string; name: string; }

export default function NewWorkPermitPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/external-companies").then((r) => r.json()).then(setCompanies).catch(() => {});
    fetch("/api/sites").then((r) => r.json()).then((data) => setSites(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      type: fd.get("type"),
      title: fd.get("title"),
      externalCompanyId: (fd.get("externalCompanyId") as string) || undefined,
      siteId: (fd.get("siteId") as string) || undefined,
      location: (fd.get("location") as string) || undefined,
      description: (fd.get("description") as string) || undefined,
    };
    const validFrom = fd.get("validFrom") as string;
    if (validFrom) body.validFrom = new Date(validFrom).toISOString();
    const validUntil = fd.get("validUntil") as string;
    if (validUntil) body.validUntil = new Date(validUntil).toISOString();

    try {
      const res = await fetch("/api/work-permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? data.error ?? "Erreur lors de la création");
      } else {
        const created = await res.json();
        router.push(`/external-companies/permits/${created.id}`);
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
          <h1 className="text-2xl font-bold text-gray-900">Nouveau permis de travail</h1>
          <p className="text-sm text-gray-500 mt-0.5">Créé en brouillon — émission, suspension et clôture se font ensuite depuis la fiche du permis</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de permis <span className="text-red-500">*</span></label>
            <select name="type" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C] bg-white">
              {PERMIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre <span className="text-red-500">*</span></label>
            <input name="title" required placeholder="Ex: Soudure toiture atelier B" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise extérieure</label>
            <select name="externalCompanyId" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C] bg-white">
              <option value="">Aucune / interne</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select name="siteId" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C] bg-white">
              <option value="">Non renseigné</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valide à partir de</label>
            <input name="validFrom" type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valide jusqu&apos;au</label>
            <input name="validUntil" type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement précis</label>
            <input name="location" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / consignes de sécurité</label>
            <textarea name="description" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C] resize-none" />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-[#145B8C] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors disabled:opacity-60">
            {loading ? "Enregistrement..." : "Créer le permis (brouillon)"}
          </button>
          <Link href="/external-companies" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
