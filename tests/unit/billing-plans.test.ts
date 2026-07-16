import { afterEach, describe, expect, it } from "vitest";
import { PLANS, buildCheckoutUrl, getPaymentLink, getPriceId, resolvePlanFromPriceId } from "@/lib/billing/plans";

const OFFICIAL_LINKS: Record<"ESSENTIEL" | "PILOTAGE" | "MAITRISE" | "PARTNER", string> = {
  ESSENTIEL: "https://buy.stripe.com/7sYbJ15FA2J75RMeQy5os00",
  PILOTAGE: "https://buy.stripe.com/eVq28r1pkfvTeoi37Q5os01",
  MAITRISE: "https://buy.stripe.com/aFa7sLc3Y1F3bc6eQy5os02",
  PARTNER: "https://buy.stripe.com/bJe00j6JEcjH4NI7o65os03",
};

describe("official Stripe Payment Links", () => {
  it.each(Object.entries(OFFICIAL_LINKS))("PLANS.%s uses the exact official link", (planId, expected) => {
    expect(PLANS[planId as keyof typeof PLANS].defaultPaymentLink).toEqual(expected);
  });

  it("Diagnostic and Enterprise have no Payment Link (free / quote-based)", () => {
    expect(getPaymentLink("DIAGNOSTIC")).toBeNull();
    expect(getPaymentLink("ENTERPRISE")).toBeNull();
  });
});

describe("buildCheckoutUrl", () => {
  it("never alters the base official link", () => {
    for (const planId of Object.keys(OFFICIAL_LINKS) as (keyof typeof OFFICIAL_LINKS)[]) {
      const url = buildCheckoutUrl(planId, { organizationId: "org_123", email: "test@example.com" });
      expect(url).not.toBeNull();
      expect(url!.startsWith(OFFICIAL_LINKS[planId])).toBe(true);
    }
  });

  it("appends client_reference_id for tenant reconciliation", () => {
    const url = buildCheckoutUrl("ESSENTIEL", { organizationId: "org_abc123" });
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("client_reference_id")).toEqual("org_abc123");
  });

  it("appends prefilled_email only when an email is provided", () => {
    const withEmail = new URL(buildCheckoutUrl("PILOTAGE", { organizationId: "org_1", email: "a@b.fr" })!);
    expect(withEmail.searchParams.get("prefilled_email")).toEqual("a@b.fr");

    const withoutEmail = new URL(buildCheckoutUrl("PILOTAGE", { organizationId: "org_1" })!);
    expect(withoutEmail.searchParams.has("prefilled_email")).toBe(false);
  });

  it("returns null for non-payable plans", () => {
    expect(buildCheckoutUrl("DIAGNOSTIC", { organizationId: "org_1" })).toBeNull();
    expect(buildCheckoutUrl("ENTERPRISE", { organizationId: "org_1" })).toBeNull();
  });
});

// Régression : le webhook Stripe (checkout.session.completed /
// customer.subscription.updated) doit retrouver le plan payé à partir du
// Price ID de la ligne achetée, faute de quoi Subscription.plan reste à sa
// valeur par défaut (DIAGNOSTIC) même après un paiement réel — un client
// payant PILOTAGE resterait plafonné aux limites du plan gratuit.
describe("resolvePlanFromPriceId", () => {
  const ENV_VARS = [
    "STRIPE_PRICE_ID_ESSENTIEL",
    "STRIPE_PRICE_ID_PILOTAGE",
    "STRIPE_PRICE_ID_MAITRISE",
    "STRIPE_PRICE_ID_PARTNER",
  ] as const;
  const originalValues = ENV_VARS.map((key) => [key, process.env[key]] as const);

  afterEach(() => {
    for (const [key, value] of originalValues) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("maps a configured Price ID back to its plan", () => {
    process.env.STRIPE_PRICE_ID_PILOTAGE = "price_pilotage_test";
    expect(getPriceId("PILOTAGE")).toEqual("price_pilotage_test");
    expect(resolvePlanFromPriceId("price_pilotage_test")).toEqual("PILOTAGE");
  });

  it("returns null for an unknown Price ID rather than guessing a plan", () => {
    process.env.STRIPE_PRICE_ID_PILOTAGE = "price_pilotage_test";
    expect(resolvePlanFromPriceId("price_completely_unknown")).toBeNull();
  });

  it("returns null when no Price ID is configured at all", () => {
    for (const key of ENV_VARS) delete process.env[key];
    expect(resolvePlanFromPriceId("price_pilotage_test")).toBeNull();
  });

  it("returns null for a null/undefined Price ID", () => {
    expect(resolvePlanFromPriceId(null)).toBeNull();
    expect(resolvePlanFromPriceId(undefined)).toBeNull();
  });

  it("DIAGNOSTIC and ENTERPRISE never have a configurable Price ID (free / quote-based)", () => {
    expect(PLANS.DIAGNOSTIC.priceIdEnvVar).toBeNull();
    expect(PLANS.ENTERPRISE.priceIdEnvVar).toBeNull();
    expect(getPriceId("DIAGNOSTIC")).toBeNull();
    expect(getPriceId("ENTERPRISE")).toBeNull();
  });
});
