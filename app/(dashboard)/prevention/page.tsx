import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HardHat, PlusCircle, AlertTriangle, Megaphone, FileText } from "lucide-react";
import { PREUVIA_DISCLAIMER } from "@/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Prévention opérationnelle" };

const COMM_TYPE_LABELS: Record<string, string> = { POSTER: "Affiche", FLASH: "Flash sécurité" };

export default async function PreventionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const [jobRiskSheets, communications] = await Promise.all([
    orgId
      ? db.jobRiskSheet.findMany({ where: { organizationId: orgId }, include: { site: { select: { name: true } } }, orderBy: { jobTitle: "asc" } })
      : [],
    orgId
      ? db.safetyCommunication.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 30 })
      : [],
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prévention opérationnelle</h1>
          <p className="text-sm text-gray-500 mt-1">Fiches de poste et communication sécurité (affiches, flashs)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/prevention/job-risk-sheets/new" className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            + Fiche de poste
          </Link>
          <Link href="/prevention/communications/new" className="flex items-center gap-2 bg-[#145B8C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors">
            <PlusCircle className="w-4 h-4" /> Nouvelle communication
          </Link>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{PREUVIA_DISCLAIMER}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Fiches de poste</h2>
          <span className="text-xs text-gray-500">{jobRiskSheets.length}</span>
        </div>
        {jobRiskSheets.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <HardHat className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune fiche de poste</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobRiskSheets.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#145B8C]/10 flex items-center justify-center shrink-0">
                  <HardHat className="w-4 h-4 text-[#145B8C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.jobTitle}</p>
                  <p className="text-xs text-gray-400">{s.site?.name ?? "Tous sites"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Communication sécurité</h2>
          <span className="text-xs text-gray-500">{communications.length}</span>
        </div>
        {communications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune communication</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {communications.map((c) => (
              <Link key={c.id} href={`/prevention/communications/${c.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#145B8C]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#145B8C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-400">{COMM_TYPE_LABELS[c.type] ?? c.type}{c.publishedAt ? ` · Publiée le ${formatDate(c.publishedAt)}` : ""}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${c.publishedAt ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {c.publishedAt ? "Publiée" : "Brouillon"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
