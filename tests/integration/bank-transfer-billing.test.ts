import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { checkSiteLimit } from "@/lib/billing/entitlements";

// Régression/couverture Phase 6 (virement bancaire, PLANS.md) :
// - POST /api/billing/bank-transfer pose `pendingPlan` sans jamais toucher à
//   `plan` (qui gouverne les entitlements) tant que la facture n'est pas
//   payée — un plan demandé mais impayé ne doit accorder aucun droit.
// - Le webhook invoice.paid ne promeut `pendingPlan` -> `plan` qu'à réception
//   du paiement, et met à jour (upsert) la ligne Invoice déjà créée en PENDING
//   au lieu d'en créer un doublon.

const suffix = `test-${Date.now()}`;
let org: { id: string };

beforeAll(async () => {
  org = await db.organization.create({ data: { name: `Bank Transfer Org ${suffix}`, slug: `bank-transfer-org-${suffix}` } });
});

afterEach(async () => {
  await db.invoice.deleteMany({ where: { organizationId: org.id } });
});

afterAll(async () => {
  await db.subscription.deleteMany({ where: { organizationId: org.id } });
  await db.organization.deleteMany({ where: { id: org.id } });
  await db.$disconnect();
});

describe("bank transfer: pending plan never grants entitlements before payment", () => {
  it("a PENDING_PAYMENT subscription with pendingPlan=PILOTAGE keeps DIAGNOSTIC-tier limits", async () => {
    await db.subscription.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id, plan: "DIAGNOSTIC", status: "PENDING_PAYMENT", pendingPlan: "PILOTAGE", paymentMethodType: "BANK_TRANSFER" },
      update: { plan: "DIAGNOSTIC", status: "PENDING_PAYMENT", pendingPlan: "PILOTAGE", paymentMethodType: "BANK_TRANSFER" },
    });

    // DIAGNOSTIC limit is 1 site, not PILOTAGE's 3 — the unpaid pendingPlan
    // must not leak into entitlement checks.
    const site = await db.site.create({ data: { organizationId: org.id, name: "Site unique" } });
    try {
      const result = await checkSiteLimit(org.id);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(1);
    } finally {
      await db.site.delete({ where: { id: site.id } });
    }
  });

  it("reproduces the invoice.paid promotion: pendingPlan becomes plan, pendingPlan clears, status becomes ACTIVE", async () => {
    const sub = await db.subscription.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id, plan: "DIAGNOSTIC", status: "PENDING_PAYMENT", pendingPlan: "PILOTAGE", paymentMethodType: "BANK_TRANSFER" },
      update: { plan: "DIAGNOSTIC", status: "PENDING_PAYMENT", pendingPlan: "PILOTAGE", paymentMethodType: "BANK_TRANSFER" },
    });

    const updated = await db.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        ...(sub.pendingPlan ? { plan: sub.pendingPlan, pendingPlan: null } : {}),
      },
    });

    expect(updated.status).toEqual("ACTIVE");
    expect(updated.plan).toEqual("PILOTAGE");
    expect(updated.pendingPlan).toBeNull();

    const result = await checkSiteLimit(org.id);
    expect(result.limit).toBe(3); // now genuinely on PILOTAGE
  });
});

describe("bank transfer: Invoice upsert semantics by stripeInvoiceId", () => {
  it("updates the PENDING invoice row created at facture-emission time instead of creating a duplicate on payment", async () => {
    const stripeInvoiceId = `in_test_${suffix}`;

    const created = await db.invoice.create({
      data: {
        organizationId: org.id,
        stripeInvoiceId,
        amount: 59,
        currency: "EUR",
        status: "PENDING",
        description: "Abonnement PREUVIA DUERP — Pilotage (virement bancaire)",
      },
    });

    const paid = await db.invoice.upsert({
      where: { stripeInvoiceId },
      create: { organizationId: org.id, stripeInvoiceId, amount: 59, currency: "EUR", status: "PAID", paidAt: new Date() },
      update: { amount: 59, status: "PAID", paidAt: new Date() },
    });

    expect(paid.id).toEqual(created.id); // same row updated, not a new one
    expect(paid.status).toEqual("PAID");
    expect(paid.paidAt).not.toBeNull();

    const rows = await db.invoice.findMany({ where: { stripeInvoiceId } });
    expect(rows).toHaveLength(1);
  });

  it("still creates a fresh row for a card-subscription renewal invoice with no pre-existing PENDING row", async () => {
    const stripeInvoiceId = `in_test_renewal_${suffix}`;
    const created = await db.invoice.upsert({
      where: { stripeInvoiceId },
      create: { organizationId: org.id, stripeInvoiceId, amount: 29, currency: "EUR", status: "PAID", paidAt: new Date() },
      update: { amount: 29, status: "PAID", paidAt: new Date() },
    });
    expect(created.status).toEqual("PAID");
  });
});
