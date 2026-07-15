import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe non configuré sur cet environnement." }, { status: 503 });
  }

  const subscription = await db.subscription.findUnique({ where: { organizationId: orgId } });
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "Aucun client Stripe associé à cette organisation." }, { status: 404 });
  }

  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.redirect(portalSession.url, { status: 303 });
}
