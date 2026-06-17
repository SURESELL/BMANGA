"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ExternalLink, AlertTriangle, Save, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Obligation {
  id: string;
  title: string;
  description: string;
  expectedEvidence?: string | null;
  complianceLevel: string;
  criticality: string;
  isValidatedByExpert: boolean;
  expertValidationNote?: string | null;
  disclaimer: string;
}

interface Regulation {
  id: string;
  title: string;
  domain: string;
  status?: string | null;
  officialSource?: string | null;
  officialLink?: string | null;
  publishedAt?: string | null;
  scope?: string | null;
  applicabilityCondition?: string | null;
  notes?: string | null;
  createdAt: string;
  obligations: Obligation[];
}

const DOMAIN_LABELS: Record<string, { label: string; color: string }> = {
  HSE:       { label: "HSE",           color: "bg-blue-100 text-blue-700" },
  FOOD:      { label: "Alimentaire",   color: "bg-green-100 text-green-700" },
  ENV:       { label: "Environnement", color: "bg-teal-100 text-teal-700" },
  TRANSPORT: { label: "Transport",     color: "bg-purple-100 text-purple-700" },
  QUALITY:   { label: "Qualité",       color: "bg-yellow-100 text-yellow-700" },
  SOCIAL:    { label: "Social",        color: "bg-orange-100 text-orange-700" },
  FISCAL:    { label: "Fiscal",        color: "bg-gray-100 text-gray-600" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  APPLICABLE:     { label: "Applicable",      color: "bg-green-100 text-green-700" },
  NOT_APPLICABLE: { label: "Non applicable",  color: "bg-gray-100 text-gray-600" },
  TO_VERIFY:      { label: "À vérifier",      color: "bg-yellow-100 text-yellow-700" },
  NON_COMPLIANT:  { label: "Non conforme",    color: "bg-red-100 text-red-700" },
};

export default function RegulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [regulation, setRegulation] = useState<Regulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/regulation/${id}`)
      .then((r) => {
        if (r.status === 404) { router.push("/regulation"); return null; }
        return r.json();
      })
      .then((data: Regulation | null) => {
        if (!data) return;
        setRegulation(data);
        setNotes(data.notes ?? "");
        setStatus(data.status ?? "");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/regulation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, status: status || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err?.error ?? "Erreur lors de la sauvegarde");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setSaveError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  if (!regulation) return null;

  const domain = DOMAIN_LABELS[regulation.domain] ?? { label: regulation.domain, color: "bg-gray-100 text-gray-600" };
  const statusCfg = status ? STATUS_CONFIG[status] : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/regulation" className="hover:text-[#1E3A5F] transition-colors">
          Réglementation
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium truncate max-w-xs">{regulation.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1E3A5F]">{regulation.title}</h1>
          <p className="text-xs text-gray-400 mt-1">Ajouté le {formatDate(regulation.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${domain.color}`}>
            {domain.label}
          </span>
          {statusCfg && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          À vérifier avec la source officielle applicable et validation expert avant usage juridique.
        </p>
      </div>

      {/* Info grid */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Informations réglementaires</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Source officielle" value={regulation.officialSource ?? null} />
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lien officiel</dt>
            <dd className="mt-1">
              {regulation.officialLink ? (
                <a
                  href={regulation.officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#1E3A5F] hover:underline"
                >
                  Consulter
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </dd>
          </div>
          <InfoRow label="Date de publication" value={regulation.publishedAt ? formatDate(regulation.publishedAt) : null} />
          <InfoRow label="Champ d'application" value={regulation.scope ?? null} />
          <InfoRow label="Condition d'applicabilité" value={regulation.applicabilityCondition ?? null} />
        </dl>
      </div>

      {/* Obligations / Expected evidence */}
      {regulation.obligations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Obligations et preuves attendues</h2>
          {regulation.obligations.map((ob) => (
            <div key={ob.id} className="border border-gray-100 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm text-gray-900">{ob.title}</p>
                <ComplianceBadge level={ob.complianceLevel} />
              </div>
              {ob.description && <p className="text-sm text-gray-600">{ob.description}</p>}
              {ob.expectedEvidence && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Preuve attendue</p>
                  <p className="text-sm text-blue-800">{ob.expectedEvidence}</p>
                </div>
              )}
              {ob.isValidatedByExpert && ob.expertValidationNote && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">Validation expert</p>
                  <p className="text-sm text-green-800">{ob.expertValidationNote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editable notes + status */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Notes internes &amp; statut</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Statut d&apos;applicabilité
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          >
            <option value="">— Non défini —</option>
            <option value="APPLICABLE">Applicable</option>
            <option value="NOT_APPLICABLE">Non applicable</option>
            <option value="TO_VERIFY">À vérifier</option>
            <option value="NON_COMPLIANT">Non conforme</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Ajouter des notes internes sur cette réglementation…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
          />
        </div>

        {saveError && (
          <p className="text-sm text-red-600">{saveError}</p>
        )}
        {saved && (
          <p className="text-sm text-green-600">Modifications enregistrées.</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#1E3A5F] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#162e4d] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function ComplianceBadge({ level }: { level: string }) {
  const cfg: Record<string, string> = {
    COMPLIANT:      "bg-green-100 text-green-700",
    PARTIAL:        "bg-yellow-100 text-yellow-700",
    NON_COMPLIANT:  "bg-red-100 text-red-700",
    NOT_APPLICABLE: "bg-gray-100 text-gray-600",
    TO_EVALUATE:    "bg-blue-100 text-blue-700",
  };
  const labels: Record<string, string> = {
    COMPLIANT:      "Conforme",
    PARTIAL:        "Partiel",
    NON_COMPLIANT:  "Non conforme",
    NOT_APPLICABLE: "N/A",
    TO_EVALUATE:    "À évaluer",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg[level] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[level] ?? level}
    </span>
  );
}
