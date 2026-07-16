"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, PlayCircle, PauseCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const PERMIT_TYPE_LABELS: Record<string, string> = {
  FIRE: "Point chaud / Feu",
  HEIGHT: "Travail en hauteur",
  LIFTING: "Levage",
  CONFINED_SPACE: "Espace confiné",
  ELECTRICAL: "Électrique",
  LOCKOUT: "Consignation",
  ATEX: "ATEX",
  CHEMICAL: "Chimique",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-600" },
  ISSUED: { label: "Émis", className: "bg-green-100 text-green-700" },
  SUSPENDED: { label: "Suspendu", className: "bg-orange-100 text-orange-700" },
  CLOSED: { label: "Clôturé", className: "bg-gray-100 text-gray-500" },
};

interface Permit {
  id: string;
  type: string;
  status: string;
  title: string;
  location: string | null;
  description: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  validFrom: string | null;
  validUntil: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  resumedAt: string | null;
  closedAt: string | null;
  externalCompany: { id: string; name: string } | null;
  site: { id: string; name: string } | null;
}

export default function WorkPermitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendForm, setShowSuspendForm] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/work-permits/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setPermit(data);
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function transition(action: "issue" | "suspend" | "resume" | "close", reason?: string) {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-permits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de l'action");
      } else {
        setPermit(data);
        setShowSuspendForm(false);
        setSuspendReason("");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto py-10 px-4 text-gray-400">Chargement…</div>;
  if (error && !permit) return <div className="max-w-2xl mx-auto py-10 px-4 text-red-500">{error}</div>;
  if (!permit) return null;

  const statusInfo = STATUS_LABELS[permit.status];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/external-companies" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{permit.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{PERMIT_TYPE_LABELS[permit.type] ?? permit.type}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500">Entreprise extérieure</dt>
            <dd className="font-medium text-gray-800">{permit.externalCompany?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Site</dt>
            <dd className="font-medium text-gray-800">{permit.site?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Emplacement</dt>
            <dd className="font-medium text-gray-800">{permit.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Validité</dt>
            <dd className="font-medium text-gray-800">
              {permit.validFrom ? formatDate(permit.validFrom) : "—"} → {permit.validUntil ? formatDate(permit.validUntil) : "—"}
            </dd>
          </div>
          {permit.issuedAt && (
            <div>
              <dt className="text-gray-500">Émis le</dt>
              <dd className="font-medium text-gray-800">{formatDate(permit.issuedAt)}</dd>
            </div>
          )}
          {permit.closedAt && (
            <div>
              <dt className="text-gray-500">Clôturé le</dt>
              <dd className="font-medium text-gray-800">{formatDate(permit.closedAt)}</dd>
            </div>
          )}
        </dl>
        {permit.description && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description / consignes</dt>
            <dd className="text-sm text-gray-700 whitespace-pre-wrap">{permit.description}</dd>
          </div>
        )}
        {permit.status === "SUSPENDED" && permit.suspendedReason && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
            <strong>Motif de suspension :</strong> {permit.suspendedReason}
            {permit.suspendedAt && ` (le ${formatDate(permit.suspendedAt)})`}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Cycle de vie</h2>
        <div className="flex flex-wrap gap-2">
          {permit.status === "DRAFT" && (
            <button
              onClick={() => transition("issue")}
              disabled={acting}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" /> Émettre le permis
            </button>
          )}
          {permit.status === "ISSUED" && !showSuspendForm && (
            <button
              onClick={() => setShowSuspendForm(true)}
              disabled={acting}
              className="flex items-center gap-1.5 border border-orange-300 text-orange-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
            >
              <PauseCircle className="w-4 h-4" /> Suspendre
            </button>
          )}
          {permit.status === "SUSPENDED" && (
            <button
              onClick={() => transition("resume")}
              disabled={acting}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" /> Reprendre
            </button>
          )}
          {(permit.status === "ISSUED" || permit.status === "SUSPENDED" || permit.status === "DRAFT") && (
            <button
              onClick={() => transition("close")}
              disabled={acting}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Clôturer
            </button>
          )}
          {permit.status === "CLOSED" && (
            <p className="text-sm text-gray-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Ce permis est clôturé — aucune action possible.
            </p>
          )}
        </div>

        {showSuspendForm && (
          <div className="pt-2 space-y-2">
            <label className="block text-xs font-medium text-gray-600">Motif de suspension (requis)</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => transition("suspend", suspendReason)}
                disabled={acting || !suspendReason.trim()}
                className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                Confirmer la suspension
              </button>
              <button
                onClick={() => setShowSuspendForm(false)}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
