import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { resolvePlanFromPriceId } from "@/lib/billing/plans";

// Next.js App Router routes ne parsent pas le corps par défaut pour les
// Route Handlers — req.text() renvoie bien le corps brut nécessaire à la
// vérification de signature Stripe.
export const runtime = "nodejs";

const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.created",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
]);

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe non configuré sur cet environnement." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature invalide", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  // Idempotence : chaque event.id Stripe n'est traité qu'une fois, même si
  // Stripe le renvoie (retry réseau côté Stripe, redélivrance manuelle...).
  const existing = await db.webhookEvent.findUnique({ where: { eventId: event.id } });
  if (existing?.processedAt) {
    return NextResponse.json({ received: true, deduped: true });
  }

  const organizationId = extractOrganizationId(event);

  const webhookEvent = await db.webhookEvent.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      type: event.type,
      organizationId,
      payload: JSON.parse(JSON.stringify(event)),
    },
    update: {},
  });

  if (!RELEVANT_EVENTS.has(event.type)) {
    await db.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date() } });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    await handleEvent(event, stripe);
    await db.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await db.webhookEvent.update({ where: { id: webhookEvent.id }, data: { error: message } });
    console.error(`[stripe-webhook] échec traitement ${event.type}`, err);
    // 500 pour que Stripe retente automatiquement l'événement.
    return NextResponse.json({ error: "Échec du traitement." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function extractOrganizationId(event: Stripe.Event): string | undefined {
  const obj = event.data.object as unknown as Record<string, unknown>;
  const clientRef = obj["client_reference_id"];
  if (typeof clientRef === "string" && clientRef.length > 0) return clientRef;
  const metadata = obj["metadata"] as Record<string, unknown> | undefined;
  if (metadata && typeof metadata["organizationId"] === "string") return metadata["organizationId"] as string;
  return undefined;
}

async function handleEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.client_reference_id;
      if (!organizationId) {
        throw new Error(`checkout.session ${session.id} sans client_reference_id — rapprochement impossible.`);
      }

      const org = await db.organization.findUnique({ where: { id: organizationId } });
      if (!org) {
        throw new Error(`Organisation ${organizationId} introuvable pour checkout.session ${session.id}.`);
      }

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      // Les Payment Links Stripe (immuables, voir lib/billing/plans.ts) ne
      // portent aucune métadonnée de plan dans l'événement checkout.session —
      // seul le Price ID de la ligne achetée permet de savoir quel plan a été
      // payé. Sans ce rapprochement, `Subscription.plan` resterait à sa valeur
      // par défaut (DIAGNOSTIC) même après un paiement réel, plafonnant les
      // limites d'un client payant au niveau gratuit.
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;
      const resolvedPlan = resolvePlanFromPriceId(priceId);

      await db.subscription.upsert({
        where: { organizationId },
        create: {
          organizationId,
          status: "ACTIVE",
          plan: resolvedPlan ?? "DIAGNOSTIC",
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          paymentMethodType: "CARD",
        },
        update: {
          status: "ACTIVE",
          ...(resolvedPlan ? { plan: resolvedPlan } : {}),
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          paymentMethodType: "CARD",
        },
      });

      if (!resolvedPlan) {
        // Ne jamais assigner un plan au hasard : on active l'accès (le
        // paiement a bien eu lieu) mais on journalise pour rapprochement
        // manuel plutôt que de risquer de sous- ou sur-attribuer des droits.
        console.error(
          `[stripe-webhook] Price ID Stripe introuvable/non mappé pour checkout.session ${session.id} (priceId=${priceId ?? "absent"}) — plan non mis à jour, rapprochement manuel requis. Vérifier les variables STRIPE_PRICE_ID_*.`
        );
      }

      await db.auditLog.create({
        data: {
          organizationId,
          action: "SUBSCRIPTION_ACTIVATED",
          resource: "subscription",
          details: {
            stripeEventId: event.id,
            checkoutSessionId: session.id,
            resolvedPlan,
            priceId: priceId ?? null,
          },
        },
      });
      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.client_reference_id;
      if (organizationId) {
        await db.subscription.updateMany({
          where: { organizationId },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      // Depuis l'API Stripe 2025+, les dates de période sont portées par
      // chaque ligne d'abonnement (items), plus par l'objet Subscription.
      const item = sub.items.data[0];
      // Un changement de plan (upgrade/downgrade) se traduit par un nouveau
      // Price ID sur la ligne d'abonnement — sans ce rapprochement, une
      // organisation qui change d'offre garderait les limites de l'ancienne.
      const resolvedPlan = resolvePlanFromPriceId(item?.price?.id);
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: mapStripeSubscriptionStatus(sub.status),
          ...(resolvedPlan ? { plan: resolvedPlan } : {}),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodStart: item ? new Date(item.current_period_start * 1000) : undefined,
          currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : undefined,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELED" },
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const subscription = await db.subscription.findFirst({ where: { stripeCustomerId: customerId } });
        if (subscription) {
          await db.subscription.update({ where: { id: subscription.id }, data: { status: "ACTIVE" } });
          await db.invoice.create({
            data: {
              organizationId: subscription.organizationId,
              stripeInvoiceId: invoice.id,
              amount: (invoice.amount_paid ?? 0) / 100,
              currency: invoice.currency?.toUpperCase() ?? "EUR",
              status: "PAID",
              paidAt: new Date(),
              pdfUrl: invoice.invoice_pdf ?? undefined,
            },
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await db.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      console.info(`[stripe-webhook] remboursement charge=${charge.id} amount_refunded=${charge.amount_refunded}`);
      break;
    }

    default:
      break;
  }
}

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED" | "GRACE_PERIOD" {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete_expired":
      return "SUSPENDED";
    default:
      return "GRACE_PERIOD";
  }
}
