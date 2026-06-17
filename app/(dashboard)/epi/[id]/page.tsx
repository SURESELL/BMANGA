"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface EPIResource {
  resourceType: "epi" | "verification";
  id: string;
  name: string;
  category?: string;
  equipment?: string;
  standard?: string;
  quantity?: number;
  assignedTo?: string | null;
  assignedDate?: string | null;
  expiryDate?: string | null;
  nextControlDate?: string | null;
  frequency?: string;
  lastVerifiedAt?: string | null;
  nextVerificationAt?: string | null;
  result?: string | null;
  status?: string;
  verifiedBy?: string | null;
  notes?: string | null;
}

function isExpired(date: string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function EPIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<EPIResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/epi/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setResource(data);
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto py-10 px-4 text-gray-400">Chargement…</div>;
  if (error) return <div className="max-w-3xl mx-auto py-10 px-4 text-red-500">{error}</div>;
  if (!resource) return null;

  const isEPI = resource.resourceType === "epi";
  const expired = isExpired(isEPI ? resource.expiryDate : resource.nextVerificationAt);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/epi" className="text-sm text-[#1E3A5F] hover:underline">← Retour</Link>
        <button
          onClick={() => alert("Modification bientôt disponible")}
          className="rounded-lg bg-[#1E3A5F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition"
        >
          Modifier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              {isEPI ? "Équipement de Protection Individuelle" : "Vérification Périodique"}
            </p>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">{resource.name}</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isEPI && resource.category && (
              <StatusBadge label={resource.category} color="bg-blue-100 text-blue-700" />
            )}
            {expired && (
              <StatusBadge label="Expiré" color="bg-red-100 text-red-700" />
            )}
            {resource.status && !expired && (
              <StatusBadge
                label={resource.status}
                color={
                  resource.status === "DONE"
                    ? "bg-green-100 text-green-700"
                    : resource.status === "IN_PROGRESS"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                }
              />
            )}
          </div>
        </div>

        {isEPI ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Norme</dt>
              <dd className="font-medium text-gray-800">{resource.standard ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Quantité</dt>
              <dd className="font-medium text-gray-800">{resource.quantity ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Attribué à</dt>
              <dd className="font-medium text-gray-800">{resource.assignedTo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Date d'attribution</dt>
              <dd className="font-medium text-gray-800">{formatDate(resource.assignedDate)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Date d'expiration</dt>
              <dd className={`font-medium ${expired ? "text-red-600" : "text-gray-800"}`}>
                {formatDate(resource.expiryDate)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Prochain contrôle</dt>
              <dd className="font-medium text-gray-800">{formatDate(resource.nextControlDate)}</dd>
            </div>
          </dl>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Équipement</dt>
              <dd className="font-medium text-gray-800">{resource.equipment ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Fréquence</dt>
              <dd className="font-medium text-gray-800">{resource.frequency ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Dernière vérification</dt>
              <dd className="font-medium text-gray-800">{formatDate(resource.lastVerifiedAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Prochaine vérification</dt>
              <dd className={`font-medium ${expired ? "text-red-600" : "text-gray-800"}`}>
                {formatDate(resource.nextVerificationAt)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Résultat</dt>
              <dd className="font-medium text-gray-800">{resource.result ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Vérifié par</dt>
              <dd className="font-medium text-gray-800">{resource.verifiedBy ?? "—"}</dd>
            </div>
          </dl>
        )}

        {resource.notes && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</dt>
            <dd className="text-sm text-gray-700 whitespace-pre-wrap">{resource.notes}</dd>
          </div>
        )}
      </div>
    </div>
  );
}
