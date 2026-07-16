"use client";

import { useState } from "react";
import { Building2, PlusCircle, Trash2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  siret: string | null;
  sector: string | null;
  accessGrantedAt: string;
}

interface CreateResult {
  name: string;
  admin: {
    email: string;
    temporaryPassword: string;
    temporaryPasswordExpiresAt: string;
  };
}

export function ConsultantPortfolio({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    setCreateResult(null);

    const fd = new FormData(e.currentTarget);
    const siret = (fd.get("siret") as string)?.trim();

    try {
      const res = await fetch("/api/consultant/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          siret: siret || undefined,
          sector: (fd.get("sector") as string) || undefined,
          adminEmail: fd.get("adminEmail"),
          adminName: (fd.get("adminName") as string) || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Erreur lors de la création du client");
      } else {
        setCreateResult(data);
        setClients((prev) => [
          { id: data.id, name: data.name, siret: data.siret, sector: data.sector, accessGrantedAt: new Date().toISOString() },
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

  async function handleRevoke(organizationId: string) {
    if (!confirm("Révoquer l'accès de votre cabinet à ce client ? Cette action est réversible uniquement en recréant un accès.")) return;
    setRevoking(organizationId);
    try {
      const res = await fetch(`/api/consultant/clients/${organizationId}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== organizationId));
      }
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#145B8C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {/* One-time temporary password display */}
      {createResult && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-2">
          <p className="text-sm font-semibold text-amber-900">
            Client {createResult.name} créé — mot de passe temporaire de {createResult.admin.email} (affiché une seule fois)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 select-all">
              {createResult.admin.temporaryPassword}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(createResult.admin.temporaryPassword)}
              className="px-3 py-2 border border-amber-300 rounded-lg text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Copier
            </button>
          </div>
          <p className="text-xs text-amber-800">
            Transmettez ce mot de passe au client par un canal différent de cette page (pas par e-mail).
            Il expire le {new Date(createResult.admin.temporaryPasswordExpiresAt).toLocaleString("fr-FR")} et devra être changé à la première connexion.
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

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-[#145B8C] rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Nouveau client</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Raison sociale <span className="text-red-500">*</span></label>
              <input name="name" required placeholder="Ex: Boulangerie Dupont SAS" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SIRET</label>
              <input name="siret" placeholder="14 chiffres" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Secteur</label>
              <input name="sector" placeholder="Ex: Restauration" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
            <div />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du contact administrateur</label>
              <input name="adminName" placeholder="Jean Dupont" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail administrateur <span className="text-red-500">*</span></label>
              <input name="adminEmail" type="email" required placeholder="jean.dupont@client.fr" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C]" />
            </div>
          </div>

          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{formError}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-[#145B8C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0B1F33] transition-colors disabled:opacity-60"
            >
              {creating ? "Création..." : "Créer le client"}
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

      {/* Clients list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Clients actifs</h2>
          <span className="text-xs text-gray-500">{clients.length} client{clients.length > 1 ? "s" : ""}</span>
        </div>

        {clients.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun client pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#145B8C]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#145B8C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-400">{client.sector ?? "Secteur non renseigné"}{client.siret ? ` · SIRET ${client.siret}` : ""}</p>
                </div>
                <button
                  onClick={() => handleRevoke(client.id)}
                  disabled={revoking === client.id}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 disabled:opacity-50 px-2 py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {revoking === client.id ? "..." : "Révoquer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
