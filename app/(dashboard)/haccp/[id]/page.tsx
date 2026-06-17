"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface CCP {
  id: string;
  step: string;
  hazard: string;
  hazardType: string;
  criticalLimit: string;
  monitoring: string;
  correctiveAction: string | null;
  verification: string | null;
  records: string | null;
}

interface PRPo {
  id: string;
  name: string;
  description: string | null;
  monitoring: string | null;
  frequency: string | null;
  responsible: string | null;
}

interface HACCPPlanResource {
  resourceType: "plan";
  id: string;
  name: string;
  productType: string | null;
  scope: string | null;
  version: number;
  validatedAt: string | null;
  ccps: CCP[];
  prpos: PRPo[];
}

interface CCPResource extends CCP {
  resourceType: "ccp";
  planId: string;
}

type HACCPResource = HACCPPlanResource | CCPResource;

function hazardTypeBadge(type: string) {
  const map: Record<string, string> = {
    BIOLOGICAL: "bg-red-100 text-red-700",
    CHEMICAL: "bg-orange-100 text-orange-700",
    PHYSICAL: "bg-blue-100 text-blue-700",
    ALLERGEN: "bg-yellow-100 text-yellow-700",
  };
  return map[type] ?? "bg-gray-100 text-gray-600";
}

export default function HACCPDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<HACCPResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/haccp/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setResource(data);
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto py-10 px-4 text-gray-400">Chargement…</div>;
  if (error) return <div className="max-w-4xl mx-auto py-10 px-4 text-red-500">{error}</div>;
  if (!resource) return null;

  if (resource.resourceType === "ccp") {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="mb-6">
          <Link href={`/haccp/${resource.planId}`} className="text-sm text-[#1E3A5F] hover:underline">
            ← Retour au plan HACCP
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Point Critique de Contrôle</p>
              <h1 className="text-2xl font-bold text-[#1E3A5F]">{resource.step}</h1>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${hazardTypeBadge(resource.hazardType)}`}>
              {resource.hazardType}
            </span>
          </div>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-gray-500 font-medium mb-0.5">Danger identifié</dt>
              <dd className="text-gray-800">{resource.hazard}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium mb-0.5">Limite critique</dt>
              <dd className="text-gray-800">{resource.criticalLimit}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium mb-0.5">Surveillance</dt>
              <dd className="text-gray-800">{resource.monitoring}</dd>
            </div>
            {resource.correctiveAction && (
              <div>
                <dt className="text-gray-500 font-medium mb-0.5">Action corrective</dt>
                <dd className="text-gray-800">{resource.correctiveAction}</dd>
              </div>
            )}
            {resource.verification && (
              <div>
                <dt className="text-gray-500 font-medium mb-0.5">Vérification</dt>
                <dd className="text-gray-800">{resource.verification}</dd>
              </div>
            )}
            {resource.records && (
              <div>
                <dt className="text-gray-500 font-medium mb-0.5">Enregistrements</dt>
                <dd className="text-gray-800">{resource.records}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    );
  }

  const plan = resource as HACCPPlanResource;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href="/haccp" className="text-sm text-[#1E3A5F] hover:underline">← Retour aux plans HACCP</Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Plan HACCP · v{plan.version}</p>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">{plan.name}</h1>
          </div>
          <Link
            href={`/haccp/${id}/ccp/new`}
            className="rounded-lg bg-[#1E3A5F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition"
          >
            + Ajouter un CCP
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mt-4">
          <div>
            <dt className="text-gray-500">Type de produit</dt>
            <dd className="font-medium text-gray-800">{plan.productType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Périmètre</dt>
            <dd className="font-medium text-gray-800">{plan.scope ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Validé le</dt>
            <dd className="font-medium text-gray-800">{formatDate(plan.validatedAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Points Critiques de Contrôle ({plan.ccps.length})
        </h2>
        {plan.ccps.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun CCP défini.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {plan.ccps.map((ccp) => (
              <div key={ccp.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{ccp.step}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ccp.hazard}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${hazardTypeBadge(ccp.hazardType)}`}>
                    {ccp.hazardType}
                  </span>
                  <Link href={`/haccp/${ccp.id}`} className="text-xs text-[#1E3A5F] hover:underline">
                    Détail →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          PRPo ({plan.prpos.length})
        </h2>
        {plan.prpos.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun PRPo défini.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {plan.prpos.map((prpo) => (
              <div key={prpo.id} className="py-3">
                <p className="font-medium text-gray-800 text-sm">{prpo.name}</p>
                {prpo.description && <p className="text-xs text-gray-500 mt-0.5">{prpo.description}</p>}
                {prpo.frequency && (
                  <p className="text-xs text-gray-400 mt-0.5">Fréquence : {prpo.frequency}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
