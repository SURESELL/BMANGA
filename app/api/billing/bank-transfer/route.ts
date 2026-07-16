import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { PAYABLE_PLAN_IDS, PLANS, getPriceId, type PlanId } from "@/lib/billing/plans";
import type { UserRole } from "@/types";

/**
 * Initie un paiement par virement bancaire (Phase 6, PLANS.md) : émet une
 * facture Stripe (`collection_method: "send_invoice"`) au lieu de rediriger
 * vers un Payment Link carte. L'abonnement passe en PENDING_PAYMENT — il ne
 * devient ACTIVE, et le plan demandé (`pendingPlan`) n'est promu en `plan`,
 * qu'à réception du paiement via le webhook `invoice.paid`. Jamais
 * d'activation sur la simple création de la facture.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "billing", "create");
  if (forbidden) return forbidden;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe non configuré sur cet environnement." }, { status: 503 });
  }

  let body: { planId?: unknown };
  try {
    body = (await req.json()) as { planId?: unknown };
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  const planId = body.planId;
  if (typeof planId !== "string" || !PAYABLE_PLAN_IDS.includes(planId as PlanId)) {
    return NextResponse.json({ error: "Plan invalide ou non éligible au virement bancaire" }, { status: 400 });
  }

  const priceId = getPriceId(planId as PlanId);
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID Stripe non configuré pour le plan ${planId} (variable STRIPE_PRICE_ID_* absente).` },
      { status: 503 }
    );
  }

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });

  const userEmail = session.user.email ?? undefined;
  const stripe = getStripeClient();
  const existing = await db.subscription.findUnique({ where: { organizationId: orgId } });

  let customerId = existing?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      name: org.name,
      metadata: { organizationId: orgId },
    });
    customerId = customer.id;
  }

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 30,
    auto_advance: false,
    metadata: { organizationId: orgId, planId },
  });

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    pricing: { price: priceId },
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

  await db.subscription.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      status: "PENDING_PAYMENT",
      paymentMethodType: "BANK_TRANSFER",
      pendingPlan: planId as PlanId,
      stripeCustomerId: customerId,
    },
    update: {
      status: "PENDING_PAYMENT",
      paymentMethodType: "BANK_TRANSFER",
      pendingPlan: planId as PlanId,
      stripeCustomerId: customerId,
    },
  });

  await db.invoice.create({
    data: {
      organizationId: orgId,
      stripeInvoiceId: finalized.id,
      amount: (finalized.amount_due ?? 0) / 100,
      currency: finalized.currency?.toUpperCase() ?? "EUR",
      status: "PENDING",
      pdfUrl: finalized.invoice_pdf ?? undefined,
      description: `Abonnement PREUVIA DUERP — ${PLANS[planId as PlanId].name} (virement bancaire)`,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "BANK_TRANSFER_INVOICE_CREATED",
      resource: "subscription",
      details: { planId, stripeInvoiceId: finalized.id, amountDue: finalized.amount_due },
    },
  });

  return NextResponse.json(
    {
      invoiceId: finalized.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url,
      pdfUrl: finalized.invoice_pdf,
      amountDue: finalized.amount_due,
      currency: finalized.currency,
      dueDate: finalized.due_date,
    },
    { status: 201 }
  );
}
