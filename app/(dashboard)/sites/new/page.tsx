"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SiteFormData {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
}

export default function NewSitePage() {
  const router = useRouter();

  const [form, setForm] = useState<SiteFormData>({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: Partial<SiteFormData> = { name: form.name };
      if (form.address) payload.address = form.address;
      if (form.city) payload.city = form.city;
      if (form.postalCode) payload.postalCode = form.postalCode;
      if (form.phone) payload.phone = form.phone;

      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de la création");
      }

      router.push("/sites");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = cn(
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent",
    "transition"
  );

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href="/sites" className="text-sm text-[#1E3A5F] hover:underline flex items-center gap-1">
          ← Retour aux sites
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Nouveau site</h1>
        <p className="text-gray-500 text-sm mb-8">
          Ajoutez un site à votre organisation.
        </p>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom du site <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Ex : Siège social, Usine Nord..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              placeholder="123 rue de la Paix"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Code postal
              </label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={form.postalCode}
                onChange={handleChange}
                placeholder="75001"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                Ville
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                placeholder="Paris"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="01 23 45 67 89"
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex-1 bg-[#1E3A5F] text-white rounded-lg px-6 py-2.5 text-sm font-semibold",
                "hover:bg-[#162d4a] transition",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading ? "Création en cours..." : "Créer le site"}
            </button>
            <Link
              href="/sites"
              className={cn(
                "flex-1 text-center rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700",
                "hover:bg-gray-50 transition"
              )}
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
