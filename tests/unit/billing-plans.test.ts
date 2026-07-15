import { describe, expect, it } from "vitest";
import { PLANS, buildCheckoutUrl, getPaymentLink } from "@/lib/billing/plans";

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
