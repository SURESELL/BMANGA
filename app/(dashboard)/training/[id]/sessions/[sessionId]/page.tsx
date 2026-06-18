"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, MapPin, Link2, Calendar, UserPlus, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  FACE_TO_FACE: "Présentiel",
  REMOTE: "Distanciel",
  ELEARNING: "E-learning",
  BLENDED: "Mixte",
};

const ENROLLMENT_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: "En attente",  color: "text-blue-600 bg-blue-50",   icon: Clock },
  CONFIRMED: { label: "Confirmé",    color: "text-green-600 bg-green-50", icon: CheckCircle },
  COMPLETED: { label: "Terminé",     color: "text-gray-600 bg-gray-100",  icon: CheckCircle },
  CANCELLED: { label: "Annulé",      color: "text-red-600 bg-red-50",     icon: XCircle },
};

interface Learner { id: string; name: string | null; email: string; }
interface Enrollment { id: string; learner: Learner; status: string; enrolledAt: string; }
interface Session {
  id: string; title?: string; type: string; status: string;
  startDate: string; endDate: string; location?: string; virtualLink?: string;
  maxLearners?: number; trainer?: Learner | null;
  enrollments: Enrollment[];
  _count: { enrollments: number };
  course: { title: string };
}

export default function TrainingSessionDetailPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const [sess, setSess] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [orgUsers, setOrgUsers] = useState<Learner[]>([]);
  const [search, setSearch] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetch(`/api/training/${id}/sessions/${sessionId}`)
      .then((r) => r.json())
      .then(setSess)
      .finally(() => setLoading(false));
  }, [id, sessionId]);

  function openEnroll() {
    setShowEnroll(true);
    if (orgUsers.length === 0) {
      fetch("/api/users/org").then((r) => r.json()).then(setOrgUsers).catch(() => {});
    }
  }

  async function enroll(learnerId: string) {
    setEnrolling(true);
    const res = await fetch(`/api/training/${id}/sessions/${sessionId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId }),
    });
    if (res.ok) {
      const enrollment = await res.json();
      setSess((prev) => prev ? { ...prev, enrollments: [...prev.enrollments, enrollment], _count: { enrollments: prev._count.enrollments + 1 } } : prev);
    }
    setEnrolling(false);
  }

  async function updateEnrollmentStatus(enrollmentId: string, status: string) {
    const res = await fetch(`/api/training/${id}/sessions/${sessionId}/enrollments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSess((prev) => prev ? {
        ...prev,
        enrollments: prev.enrollments.map((e) => e.id === enrollmentId ? updated : e),
      } : prev);
    }
  }

  if (loading) return <div className="text-center py-12 text-sm text-gray-400">Chargement...</div>;
  if (!sess) return <div className="text-center py-12 text-sm text-gray-500">Session introuvable.</div>;

  const enrolled = sess._count.enrollments;
  const isFull = sess.maxLearners ? enrolled >= sess.maxLearners : false;
  const enrolledIds = new Set(sess.enrollments.map((e) => e.learner.id));
  const filteredUsers = orgUsers.filter(
    (u) => !enrolledIds.has(u.id) && (
      (u.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/training" className="hover:underline">Formations</a>
          <span>/</span>
          <a href={`/training/${id}`} className="hover:underline truncate max-w-xs">{sess.course.title}</a>
          <span>/</span>
          <span className="text-gray-700 font-medium">{sess.title ?? TYPE_LABELS[sess.type] ?? sess.type}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{sess.title ?? TYPE_LABELS[sess.type]}</h1>
            <span className="inline-block mt-1 text-xs bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded-full font-medium">
              {TYPE_LABELS[sess.type] ?? sess.type}
            </span>
          </div>
          <a href={`/training/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Début</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(new Date(sess.startDate))}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Fin</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(new Date(sess.endDate))}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Inscrits</p>
          <p className={`text-sm font-medium ${isFull ? "text-red-600" : "text-gray-900"}`}>
            {enrolled}{sess.maxLearners ? ` / ${sess.maxLearners}` : ""}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Formateur</p>
          <p className="text-sm font-medium text-gray-900 truncate">{sess.trainer?.name ?? sess.trainer?.email ?? "—"}</p>
        </div>
      </div>

      {sess.location && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" /> {sess.location}
        </div>
      )}
      {sess.virtualLink && (
        <div className="flex items-center gap-2 text-sm">
          <Link2 className="w-4 h-4 text-gray-400" />
          <a href={sess.virtualLink} target="_blank" rel="noopener noreferrer" className="text-[#1E3A5F] hover:underline truncate">
            {sess.virtualLink}
          </a>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Apprenants inscrits ({enrolled})</p>
          {!isFull && (
            <button
              onClick={openEnroll}
              className="flex items-center gap-1.5 text-xs bg-[#1E3A5F] text-white px-3 py-1.5 rounded-lg hover:bg-[#0D1B2A] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Inscrire
            </button>
          )}
        </div>

        {showEnroll && (
          <div className="border-b border-gray-100 p-4 bg-gray-50">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] mb-2"
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 && (
                <p className="text-xs text-gray-400 py-2 text-center">Aucun utilisateur disponible</p>
              )}
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.name ?? u.email}</p>
                    {u.name && <p className="text-xs text-gray-500">{u.email}</p>}
                  </div>
                  <button
                    onClick={() => enroll(u.id)}
                    disabled={enrolling}
                    className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700 disabled:opacity-60"
                  >
                    Inscrire
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sess.enrollments.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Aucun apprenant inscrit</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Apprenant</th>
                <th className="text-left px-5 py-3">Statut</th>
                <th className="text-left px-5 py-3">Inscrit le</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sess.enrollments.map((e) => {
                const cfg = ENROLLMENT_STATUS[e.status] ?? ENROLLMENT_STATUS.PENDING;
                const Icon = cfg.icon;
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{e.learner.name ?? e.learner.email}</p>
                      {e.learner.name && <p className="text-xs text-gray-500">{e.learner.email}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(new Date(e.enrolledAt))}</td>
                    <td className="px-5 py-3">
                      {e.status === "PENDING" && (
                        <button
                          onClick={() => updateEnrollmentStatus(e.id, "CONFIRMED")}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Confirmer
                        </button>
                      )}
                      {e.status === "CONFIRMED" && (
                        <button
                          onClick={() => updateEnrollmentStatus(e.id, "COMPLETED")}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Terminé
                        </button>
                      )}
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
