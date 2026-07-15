"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 429) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F33] to-[#145B8C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">PREUVIA DUERP</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-[#0B1F33] mb-1">Mot de passe oublié</h1>
          <p className="text-gray-500 text-sm mb-6">
            Indiquez votre adresse e-mail : si un compte existe, vous recevrez un lien de réinitialisation valable 1 heure.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {sent ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Si un compte existe pour cette adresse, un e-mail vient d&apos;être envoyé.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#145B8C] focus:border-transparent transition"
                  placeholder="nom@entreprise.fr"
                  required
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#145B8C] text-white py-2.5 rounded-lg font-medium text-sm hover:bg-[#0B1F33] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : "Envoyer le lien"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/login" className="text-[#145B8C] font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
