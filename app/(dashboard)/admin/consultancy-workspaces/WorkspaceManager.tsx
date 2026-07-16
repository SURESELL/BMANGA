"use client";

import { useState } from "react";
import { Briefcase, PlusCircle, Users } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  clientCount: number;
  members: { id: string; email: string; name: string | null }[];
}

interface CreateResult {
  name: string;
  owner: {
    email: string;
    temporaryPassword: string;
    temporaryPasswordExpiresAt: string;
  };
}

export function WorkspaceManager({ initialWorkspaces }: { initialWorkspaces: Workspace[] }) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    setCreateResult(null);

    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/consultancy-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          ownerEmail: fd.get("ownerEmail"),
          ownerName: (fd.get("ownerName") as string) || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Erreur lors de la création du cabinet");
      } else {
        setCreateResult(data);
        setWorkspaces((prev) => [
          {
            id: data.id,
            name: data.name,
            slug: data.slug,
            createdAt: data.createdAt,
            memberCount: 1,
            clientCount: 0,
            members: [{ id: data.owner.id, email: data.owner.email, name: null }],
          },
          ...prev,
        ]);
        (e.target as HTMLFormElement).reset();
      }
    } catch {
      setFormError("Erreur réseau");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#145B8C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Nouveau cabinet
        </button>
      </div>

      {createResult && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-2">
          <p className="text-sm font-semibold text-amber-900">
            Cabinet {createResult.name} créé — mot de passe temporaire de {createResult.owner.email} (affiché une seule fois)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 select-all">
              {createResult.owner.temporaryPassword}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(createResult.owner.temporaryPassword)}
              className="px-3 py-2 border border-amber-300 rounded-lg text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Copier
            </button>
          </div>
          <p className="text-xs text-amber-800">
            Transmettez ce mot de passe au consultant par un canal différent de cette page (pas par e-mail).
            Il expire le {new Date(createResult.owner.temporaryPasswordExpiresAt).toLocaleString("fr-FR")} et devra être changé à la première connexion.
            Il ne sera plus jamais affiché.
          </p>
          <button
            type="button"
            onClick={() => { setCreateResult(null); setShowForm(false); }}
            className="text-xs text-amber-900 underline hover:no-underline"
          >
            J&apos;ai noté le mot de passe, fermer
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-[#145B8C] rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Nouveau cabinet consultant</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du cabinet <span className="text-red-500">*</span></label>
              <input name="name" required placeholder="Ex: Cabinet QHSE Conseil" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du consultant principal</label>
              <input name="ownerName" placeholder="Marie Martin" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail du consultant principal <span className="text-red-500">*</span></label>
              <input name="ownerEmail" type="email" required placeholder="marie.martin@cabinet.fr" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
          </div>

          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{formError}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-[#145B8C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors disabled:opacity-60"
            >
              {creating ? "Création..." : "Créer le cabinet"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Cabinets</h2>
          <span className="text-xs text-gray-500">{workspaces.length} cabinet{workspaces.length > 1 ? "s" : ""}</span>
        </div>

        {workspaces.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun cabinet consultant provisionné</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {workspaces.map((w) => (
              <div key={w.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#145B8C]/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-[#145B8C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-400">{w.members[0]?.email ?? "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                  <Users className="w-3.5 h-3.5" /> {w.memberCount} · {w.clientCount} client{w.clientCount > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
