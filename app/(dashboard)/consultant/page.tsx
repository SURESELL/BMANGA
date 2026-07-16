import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserConsultancyWorkspaceId } from "@/lib/consultant/access";
import { ConsultantPortfolio } from "./ConsultantPortfolio";

export const metadata = { title: "Portefeuille clients" };

export default async function ConsultantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CONSULTANT" && role !== "SUPER_ADMIN") redirect("/dashboard");

  const workspaceId = await getUserConsultancyWorkspaceId(session.user.id);

  if (!workspaceId) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 text-sm text-amber-800">
          Aucun cabinet consultant n&apos;est associé à votre compte. Contactez un
          administrateur PREUVIA pour faire provisionner votre espace consultant.
        </div>
      </div>
    );
  }

  const access = await db.consultantClientAccess.findMany({
    where: { consultancyWorkspaceId: workspaceId, status: "ACTIVE" },
    include: {
      organization: {
        select: { id: true, name: true, siret: true, sector: true, createdAt: true },
      },
    },
    orderBy: { grantedAt: "desc" },
  });

  const clients = access.map((a) => ({
    id: a.organization.id,
    name: a.organization.name,
    siret: a.organization.siret,
    sector: a.organization.sector,
    accessGrantedAt: a.grantedAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portefeuille clients</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organisations clientes de votre cabinet — création, accès, révocation.
        </p>
      </div>
      <ConsultantPortfolio initialClients={clients} />
    </div>
  );
}
