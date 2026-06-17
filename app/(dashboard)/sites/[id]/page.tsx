"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface SiteDetail {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  managerId: string | null;
  createdAt: string;
  _count: { risks: number; epiItems: number };
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", postalCode: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/sites/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setSite(data);
        setForm({
          name: data.name ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          postalCode: data.postalCode ?? "",
        });
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/sites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Erreur lors de la sauvegarde"); }
    else { setSite((s) => s ? { ...s, ...data } : s); setEditing(false); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce site définitivement ?")) return;
    const res = await fetch(`/api/sites/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Erreur lors de la suppression"); return; }
    router.push("/sites");
  }

  if (loading) return <div className="max-w-3xl mx-auto py-10 px-4 text-gray-400">Chargement…</div>;
  if (error) return <div className="max-w-3xl mx-auto py-10 px-4 text-red-500">{error}</div>;
  if (!site) return null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/sites" className="text-sm text-[#1E3A5F] hover:underline">← Retour aux sites</Link>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-[#1E3A5F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition"
            >
              Modifier
            </button>
          )}
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 transition"
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">{site.name}</h1>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <input
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#1E3A5F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162d4a] transition disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-300 text-gray-600 px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Adresse</dt>
              <dd className="font-medium text-gray-800">{site.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ville</dt>
              <dd className="font-medium text-gray-800">{site.city ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Code postal</dt>
              <dd className="font-medium text-gray-800">{site.postalCode ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Téléphone</dt>
              <dd className="font-medium text-gray-800">{site.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Créé le</dt>
              <dd className="font-medium text-gray-800">{formatDate(site.createdAt)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-[#1E3A5F]">{site._count.risks}</div>
          <div className="text-sm text-gray-500 mt-1">Risque{site._count.risks !== 1 ? "s" : ""} liés</div>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-[#1E3A5F]">{site._count.epiItems}</div>
          <div className="text-sm text-gray-500 mt-1">EPI liés</div>
        </div>
      </div>
    </div>
  );
}
