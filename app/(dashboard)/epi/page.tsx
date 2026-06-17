import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HardHat, PlusCircle, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { formatDate, isOverdue, getDaysUntil } from "@/lib/utils";

export const metadata = { title: "EPI / Vérifications" };

export default async function EPIPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const [epiItems, verifications] = await Promise.all([
    orgId
      ? db.ePIItem.findMany({
          where: { organizationId: orgId },
          include: { site: { select: { name: true } } },
          orderBy: { expiryDate: "asc" },
        })
      : [],
    orgId
      ? db.periodicVerification.findMany({
          where: { organizationId: orgId },
          include: { site: { select: { name: true } } },
          orderBy: { nextVerificationAt: "asc" },
        })
      : [],
  ]);

  const epiExpiring = epiItems.filter((e) => e.expiryDate && getDaysUntil(e.expiryDate) <= 30).length;
  const verificationsDue = verifications.filter((v) => v.nextVerificationAt && getDaysUntil(v.nextVerificationAt) <= 30).length;
  const overdueVerifications = verifications.filter((v) => v.nextVerificationAt && isOverdue(v.nextVerificationAt)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EPI & Vérifications périodiques</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion des équipements de protection et contrôles réglementaires</p>
        </div>
        <div className="flex gap-2">
          <a href="/epi/verification/new" className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            + Vérification
          </a>
          <a href="/epi/new" className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
            <PlusCircle className="w-4 h-4" /> Ajouter EPI
          </a>
        </div>
      </div>

      {/* Alerts */}
      {(epiExpiring > 0 || overdueVerifications > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div className="text-sm text-orange-800">
              {epiExpiring > 0 && <span className="font-medium">{epiExpiring} EPI expirent dans 30 jours. </span>}
              {overdueVerifications > 0 && <span className="font-medium">{overdueVerifications} vérification{overdueVerifications > 1 ? "s" : ""} en retard. </span>}
              Planifiez les actions nécessaires.
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="EPI enregistrés" value={epiItems.length} color="blue" />
        <Stat label="EPI expirent bientôt" value={epiExpiring} color="orange" />
        <Stat label="Vérifications planifiées" value={verifications.length} color="blue" />
        <Stat label="Vérifications en retard" value={overdueVerifications} color="red" />
      </div>

      {/* EPI Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Équipements de protection individuelle (EPI)</h2>
          <span className="text-xs text-gray-500">{epiItems.length} équipements</span>
        </div>
        {epiItems.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <HardHat className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun EPI enregistré</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">EPI</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Catégorie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Site</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Quantité</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expiration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Prochain contrôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {epiItems.map((epi) => {
                const expired = epi.expiryDate && isOverdue(epi.expiryDate);
                const expiringSoon = epi.expiryDate && !expired && getDaysUntil(epi.expiryDate) <= 30;
                return (
                  <tr key={epi.id} className={`hover:bg-gray-50 transition-colors ${expired ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                          <HardHat className="w-3.5 h-3.5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{epi.name}</p>
                          {epi.reference && <p className="text-xs text-gray-400">{epi.reference}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{epi.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{epi.site?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{epi.quantity}</td>
                    <td className="px-4 py-3">
                      {epi.expiryDate ? (
                        <div className="flex items-center gap-1">
                          {expired ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> :
                           expiringSoon ? <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" /> :
                           <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                          <span className={`text-xs ${expired ? "text-red-600 font-semibold" : expiringSoon ? "text-orange-600" : "text-gray-600"}`}>
                            {formatDate(epi.expiryDate)}
                          </span>
                        </div>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {epi.nextControlDate ? (
                        <span className={`text-xs ${isOverdue(epi.nextControlDate) ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                          {formatDate(epi.nextControlDate)}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Periodic Verifications */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Vérifications périodiques réglementaires</h2>
          <span className="text-xs text-gray-500">{verifications.length} équipements</span>
        </div>
        {verifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune vérification planifiée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Équipement</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Fréquence</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Dernière vérif.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prochaine vérif.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {verifications.map((v) => {
                const overdue = v.nextVerificationAt && isOverdue(v.nextVerificationAt);
                const soon = v.nextVerificationAt && !overdue && getDaysUntil(v.nextVerificationAt) <= 30;
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${overdue ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-400">{v.equipment}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">{v.frequency}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      {v.lastVerifiedAt ? formatDate(v.lastVerifiedAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.nextVerificationAt ? (
                        <span className={`text-xs ${overdue ? "text-red-600 font-semibold" : soon ? "text-orange-600" : "text-gray-600"}`}>
                          {overdue ? "⚠ " : ""}{formatDate(v.nextVerificationAt)}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        overdue ? "bg-red-100 text-red-700" : soon ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                      }`}>
                        {overdue ? "En retard" : soon ? "Bientôt" : "À jour"}
                      </span>
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

function Stat({ label, value, color }: { label: string; value: number; color: "blue" | "orange" | "red" }) {
  const colors = { blue: "text-[#1E3A5F]", orange: "text-orange-600", red: "text-red-600" };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
