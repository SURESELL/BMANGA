import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText, Upload, Download, Eye, FolderOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Documents" };

const DOC_STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:          { label: "Brouillon",        bg: "bg-gray-100",   color: "text-gray-600" },
  PENDING_REVIEW: { label: "En révision",      bg: "bg-yellow-100", color: "text-yellow-700" },
  APPROVED:       { label: "Approuvé",         bg: "bg-green-100",  color: "text-green-700" },
  ARCHIVED:       { label: "Archivé",          bg: "bg-blue-100",   color: "text-blue-600" },
  OBSOLETE:       { label: "Obsolète",         bg: "bg-red-100",    color: "text-red-600" },
};

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const documents = orgId
    ? await db.document.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, type: true, category: true, status: true, version: true, fileSize: true, updatedAt: true, expiresAt: true, mimeType: true },
      })
    : [];

  // Group by category
  const categories = [...new Set(documents.map((d) => d.category ?? "Général"))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">{documents.length} document{documents.length > 1 ? "s" : ""}</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
          <Upload className="w-4 h-4" /> Ajouter un document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun document</p>
          <p className="text-sm text-gray-400 mt-1">Téléversez vos premiers documents</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Catégorie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Version</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Modifié</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const statusStyle = DOC_STATUS_STYLES[doc.status] ?? DOC_STATUS_STYLES.DRAFT;
                const isExpiringSoon = doc.expiresAt && new Date(doc.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          {isExpiringSoon && (
                            <p className="text-xs text-orange-500">Expire le {formatDate(doc.expiresAt)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{doc.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">v{doc.version}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">{formatDate(doc.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Voir">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {doc.fileSize && (
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Télécharger">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
