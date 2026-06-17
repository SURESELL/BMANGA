import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { RISK_LEVELS, ACTION_STATUS_LABELS, type RiskLevel, type ActionStatus } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

function CotationCard({
  title,
  frequency,
  gravity,
  mastery,
  score,
  level,
}: {
  title: string;
  frequency: number | null;
  gravity: number | null;
  mastery: number | null;
  score: number | null;
  level: string | null;
}) {
  const lvl = level as RiskLevel | null;
  const lvlInfo = lvl ? RISK_LEVELS[lvl] : null;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex-1">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{title}</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Fréquence</dt>
          <dd className="font-medium text-gray-800">{frequency ?? "—"} / 5</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Gravité</dt>
          <dd className="font-medium text-gray-800">{gravity ?? "—"} / 5</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Maîtrise</dt>
          <dd className="font-medium text-gray-800">{mastery ?? "—"} / 3</dd>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
          <dt className="font-semibold text-gray-700">Score</dt>
          <dd className="font-bold text-[#1E3A5F] text-lg">{score ?? "—"}</dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="font-semibold text-gray-700">Niveau</dt>
          <dd>
            {lvlInfo ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${lvlInfo.bg} ${lvlInfo.color}`}>
                {lvlInfo.label}
              </span>
            ) : (
              <span className="text-gray-400 text-xs">—</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default async function RiskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string })?.organizationId;

  if (!orgId) notFound();

  const risk = await db.risk.findFirst({
    where: { id },
    include: {
      workUnit: { include: { site: true } },
      hazard: true,
      actionPlans: {
        include: {
          owner: true,
          evidences: true,
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!risk) notFound();

  // Verify org isolation via workUnit.site.organizationId
  if (risk.workUnit?.site?.organizationId !== orgId) notFound();

  const grossScore = risk.grossRisk;
  const grossLevel = risk.riskLevel; // gross level approximated by riskLevel
  const residualScore = risk.residualRisk;
  const residualLevel = risk.riskLevel;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div>
        <Link href="/risks" className="text-sm text-[#1E3A5F] hover:underline">
          ← Retour aux risques
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-[#1E3A5F]">
          {risk.description ?? "Risque sans description"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {risk.workUnit?.name}
          {risk.workUnit?.site && ` — ${risk.workUnit.site.name}`}
        </p>
      </div>

      {/* Risk Info Card */}
      <section className="bg-white rounded-xl shadow border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Informations</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500 mb-0.5">Famille de danger</dt>
              <dd className="font-medium text-gray-800">{risk.hazard?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-0.5">Description</dt>
              <dd className="text-gray-800">{risk.hazardDescription}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-0.5">Personnes exposées</dt>
              <dd className="text-gray-800">{risk.exposedPersons ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Mesures existantes</h2>
          {risk.existingMeasures ? (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{risk.existingMeasures}</p>
          ) : (
            <p className="text-sm text-gray-400">Aucune mesure renseignée.</p>
          )}
        </div>
      </section>

      {/* Cotation */}
      <section>
        <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Cotation</h2>
        <div className="flex gap-4 flex-col sm:flex-row">
          <CotationCard
            title="Cotation brute"
            frequency={risk.grossFrequency}
            gravity={risk.grossGravity}
            mastery={risk.grossMastery}
            score={grossScore}
            level={grossLevel as string}
          />
          <CotationCard
            title="Cotation résiduelle"
            frequency={risk.residualFrequency}
            gravity={risk.residualGravity}
            mastery={risk.residualMastery}
            score={residualScore}
            level={residualLevel as string}
          />
        </div>
      </section>

      {/* Action Plans */}
      <section className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">Plans d'action</h2>
          <Link
            href={`/action-plans/new?riskId=${id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition"
          >
            + Ajouter une action
          </Link>
        </div>

        {risk.actionPlans.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun plan d'action pour ce risque.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-4 font-semibold text-gray-600">Titre</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-600">Statut</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-600">Responsable</th>
                  <th className="pb-2 font-semibold text-gray-600">Échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {risk.actionPlans.map((ap) => {
                  const statusInfo = ACTION_STATUS_LABELS[ap.status as ActionStatus];
                  return (
                    <tr key={ap.id} className="hover:bg-gray-50 transition">
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/action-plans/${ap.id}`}
                          className="font-medium text-[#1E3A5F] hover:underline"
                        >
                          {ap.title}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        {statusInfo ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color} bg-opacity-10`}>
                            {statusInfo.label}
                          </span>
                        ) : (
                          <span className="text-gray-400">{ap.status}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700">
                        {ap.owner?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 text-gray-700">
                        {ap.dueDate ? formatDate(ap.dueDate) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Evidences — aggregated from action plans */}
      {(() => {
        const allEvidences = risk.actionPlans.flatMap((ap) => ap.evidences);
        return (
          <section className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Preuves / Documents</h2>
            {allEvidences.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune preuve associée.</p>
            ) : (
              <ul className="space-y-2">
                {allEvidences.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#1E3A5F] shrink-0" />
                    <span>{ev.title}</span>
                    {ev.fileUrl && (
                      <a
                        href={ev.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1E3A5F] hover:underline text-xs"
                      >
                        Ouvrir
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })()}
    </div>
  );
}
