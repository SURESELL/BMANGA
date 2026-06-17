"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const STEPS = ["Compte", "Organisation", "Confirmation"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    orgName: "",
    orgSector: "",
    orgSize: "",
    acceptTerms: false,
  });

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 2) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    setStep(2);
    setLoading(false);
    setTimeout(() => router.push("/login"), 3000);
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] to-[#1E3A5F] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#0D1B2A] mb-2">Compte créé !</h2>
          <p className="text-gray-500 text-sm">Vérifiez votre email pour activer votre compte. Vous serez redirigé vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] to-[#1E3A5F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">NORMIA</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.slice(0, 2).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= step ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-400"
                }`}>{i + 1}</div>
                <span className={`text-xs ${i <= step ? "text-[#1E3A5F] font-medium" : "text-gray-400"}`}>{s}</span>
                {i < 1 && <div className={`flex-1 h-px mx-1 ${i < step ? "bg-[#1E3A5F]" : "bg-gray-200"}`} style={{ width: 20 }} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 0 && (
              <>
                <h1 className="text-xl font-bold text-[#0D1B2A] mb-4">Créer votre compte</h1>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                    <input type="text" value={form.firstName} onChange={(e) => update("firstName", e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                      placeholder="Jean" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                    <input type="text" value={form.lastName} onChange={(e) => update("lastName", e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                      placeholder="Dupont" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email professionnel</label>
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    placeholder="jean.dupont@entreprise.fr" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] pr-10"
                      placeholder="8+ caractères" minLength={8} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-xl font-bold text-[#0D1B2A] mb-4">Votre organisation</h1>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l&apos;entreprise</label>
                  <input type="text" value={form.orgName} onChange={(e) => update("orgName", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    placeholder="Mon Entreprise SAS" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Secteur d&apos;activité</label>
                  <select value={form.orgSector} onChange={(e) => update("orgSector", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
                    required>
                    <option value="">Sélectionner...</option>
                    <option value="INDUSTRIE">Industrie / Manufacture</option>
                    <option value="BTP">BTP / Construction</option>
                    <option value="ALIMENTAIRE">Agroalimentaire / Restauration</option>
                    <option value="LOGISTIQUE">Logistique / Transport</option>
                    <option value="SANTE">Santé / Médico-social</option>
                    <option value="SERVICES">Services</option>
                    <option value="COMMERCE">Commerce / Distribution</option>
                    <option value="AGRICULTURE">Agriculture</option>
                    <option value="FORMATION">Organisme de formation</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Effectif</label>
                  <select value={form.orgSize} onChange={(e) => update("orgSize", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
                    required>
                    <option value="">Sélectionner...</option>
                    <option value="1-9">1 à 9 salariés (TPE)</option>
                    <option value="10-49">10 à 49 salariés (PE)</option>
                    <option value="50-249">50 à 249 salariés (PME)</option>
                    <option value="250-999">250 à 999 salariés (ETI)</option>
                    <option value="1000+">1 000+ salariés (GE)</option>
                  </select>
                </div>
                <label className="flex items-start gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={form.acceptTerms} onChange={(e) => update("acceptTerms", e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[#1E3A5F]" required />
                  <span>J&apos;accepte les <Link href="/terms" className="text-[#1E3A5F] hover:underline">conditions d&apos;utilisation</Link> et la <Link href="/privacy" className="text-[#1E3A5F] hover:underline">politique de confidentialité</Link></span>
                </label>
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep((s) => s - 1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Retour
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : step === 1 ? "Créer mon compte" : "Continuer"}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-[#1E3A5F] font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
