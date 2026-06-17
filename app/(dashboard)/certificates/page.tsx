import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Award, Download, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Certificats" };

export default async function CertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const orgId = (session.user as { organizationId?: string })?.organizationId;

  const certificates = await db.certificate.findMany({
    where: { userId: userId! },
    orderBy: { issuedAt: "desc" },
    select: { id: true, title: true, issuedAt: true, expiresAt: true, score: true, pdfUrl: true, verifyCode: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes certificats</h1>
        <p className="text-sm text-gray-500 mt-1">{certificates.length} certificat{certificates.length > 1 ? "s" : ""} obtenu{certificates.length > 1 ? "s" : ""}</p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun certificat</p>
          <p className="text-sm text-gray-400 mt-1">Complétez des formations pour obtenir vos certificats</p>
          <a href="/training" className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#1E3A5F] font-medium hover:underline">
            Voir les formations
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => {
            const isExpired = cert.expiresAt && new Date(cert.expiresAt) < new Date();
            const isExpiringSoon = cert.expiresAt && !isExpired && new Date(cert.expiresAt) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

            return (
              <div key={cert.id} className={`bg-white border rounded-xl p-5 ${isExpired ? "border-red-200 opacity-75" : isExpiringSoon ? "border-orange-200" : "border-gray-200"}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpired ? "bg-gray-100" : "bg-yellow-100"}`}>
                    <Award className={`w-5 h-5 ${isExpired ? "text-gray-400" : "text-yellow-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{cert.title}</h3>
                    {isExpired && <span className="text-xs text-red-500 font-medium">Expiré</span>}
                    {isExpiringSoon && <span className="text-xs text-orange-500 font-medium">Expire bientôt</span>}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Délivré le</span>
                    <span className="font-medium text-gray-700">{formatDate(cert.issuedAt)}</span>
                  </div>
                  {cert.expiresAt && (
                    <div className="flex justify-between">
                      <span>Expire le</span>
                      <span className={`font-medium ${isExpired ? "text-red-600" : isExpiringSoon ? "text-orange-600" : "text-gray-700"}`}>
                        {formatDate(cert.expiresAt)}
                      </span>
                    </div>
                  )}
                  {cert.score != null && (
                    <div className="flex justify-between">
                      <span>Score</span>
                      <span className="font-medium text-gray-700">{cert.score}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Code de vérification</span>
                    <span className="font-mono text-xs text-[#1E3A5F]">{cert.verifyCode.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  {cert.pdfUrl && (
                    <a href={cert.pdfUrl} download className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#1E3A5F] border border-[#1E3A5F] py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                      <Download className="w-3 h-3" /> PDF
                    </a>
                  )}
                  <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Partager
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
