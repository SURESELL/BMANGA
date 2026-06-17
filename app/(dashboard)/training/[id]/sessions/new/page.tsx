"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";

const SESSION_TYPES = [
  { value: "FACE_TO_FACE", label: "Présentiel" },
  { value: "REMOTE",       label: "Distanciel (visio)" },
  { value: "ELEARNING",    label: "E-learning" },
  { value: "BLENDED",      label: "Mixte (blended)" },
];

interface User { id: string; name: string | null; email: string; }

export default function TrainingSessionNewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trainers, setTrainers] = useState<User[]>([]);
  const [sessionType, setSessionType] = useState("FACE_TO_FACE");

  useEffect(() => {
    fetch("/api/users/org").then((r) => r.json()).then(setTrainers).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      type: fd.get("type"),
      startDate: new Date(fd.get("startDate") as string).toISOString(),
      endDate: new Date(fd.get("endDate") as string).toISOString(),
      title: fd.get("title") || undefined,
      notes: fd.get("notes") || undefined,
    };

    const trainerId = fd.get("trainerId") as string;
    if (trainerId) body.trainerId = trainerId;

    const maxLearners = fd.get("maxLearners") as string;
    if (maxLearners) body.maxLearners = parseInt(maxLearners);

    const location = fd.get("location") as string;
    if (location) body.location = location;

    const virtualLink = fd.get("virtualLink") as string;
    if (virtualLink) body.virtualLink = virtualLink;

    try {
      const res = await fetch(`/api/training/${id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Erreur lors de la création");
      } else {
        router.push(`/training/${id}`);
        router.refresh();
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href={`/training/${id}`} className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planifier une session</h1>
          <p className="text-sm text-gray-500 mt-0.5">Session de formation (présentiel, distanciel, e-learning)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-[#1E3A5F]" />
          <p className="text-sm font-medium text-gray-700">Informations de la session</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé (optionnel)</label>
            <input
              name="title"
              placeholder="Ex: Session Paris — Janvier 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de session <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              required
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              {SESSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formateur</label>
            <select
              name="trainerId"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
            >
              <option value="">Non assigné</option>
              {trainers.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date / heure début <span className="text-red-500">*</span>
            </label>
            <input
              name="startDate"
              type="datetime-local"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date / heure fin <span className="text-red-500">*</span>
            </label>
            <input
              name="endDate"
              type="datetime-local"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          {(sessionType === "FACE_TO_FACE" || sessionType === "BLENDED") && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
              <input
                name="location"
                placeholder="Ex: Salle de formation — Bâtiment A, Paris 75001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
          )}

          {(sessionType === "REMOTE" || sessionType === "BLENDED") && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lien visio</label>
              <input
                name="virtualLink"
                type="url"
                placeholder="https://meet.google.com/... ou https://teams.microsoft.com/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacité max.</label>
            <input
              name="maxLearners"
              type="number"
              min="1"
              placeholder="Ex: 12"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Informations complémentaires pour les apprenants..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60"
          >
            {loading ? "Création..." : "Planifier la session"}
          </button>
          <a
            href={`/training/${id}`}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
