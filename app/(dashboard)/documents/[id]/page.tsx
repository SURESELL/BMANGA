"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChevronRight, Download, FileText, CheckCircle, Clock, Archive, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG = {
  DRAFT:          { label: "Brouillon",    bg: "bg-gray-100",   color: "text-gray-600",   icon: FileText },
  PENDING_REVIEW: { label: "En revue",     bg: "bg-yellow-100", color: "text-yellow-700", icon: Clock },
  APPROVED:       { label: "Approuvé",     bg: "bg-green-100",  color: "text-green-700",  icon: CheckCircle },
  ARCHIVED:       { label: "Archivé",      bg: "bg-gray-100",   color: "text-gray-500",   icon: Archive },
  OBSOLETE:       { label: "Obsolète",     bg: "bg-gray-100",   color: "text-gray-400",   icon: X },
};

interface Document {
  id: string; title: string; description?: string; type: string;
  category?: string; status: string; version: number; tags: string[];
  fileUrl?: string; fileSize?: number; mimeType?: string;
  expiresAt?: string; createdAt: string; updatedAt: string;
  creator?: { name: string | null; email: string } | null;
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data) => setDoc(data))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDoc((prev) => prev ? { ...prev, ...updated } : updated);
    }
    setUpdating(false);
  }

  if (loading) return <div className="text-center py-12 text-sm text-gray-400">Chargement...</div>;
  if (!doc) return <div className="text-center py-12 text-sm text-gray-500">Document introuvable.</div>;

  const statusCfg = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;
  const isExpired = doc.expiresAt && new Date(doc.expiresAt) < new Date();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/documents" className="hover:underline">Documents</a>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-xs">{doc.title}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3" /> {statusCfg.label}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{doc.type}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Version</p>
          <p className="text-sm font-medium text-gray-900">v{doc.version}</p>
        </div>
        {doc.category && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Catégorie</p>
            <p className="text-sm font-medium text-gray-900">{doc.category}</p>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Créé par</p>
          <p className="text-sm font-medium text-gray-900">{doc.creator?.name ?? doc.creator?.email ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Créé le</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(new Date(doc.createdAt))}</p>
        </div>
        {doc.expiresAt && (
          <div className={`border rounded-xl p-4 ${isExpired ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
            <p className="text-xs text-gray-500 mb-1">Expire le</p>
            <p className={`text-sm font-medium ${isExpired ? "text-red-600" : "text-gray-900"}`}>
              {formatDate(new Date(doc.expiresAt))}
            </p>
          </div>
        )}
      </div>

      {doc.tags && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {doc.tags.map((tag) => (
            <span key={tag} className="text-xs bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded-full font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {doc.description && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{doc.description}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Fichier</p>
        {doc.fileUrl ? (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#16304f] transition-colors"
          >
            <Download className="w-4 h-4" /> Télécharger
          </a>
        ) : (
          <p className="text-sm text-gray-400 italic">Aucun fichier joint</p>
        )}
      </div>

      {(doc.status === "DRAFT" || doc.status === "PENDING_REVIEW") && (
        <div className="flex gap-3 flex-wrap">
          {doc.status === "DRAFT" && (
            <button
              onClick={() => updateStatus("PENDING_REVIEW")}
              disabled={updating}
              className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-60"
            >
              <Clock className="w-4 h-4" /> Soumettre en revue
            </button>
          )}
          {doc.status === "PENDING_REVIEW" && (
            <>
              <button
                onClick={() => updateStatus("APPROVED")}
                disabled={updating}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4" /> Approuver
              </button>
              <button
                onClick={() => updateStatus("ARCHIVED")}
                disabled={updating}
                className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <Archive className="w-4 h-4" /> Archiver
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
