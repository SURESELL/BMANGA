import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, PlusCircle, ShieldAlert, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Entreprises extérieures & permis" };

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

const PERMIT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-600" },
  ISSUED: { label: "Émis", className: "bg-green-100 text-green-700" },
  SUSPENDED: { label: "Suspendu", className: "bg-orange-100 text-orange-700" },
  CLOSED: { label: "Clôturé", className: "bg-gray-100 text-gray-500" },
};

export default async function ExternalCompaniesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const [companies, permits] = await Promise.all([
    orgId
      ? db.externalCompany.findMany({
          where: { organizationId: orgId },
          include: { _count: { select: { workPermits: true, preventionPlans: true } } },
          orderBy: { name: "asc" },
        })
      : [],
    orgId
      ? db.workPermit.findMany({
          where: { organizationId: orgId },
          include: { externalCompany: { select: { name: true } }, site: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [],
  ]);

  const activePermits = permits.filter((p) => p.status === "ISSUED" || p.status === "SUSPENDED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entreprises extérieures & permis de travail</h1>
          <p className="text-sm text-gray-500 mt-1">Plans de prévention et permis (feu, hauteur, levage, espace confiné, électrique, consignation, ATEX, chimique)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/external-companies/new" className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            + Entreprise
          </Link>
          <Link href="/external-companies/permits/new" className="flex items-center gap-2 bg-[#145B8C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors">
            <PlusCircle className="w-4 h-4" /> Nouveau permis
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Entreprises" value={companies.length} />
        <Stat label="Permis actifs" value={activePermits} highlight={activePermits > 0} />
        <Stat label="Permis émis" value={permits.filter((p) => p.status === "ISSUED").length} />
        <Stat label="Permis suspendus" value={permits.filter((p) => p.status === "SUSPENDED").length} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Entreprises extérieures</h2>
          <span className="text-xs text-gray-500">{companies.length}</span>
        </div>
        {companies.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune entreprise extérieure enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {companies.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#145B8C]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#145B8C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.activity ?? "Activité non renseignée"}
                    {c.insuranceValidUntil && ` · Assurance valide jusqu'au ${formatDate(c.insuranceValidUntil)}`}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">{c._count.workPermits} permis · {c._count.preventionPlans} plan(s)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Permis de travail</h2>
          <span className="text-xs text-gray-500">{permits.length}</span>
        </div>
        {permits.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShieldAlert className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun permis de travail</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Entreprise</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permits.map((p) => {
                const statusInfo = PERMIT_STATUS_LABELS[p.status];
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/external-companies/permits/${p.id}`} className="font-medium text-gray-900 hover:text-[#145B8C] transition-colors">
                        {p.title}
                      </Link>
                      {p.status === "SUSPENDED" && p.suspendedReason && (
                        <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> {p.suspendedReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{PERMIT_TYPE_LABELS[p.type] ?? p.type}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{p.externalCompany?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${highlight ? "text-orange-600" : "text-[#145B8C]"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
