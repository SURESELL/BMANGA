"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChevronRight, CheckCircle, Clock, AlertTriangle, Edit2, Save, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG = {
  TODO:        { label: "À faire",   bg: "bg-blue-100",   color: "text-blue-700",   icon: Clock },
  IN_PROGRESS: { label: "En cours",  bg: "bg-yellow-100", color: "text-yellow-700", icon: Clock },
  DONE:        { label: "Terminée",  bg: "bg-green-100",  color: "text-green-700",  icon: CheckCircle },
  CANCELED:    { label: "Annulée",   bg: "bg-gray-100",   color: "text-gray-500",   icon: X },
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  MINOR:    { label: "Mineure",   bg: "bg-yellow-100", color: "text-yellow-700" },
  MAJOR:    { label: "Majeure",   bg: "bg-orange-100", color: "text-orange-700" },
  CRITICAL: { label: "Critique",  bg: "bg-red-100",    color: "text-red-700" },
};

interface NonConformity {
  id: string; title: string; description?: string; type: string;
  status: string; notes?: string; dueDate?: string; completedAt?: string;
  rootCause?: string; correctiveAction?: string; createdAt: string;
  owner?: { name: string | null; email: string } | null;
  audit?: { title: string; type: string } | null;
}

export default function NonConformityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [nc, setNc] = useState<NonConformity | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetch(`/api/non-conformities/${id}`)
      .then((r) => r.json())
      .then((data) => { setNc(data); setEditNotes(data.notes ?? ""); })
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    const res = await fetch(`/api/non-conformities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNc((prev) => prev ? { ...prev, ...updated } : updated);
    }
    setUpdating(false);
  }

  async function saveNotes() {
    setUpdating(true);
    const res = await fetch(`/api/non-conformities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNc((prev) => prev ? { ...prev, notes: updated.notes } : updated);
      setEditing(false);
    }
    setUpdating(false);
  }

  if (loading) return <div className="text-center py-12 text-sm text-gray-400">Chargement...</div>;
  if (!nc) return <div className="text-center py-12 text-sm text-gray-500">Non-conformité introuvable.</div>;

  const statusCfg = STATUS_CONFIG[nc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.TODO;
  const StatusIcon = statusCfg.icon;
  const typeCfg = TYPE_CONFIG[nc.type] ?? TYPE_CONFIG.MINOR;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/non-conformities" className="hover:underline">Non-conformités</a>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-xs">{nc.title}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{nc.title}</h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3" /> {statusCfg.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeCfg.bg} ${typeCfg.color}`}>
            {typeCfg.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Responsable</p>
          <p className="text-sm font-medium text-gray-900">{nc.owner?.name ?? nc.owner?.email ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Échéance</p>
          <p className={`text-sm font-medium ${nc.dueDate && new Date(nc.dueDate) < new Date() && nc.status !== "DONE" ? "text-red-600" : "text-gray-900"}`}>
            {nc.dueDate ? formatDate(new Date(nc.dueDate)) : "—"}
          </p>
        </div>
        {nc.audit && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Audit source</p>
            <p className="text-sm font-medium text-gray-900">{nc.audit.title}</p>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Créé le</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(new Date(nc.createdAt))}</p>
        </div>
      </div>

      {nc.description && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{nc.description}</p>
        </div>
      )}

      {nc.rootCause && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Cause racine</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{nc.rootCause}</p>
        </div>
      )}

      {nc.correctiveAction && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Action corrective</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{nc.correctiveAction}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Notes de suivi</p>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-[#1E3A5F] hover:underline">
              <Edit2 className="w-3 h-3" /> Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={saveNotes} disabled={updating} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                <Save className="w-3 h-3" /> Sauvegarder
              </button>
              <button onClick={() => { setEditing(false); setEditNotes(nc.notes ?? ""); }} className="text-xs text-gray-400 hover:underline">
                Annuler
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
          />
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{nc.notes || <span className="text-gray-400 italic">Aucune note</span>}</p>
        )}
      </div>

      {nc.status !== "DONE" && nc.status !== "CANCELED" && (
        <div className="flex gap-3 flex-wrap">
          {nc.status === "TODO" && (
            <button
              onClick={() => updateStatus("IN_PROGRESS")}
              disabled={updating}
              className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-60"
            >
              <Clock className="w-4 h-4" /> Démarrer
            </button>
          )}
          <button
            onClick={() => updateStatus("DONE")}
            disabled={updating}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            <CheckCircle className="w-4 h-4" /> Marquer terminée
          </button>
          <button
            onClick={() => { if (confirm("Annuler cette non-conformité ?")) updateStatus("CANCELED"); }}
            disabled={updating}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <AlertTriangle className="w-4 h-4" /> Annuler
          </button>
        </div>
      )}

      {nc.status === "DONE" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">Non-conformité traitée.</p>
        </div>
      )}
    </div>
  );
}
