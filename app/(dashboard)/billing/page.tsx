import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckCircle, CreditCard, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { SUBSCRIPTION_PLANS } from "@/types";

export const metadata = { title: "Abonnement" };

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const subscription = orgId
    ? await db.subscription.findUnique({ where: { organizationId: orgId } })
    : null;

  const currentPlan = subscription?.plan ?? "FREE";
  const planInfo = SUBSCRIPTION_PLANS[currentPlan];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez votre abonnement NORMIA</p>
      </div>

      {/* Current plan */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-gray-900">Plan actuel : {planInfo.label}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                subscription?.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                subscription?.status === "TRIALING" ? "bg-blue-100 text-blue-700" :
                "bg-red-100 text-red-700"
              }`}>
                {subscription?.status === "ACTIVE" ? "Actif" :
                 subscription?.status === "TRIALING" ? "Essai" : subscription?.status ?? "Inactif"}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {planInfo.price === 0 ? "Gratuit" : `${planInfo.price}€/mois HT`} — {planInfo.seats === -1 ? "Utilisateurs illimités" : `${planInfo.seats} utilisateurs`}
            </p>
            {subscription?.currentPeriodEnd && (
              <p className="text-xs text-gray-400 mt-1">
                Prochain renouvellement : {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
          {currentPlan !== "ENTERPRISE" && (
            <button className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
              Mettre à niveau
            </button>
          )}
        </div>
      </div>

      {/* Plans comparison */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
          <div key={key} className={`border rounded-xl p-5 ${key === currentPlan ? "border-[#1E3A5F] ring-2 ring-[#1E3A5F]/20" : "border-gray-200"}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">{plan.label}</h3>
              {key === currentPlan && <span className="text-xs bg-[#1E3A5F] text-white px-2 py-0.5 rounded-full">Actuel</span>}
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">
              {plan.price === 0 ? "Gratuit" : `${plan.price}€`}
            </p>
            {plan.price > 0 && <p className="text-xs text-gray-400 mb-3">/mois HT</p>}
            <ul className="space-y-1.5">
              <li className="flex items-center gap-1.5 text-xs text-gray-600">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                {plan.seats === -1 ? "Utilisateurs illimités" : `${plan.seats} utilisateurs`}
              </li>
              {plan.modules.map((mod) => (
                <li key={mod} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {mod === "all" ? "Tous les modules" : mod.toUpperCase()}
                </li>
              ))}
            </ul>
            {key !== currentPlan && (
              <button className="w-full mt-4 border border-[#1E3A5F] text-[#1E3A5F] py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A5F] hover:text-white transition-colors">
                Choisir
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment method */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Moyen de paiement</h2>
          <button className="text-sm text-[#1E3A5F] hover:underline">Modifier</button>
        </div>
        {subscription?.stripeCustomerId ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-900">•••• •••• •••• 4242</p>
              <p className="text-xs text-gray-400">Expire 12/26</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Aucun moyen de paiement enregistré
          </div>
        )}
      </div>
    </div>
  );
}
