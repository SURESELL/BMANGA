import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, CreditCard, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { SUBSCRIPTION_PLANS } from "@/types";
import { PAYABLE_PLAN_IDS, buildCheckoutUrl, type PlanId } from "@/lib/billing/plans";

export const metadata = { title: "Abonnement" };

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  FREE: { label: "Gratuit", className: "bg-gray-100 text-gray-700" },
  PENDING_PAYMENT: { label: "Paiement en attente", className: "bg-yellow-100 text-yellow-700" },
  ACTIVE: { label: "Actif", className: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "Impayé", className: "bg-orange-100 text-orange-700" },
  GRACE_PERIOD: { label: "Délai de grâce", className: "bg-orange-100 text-orange-700" },
  SUSPENDED: { label: "Suspendu", className: "bg-red-100 text-red-700" },
  CANCELED: { label: "Résilié", className: "bg-gray-100 text-gray-500" },
  EXPIRED: { label: "Expiré", className: "bg-red-100 text-red-700" },
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const subscription = orgId
    ? await db.subscription.findUnique({ where: { organizationId: orgId } })
    : null;
  const userEmail = session.user.email ?? undefined;

  const currentPlan = (subscription?.plan ?? "DIAGNOSTIC") as keyof typeof SUBSCRIPTION_PLANS;
  const planInfo = SUBSCRIPTION_PLANS[currentPlan];
  const statusInfo = STATUS_LABELS[subscription?.status ?? "FREE"];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez votre abonnement PREUVIA DUERP</p>
      </div>

      {/* Current plan */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-gray-900">Plan actuel : {planInfo.label}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {planInfo.price === 0 || planInfo.price === null ? (planInfo.price === null ? "Sur devis" : "Gratuit") : `${planInfo.price}€/mois HT`}
              {" — "}
              {planInfo.seats === -1 ? "Utilisateurs illimités (politique d'usage raisonnable)" : `${planInfo.seats} utilisateurs`}
            </p>
            {subscription?.currentPeriodEnd && (
              <p className="text-xs text-gray-400 mt-1">
                Prochain renouvellement : {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plans comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
          const planId = key as PlanId;
          const isCurrent = key === currentPlan;
          const checkoutUrl =
            PAYABLE_PLAN_IDS.includes(planId) && orgId
              ? buildCheckoutUrl(planId, { organizationId: orgId, email: userEmail })
              : null;

          return (
            <div key={key} className={`border rounded-xl p-5 ${isCurrent ? "border-[#145B8C] ring-2 ring-[#145B8C]/20" : "border-gray-200"}`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900 text-sm">{plan.label}</h3>
                {isCurrent && <span className="text-xs bg-[#145B8C] text-white px-2 py-0.5 rounded-full">Actuel</span>}
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-0.5">
                {plan.price === null ? "Devis" : plan.price === 0 ? "Gratuit" : `${plan.price}€`}
              </p>
              {typeof plan.price === "number" && plan.price > 0 && <p className="text-xs text-gray-400 mb-3">/mois HT</p>}
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
              {!isCurrent && checkoutUrl && (
                <a
                  href={checkoutUrl}
                  className="block text-center w-full mt-4 border border-[#145B8C] text-[#145B8C] py-2 rounded-lg text-sm font-medium hover:bg-[#145B8C] hover:text-white transition-colors"
                >
                  Choisir (paiement test)
                </a>
              )}
              {!isCurrent && !checkoutUrl && planId === "ENTERPRISE" && (
                <Link
                  href="/devis"
                  className="block text-center w-full mt-4 border border-[#145B8C] text-[#145B8C] py-2 rounded-lg text-sm font-medium hover:bg-[#145B8C] hover:text-white transition-colors"
                >
                  Demander un devis
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment method */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Moyen de paiement et factures</h2>
          {subscription?.stripeCustomerId && (
            <form action="/api/billing/portal" method="POST">
              <button type="submit" className="text-sm text-[#145B8C] hover:underline">
                Ouvrir le portail client Stripe
              </button>
            </form>
          )}
        </div>
        {subscription?.stripeCustomerId ? (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-gray-500" />
            </div>
            <p>Moyen de paiement géré par Stripe. Utilisez le portail client pour le consulter ou le modifier.</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Aucun abonnement payant actif — aucun moyen de paiement enregistré.
          </div>
        )}
      </div>
    </div>
  );
}
