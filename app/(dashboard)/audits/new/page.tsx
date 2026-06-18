"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";

const AUDIT_TYPES = [
  { value: "INTERNAL",    label: "Audit interne" },
  { value: "SUPPLIER",    label: "Audit fournisseur" },
  { value: "SAFETY",      label: "Sécurité / HSE" },
  { value: "ENVIRONMENT", label: "Environnement" },
  { value: "HACCP",       label: "HACCP / Alimentaire" },
  { value: "QUALIOPI",    label: "Qualiopi" },
  { value: "ISO",         label: "ISO 9001 / 14001 / 45001" },
];

interface User { id: string; name: string | null; email: string; }
interface Site { id: string; name: string; }

export default function AuditNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    fetch("/api/users/org").then((r) => r.json()).then(setUsers).catch(() => {});
    fetch("/api/sites").then((r) => r.json()).then(setSites).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      type: fd.get("type"),
      title: fd.get("title"),
      notes: fd.get("notes") || undefined,
    };

    const siteId = fd.get("siteId") as string;
    if (siteId) body.siteId = siteId;

    const auditorId = fd.get("auditorId") as string;
    if (auditorId) body.auditorId = auditorId;

    const scheduledAt = fd.get("scheduledAt") as string;
    if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();

    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la création");
      } else {
        const audit = await res.json();
        router.push(`/audits/${audit.id}`);
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
        <a href="/audits" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planifier un audit</h1>
          <p className="text-sm text-gray-500 mt-0.5">Créez un nouvel audit et affectez un auditeur</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-5 h-5 text-[#1E3A5F]" />
          <p className="text-sm font-medium text-gray-700">Détails de l&apos;audit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d&apos;audit <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Sélectionner...</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date planifiée</label>
            <input
              name="scheduledAt"
              type="datetime-local"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intitulé <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              placeholder="Ex: Audit interne ISO 9001 — Site de Paris"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site audité</label>
            <select
              name="siteId"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Tous les sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auditeur responsable</label>
            <select
              name="auditorId"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Non assigné</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Périmètre</label>
            <textarea
              name="notes"
              rows={4}
              placeholder="Décrivez le périmètre de l'audit, les processus concernés..."
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
            {loading ? "Création..." : "Planifier l'audit"}
          </button>
          <a
            href="/audits"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
