import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { RISK_LEVELS, type RiskLevel } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Brouillon",  color: "bg-gray-100 text-gray-700" },
  ACTIVE:    { label: "Actif",      color: "bg-blue-100 text-blue-700" },
  VALIDATED: { label: "Validé",     color: "bg-green-100 text-green-700" },
  ARCHIVED:  { label: "Archivé",    color: "bg-yellow-100 text-yellow-700" },
  CLOSED:    { label: "Clôturé",    color: "bg-red-100 text-red-700" },
};

const RISK_LEVEL_ORDER: RiskLevel[] = ["NEGLIGIBLE", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default async function DUERPDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string })?.organizationId;

  if (!orgId) notFound();

  const duerp = await db.dUERP.findFirst({
    where: { id, organizationId: orgId },
    include: {
      workUnits: {
        include: {
          risks: {
            include: { hazard: true },
          },
        },
      },
      risks: {
        include: {
          hazard: true,
          workUnit: true,
          actionPlans: {
            include: { owner: true },
          },
        },
      },
    },
  });

  if (!duerp) notFound();

  // Risk matrix summary
  const riskCountByLevel = RISK_LEVEL_ORDER.reduce<Record<RiskLevel, number>>(
    (acc, lvl) => ({ ...acc, [lvl]: 0 }),
    {} as Record<RiskLevel, number>
  );
  for (const risk of duerp.risks) {
    const lvl = risk.riskLevel as RiskLevel | null;
    if (lvl && lvl in riskCountByLevel) {
      riskCountByLevel[lvl]++;
    }
  }

  // Group risks by workUnit
  const risksByWorkUnit = new Map<string, { workUnitName: string; risks: typeof duerp.risks }>();
  for (const risk of duerp.risks) {
    const wuId = risk.workUnit?.id ?? "unknown";
    const wuName = risk.workUnit?.name ?? "Sans unité";
    if (!risksByWorkUnit.has(wuId)) {
      risksByWorkUnit.set(wuId, { workUnitName: wuName, risks: [] });
    }
    risksByWorkUnit.get(wuId)!.risks.push(risk);
  }

  const statusInfo = STATUS_LABELS[duerp.status] ?? { label: duerp.status, color: "bg-gray-100 text-gray-600" };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/duerp" className="text-sm text-[#1E3A5F] hover:underline">
            ← Retour à la liste
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-[#1E3A5F]">
            DUERP {duerp.year} — Version {duerp.version}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {duerp.validatedAt && (
              <span className="text-sm text-gray-500">
                Validé le {formatDate(duerp.validatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href={`/api/duerp/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1E3A5F] text-[#1E3A5F] px-4 py-2 text-sm font-semibold hover:bg-[#1E3A5F]/5 transition"
          >
            ↓ Exporter PDF
          </a>
          <form action={`/api/duerp/${id}`} method="POST">
            <input type="hidden" name="_method" value="PATCH" />
            <input type="hidden" name="action" value="validate" />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition"
            >
              Valider / Clôturer
            </button>
          </form>
        </div>
      </div>

      {/* Risk Matrix Summary */}
      <section className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Matrice des risques</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {RISK_LEVEL_ORDER.map((lvl) => (
                  <th key={lvl} className="px-4 py-2 text-center font-semibold">
                    <span className={`inline-block rounded-full px-3 py-0.5 text-xs ${RISK_LEVELS[lvl].bg} ${RISK_LEVELS[lvl].color}`}>
                      {RISK_LEVELS[lvl].label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {RISK_LEVEL_ORDER.map((lvl) => (
                  <td key={lvl} className="px-4 py-3 text-center text-2xl font-bold text-[#1E3A5F]">
                    {riskCountByLevel[lvl]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-right">
          Total : {duerp.risks.length} risque{duerp.risks.length !== 1 ? "s" : ""}
        </p>
      </section>

      {/* Risks by Work Unit */}
      <section className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Risques par unité de travail</h2>

        {risksByWorkUnit.size === 0 ? (
          <p className="text-gray-500 text-sm">Aucun risque enregistré pour ce DUERP.</p>
        ) : (
          <div className="space-y-6">
            {Array.from(risksByWorkUnit.entries()).map(([wuId, { workUnitName, risks }]) => (
              <div key={wuId}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">
                  {workUnitName}
                </h3>
                <div className="space-y-1">
                  {risks.map((risk) => {
                    const lvl = risk.riskLevel as RiskLevel | null;
                    const lvlInfo = lvl ? RISK_LEVELS[lvl] : null;
                    return (
                      <div
                        key={risk.id}
                        className="flex items-center justify-between rounded-lg px-4 py-2.5 hover:bg-gray-50 transition"
                      >
                        <div>
                          <Link
                            href={`/risks/${risk.id}`}
                            className="text-sm font-medium text-[#1E3A5F] hover:underline"
                          >
                            {risk.hazardDescription ?? risk.hazard?.name ?? "Risque sans description"}
                          </Link>
                          {risk.hazard && (
                            <p className="text-xs text-gray-500 mt-0.5">{risk.hazard.name}</p>
                          )}
                        </div>
                        {lvlInfo && (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${lvlInfo.bg} ${lvlInfo.color}`}
                          >
                            {lvlInfo.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      {duerp.notes && (
        <section className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-2">Notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{duerp.notes}</p>
        </section>
      )}
    </div>
  );
}
