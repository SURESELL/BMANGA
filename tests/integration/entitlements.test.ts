import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { checkSiteLimit, checkUserLimit } from "@/lib/billing/entitlements";

const suffix = `test-${Date.now()}`;

let diagnosticOrg: { id: string };
let essentielOrg: { id: string };
let partnerOrg: { id: string };
const createdSiteIds: string[] = [];
const createdUserIds: string[] = [];

beforeAll(async () => {
  diagnosticOrg = await db.organization.create({ data: { name: `Diagnostic Org ${suffix}`, slug: `diagnostic-org-${suffix}` } });
  essentielOrg = await db.organization.create({ data: { name: `Essentiel Org ${suffix}`, slug: `essentiel-org-${suffix}` } });
  partnerOrg = await db.organization.create({ data: { name: `Partner Org ${suffix}`, slug: `partner-org-${suffix}` } });

  await db.subscription.create({ data: { organizationId: diagnosticOrg.id, plan: "DIAGNOSTIC", status: "FREE" } });
  await db.subscription.create({ data: { organizationId: essentielOrg.id, plan: "ESSENTIEL", status: "ACTIVE" } });
  await db.subscription.create({ data: { organizationId: partnerOrg.id, plan: "PARTNER", status: "ACTIVE" } });

  // DIAGNOSTIC limit is 1 site / 3 users — fill it to the limit.
  const site = await db.site.create({ data: { organizationId: diagnosticOrg.id, name: "Site unique" } });
  createdSiteIds.push(site.id);

  for (let i = 0; i < 3; i++) {
    const user = await db.user.create({
      data: { email: `diag-user-${i}-${suffix}@preuvia.test`, organizationId: diagnosticOrg.id, isActive: true },
    });
    createdUserIds.push(user.id);
  }

  // ESSENTIEL limit is 1 site — already at the cap too.
  const essentielSite = await db.site.create({ data: { organizationId: essentielOrg.id, name: "Site Essentiel" } });
  createdSiteIds.push(essentielSite.id);
});

afterAll(async () => {
  await db.site.deleteMany({ where: { id: { in: createdSiteIds } } });
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await db.subscription.deleteMany({ where: { organizationId: { in: [diagnosticOrg.id, essentielOrg.id, partnerOrg.id] } } });
  await db.organization.deleteMany({ where: { id: { in: [diagnosticOrg.id, essentielOrg.id, partnerOrg.id] } } });
  await db.$disconnect();
});

describe("checkSiteLimit", () => {
  it("blocks a DIAGNOSTIC org from creating a second site (limit 1)", async () => {
    const result = await checkSiteLimit(diagnosticOrg.id);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(1);
    expect(result.current).toBe(1);
  });

  it("blocks an ESSENTIEL org from creating a second site (limit 1)", async () => {
    const result = await checkSiteLimit(essentielOrg.id);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(1);
  });

  it("never limits a PARTNER org (unlimited sites)", async () => {
    const result = await checkSiteLimit(partnerOrg.id);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });

  it("defaults to DIAGNOSTIC limits when an organization has no subscription row", async () => {
    const orphanOrg = await db.organization.create({ data: { name: `Orphan Org ${suffix}`, slug: `orphan-org-${suffix}` } });
    try {
      const result = await checkSiteLimit(orphanOrg.id);
      expect(result.allowed).toBe(true); // 0 sites yet, limit 1
      expect(result.limit).toBe(1);
    } finally {
      await db.organization.delete({ where: { id: orphanOrg.id } });
    }
  });
});

describe("checkUserLimit", () => {
  it("blocks a DIAGNOSTIC org from activating a 4th user (limit 3)", async () => {
    const result = await checkUserLimit(diagnosticOrg.id);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(3);
    expect(result.current).toBe(3);
  });

  it("never limits an ESSENTIEL org (unlimited users, reasonable-use policy)", async () => {
    const result = await checkUserLimit(essentielOrg.id);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });
});
