"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, CheckCircle, Clock, AlertTriangle, Edit2, Save, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG = {
  TODO:        { label: "À faire",   bg: "bg-blue-100",   color: "text-blue-700",   icon: Clock },
  IN_PROGRESS: { label: "En cours",  bg: "bg-yellow-100", color: "text-yellow-700", icon: Clock },
  DONE:        { label: "Terminée",  bg: "bg-green-100",  color: "text-green-700",  icon: CheckCircle },
  CANCELED:    { label: "Annulée",   bg: "bg-gray-100",   color: "text-gray-500",   icon: X },
};

const TYPE_LABELS: Record<string, string> = {
  CORRECTIVE: "Corrective", PREVENTIVE: "Préventive", IMPROVEMENT: "Amélioration",
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Critique",    color: "text-red-600" },
  2: { label: "Haute",       color: "text-orange-600" },
  3: { label: "Normale",     color: "text-yellow-600" },
  4: { label: "Basse",       color: "text-blue-600" },
  5: { label: "Très basse",  color: "text-gray-500" },
};

interface ActionPlan {
  id: string; title: string; description?: string; type: string;
  priority: number; status: string; notes?: string; budget?: number;
  dueDate?: string; completedAt?: string; createdAt: string;
  owner?: { name: string | null; email: string } | null;
  risk?: { title: string; riskLevel: string } | null;
  incident?: { title: string; severity: string } | null;
  audit?: { title: string; type: string } | null;
}

export default function ActionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ap, setAp] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetch(`/api/action-plans/${id}`)
      .then((r) => r.json())
      .then((data) => { setAp(data); setEditNotes(data.notes ?? ""); })
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    const res = await fetch(`/api/action-plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAp((prev) => prev ? { ...prev, ...updated } : updated);
    }
    setUpdating(false);
  }

  async function saveNotes() {
    setUpdating(true);
    const res = await fetch(`/api/action-plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAp((prev) => prev ? { ...prev, notes: updated.notes } : updated);
      setEditing(false);
    }
    setUpdating(false);
  }

  if (loading) return <div className="text-center py-12 text-sm text-gray-400">Chargement...</div>;
  if (!ap) return <div className="text-center py-12 text-sm text-gray-500">Plan d&apos;action introuvable.</div>;

  const statusCfg = STATUS_CONFIG[ap.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.TODO;
  const StatusIcon = statusCfg.icon;
  const priorityCfg = PRIORITY_LABELS[ap.priority] ?? PRIORITY_LABELS[3];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/action-plans" className="hover:underline">Plans d&apos;action</a>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-xs">{ap.title}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{ap.title}</h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3" /> {statusCfg.label}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[ap.type] ?? ap.type}</span>
          <span className={`text-xs font-semibold ${priorityCfg.color}`}>Priorité : {priorityCfg.label}</span>
        </div>
      </div>

      {/* Key info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Responsable</p>
          <p className="text-sm font-medium text-gray-900">{ap.owner?.name ?? ap.owner?.email ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Échéance</p>
          <p className={`text-sm font-medium ${ap.dueDate && new Date(ap.dueDate) < new Date() && ap.status !== "DONE" ? "text-red-600" : "text-gray-900"}`}>
            {ap.dueDate ? formatDate(new Date(ap.dueDate)) : "—"}
          </p>
        </div>
        {ap.budget !== null && ap.budget !== undefined && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Budget</p>
            <p className="text-sm font-medium text-gray-900">{ap.budget.toLocaleString("fr-FR")} €</p>
          </div>
        )}
        {ap.completedAt && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Terminé le</p>
            <p className="text-sm font-medium text-green-700">{formatDate(new Date(ap.completedAt))}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {ap.description && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ap.description}</p>
        </div>
      )}

      {/* Source */}
      {(ap.risk || ap.incident || ap.audit) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-700 mb-1">Source</p>
          {ap.risk && <p className="text-sm text-blue-800">Risque : {ap.risk.title} ({ap.risk.riskLevel})</p>}
          {ap.incident && <p className="text-sm text-blue-800">Incident : {ap.incident.title}</p>}
          {ap.audit && <p className="text-sm text-blue-800">Audit : {ap.audit.title}</p>}
        </div>
      )}

      {/* Notes */}
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
              <button onClick={() => { setEditing(false); setEditNotes(ap.notes ?? ""); }} className="text-xs text-gray-400 hover:underline">
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
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{ap.notes || <span className="text-gray-400 italic">Aucune note</span>}</p>
        )}
      </div>

      {/* Status actions */}
      {ap.status !== "DONE" && ap.status !== "CANCELED" && (
        <div className="flex gap-3 flex-wrap">
          {ap.status === "TODO" && (
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
            <CheckCircle className="w-4 h-4" /> Marquer comme terminée
          </button>
          <button
            onClick={() => { if (confirm("Annuler cette action ?")) updateStatus("CANCELED"); }}
            disabled={updating}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <AlertTriangle className="w-4 h-4" /> Annuler
          </button>
        </div>
      )}

      {ap.status === "DONE" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">Action terminée.</p>
        </div>
      )}
    </div>
  );
}
