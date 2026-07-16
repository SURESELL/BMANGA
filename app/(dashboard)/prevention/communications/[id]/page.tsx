"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone, Send, EyeOff } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Communication {
  id: string;
  type: string;
  title: string;
  content: string;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = { POSTER: "Affiche", FLASH: "Flash sécurité" };

export default function SafetyCommunicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [communication, setCommunication] = useState<Communication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/safety-communications/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setCommunication(data);
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function togglePublish(publish: boolean) {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/safety-communications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Échec de l'action");
      else setCommunication(data);
    } catch {
      setError("Erreur réseau");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto py-10 px-4 text-gray-400">Chargement…</div>;
  if (error && !communication) return <div className="max-w-2xl mx-auto py-10 px-4 text-red-500">{error}</div>;
  if (!communication) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/prevention" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{communication.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${communication.publishedAt ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {communication.publishedAt ? "Publiée" : "Brouillon"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{TYPE_LABELS[communication.type] ?? communication.type}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Megaphone className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wide font-medium">Contenu</span>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{communication.content}</p>
        {communication.publishedAt && (
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">Publiée le {formatDate(communication.publishedAt)}</p>
        )}
        {communication.expiresAt && (
          <p className="text-xs text-gray-400">Expire le {formatDate(communication.expiresAt)}</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {communication.publishedAt ? (
          <button
            onClick={() => togglePublish(false)}
            disabled={acting}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <EyeOff className="w-4 h-4" /> Dépublier
          </button>
        ) : (
          <button
            onClick={() => togglePublish(true)}
            disabled={acting}
            className="flex items-center gap-1.5 bg-[#145B8C] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Publier
          </button>
        )}
      </div>
    </div>
  );
}
