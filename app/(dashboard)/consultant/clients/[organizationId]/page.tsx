import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck, AlertTriangle, Users, MapPin } from "lucide-react";
import { getUserConsultancyWorkspaceId, hasActiveClientAccess } from "@/lib/consultant/access";
import { formatDate } from "@/lib/utils";

const RISK_LEVEL_LABELS: Record<string, string> = {
  NEGLIGIBLE: "Négligeable",
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Élevé",
  CRITICAL: "Critique",
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  NEGLIGIBLE: "bg-gray-100 text-gray-600",
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export const metadata = { title: "Client — vue d'ensemble" };

export default async function ConsultantClientOverviewPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CONSULTANT" && role !== "SUPER_ADMIN") redirect("/dashboard");

  const workspaceId = await getUserConsultancyWorkspaceId(session.user.id);
  if (!workspaceId) redirect("/consultant");

  const { organizationId } = await params;

  // Jamais de confiance dans l'organizationId de l'URL seul — l'accès doit
  // être un accès ACTIF de CE cabinet à CETTE organisation précise.
  const allowed = await hasActiveClientAccess(workspaceId, organizationId);
  if (!allowed) notFound();

  const [organization, subscription, siteCount, userCount, latestDuerp, risksByLevel, openIncidentCount] =
    await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, siret: true, sector: true, createdAt: true },
      }),
      db.subscription.findUnique({
        where: { organizationId },
        select: { plan: true, status: true, currentPeriodEnd: true },
      }),
      db.site.count({ where: { organizationId, deletedAt: null } }),
      db.user.count({ where: { organizationId, isActive: true } }),
      db.dUERP.findFirst({
        where: { organizationId },
        orderBy: [{ year: "desc" }, { version: "desc" }],
        select: { id: true, year: true, version: true, status: true, validatedAt: true, nextReviewDate: true },
      }),
      db.risk.groupBy({ by: ["riskLevel"], where: { organizationId }, _count: { _all: true } }),
      db.incident.count({ where: { organizationId, status: { in: ["DECLARED", "UNDER_INVESTIGATION"] } } }),
    ]);

  if (!organization) notFound();

  const totalRisks = risksByLevel.reduce((sum, r) => sum + r._count._all, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/consultant" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {organization.sector ?? "Secteur non renseigné"}
            {organization.siret ? ` · SIRET ${organization.siret}` : ""}
            {" · Client depuis "}
            {formatDate(organization.createdAt)}
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
        Vue en lecture seule pour votre cabinet. La gestion opérationnelle
        (DUERP, risques, incidents...) reste réservée aux comptes de
        l&apos;organisation cliente — hors périmètre de cette session.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Users} label="Utilisateurs actifs" value={userCount} />
        <Stat icon={MapPin} label="Sites" value={siteCount} />
        <Stat icon={ShieldCheck} label="Risques recensés" value={totalRisks} />
        <Stat icon={AlertTriangle} label="Incidents ouverts" value={openIncidentCount} highlight={openIncidentCount > 0} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#145B8C]" />
          <h2 className="font-semibold text-gray-900">Abonnement</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Plan</p>
            <p className="font-medium text-gray-900">{subscription?.plan ?? "DIAGNOSTIC"}</p>
          </div>
          <div>
            <p className="text-gray-500">Statut</p>
            <p className="font-medium text-gray-900">{subscription?.status ?? "FREE"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#145B8C]" />
          <h2 className="font-semibold text-gray-900">Dernier DUERP</h2>
        </div>
        {latestDuerp ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Version</p>
              <p className="font-medium text-gray-900">{latestDuerp.year} · v{latestDuerp.version}</p>
            </div>
            <div>
              <p className="text-gray-500">Statut</p>
              <p className="font-medium text-gray-900">{latestDuerp.status}</p>
            </div>
            {latestDuerp.validatedAt && (
              <div>
                <p className="text-gray-500">Validé le</p>
                <p className="font-medium text-gray-900">{formatDate(latestDuerp.validatedAt)}</p>
              </div>
            )}
            {latestDuerp.nextReviewDate && (
              <div>
                <p className="text-gray-500">Prochaine révision</p>
                <p className="font-medium text-gray-900">{formatDate(latestDuerp.nextReviewDate)}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Aucun DUERP créé pour ce client.</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Risques par niveau</h2>
        {risksByLevel.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun risque recensé.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {risksByLevel.map((r) => (
              <span
                key={r.riskLevel}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${RISK_LEVEL_COLORS[r.riskLevel] ?? "bg-gray-100 text-gray-600"}`}
              >
                {RISK_LEVEL_LABELS[r.riskLevel] ?? r.riskLevel} : {r._count._all}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${highlight ? "text-red-500" : "text-gray-400"}`} />
      <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-[#145B8C]"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
