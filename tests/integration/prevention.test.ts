import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

// Couverture Phase 4 (PLANS.md) : isolation multi-tenant des fiches de
// poste et communications sécurité, et logique de publication d'une
// communication (distincte d'une simple édition — voir
// app/api/safety-communications/[id]/route.ts).

const suffix = `test-${Date.now()}`;
let orgA: { id: string };
let orgB: { id: string };
let sheetA: { id: string };
let commA: { id: string };

beforeAll(async () => {
  orgA = await db.organization.create({ data: { name: `Prevention Org A ${suffix}`, slug: `prevention-org-a-${suffix}` } });
  orgB = await db.organization.create({ data: { name: `Prevention Org B ${suffix}`, slug: `prevention-org-b-${suffix}` } });

  sheetA = await db.jobRiskSheet.create({ data: { organizationId: orgA.id, jobTitle: `Poste confidentiel ${suffix}` } });
  commA = await db.safetyCommunication.create({
    data: { organizationId: orgA.id, type: "FLASH", title: `Flash confidentiel ${suffix}`, content: "Consignes internes" },
  });
});

afterAll(async () => {
  await db.jobRiskSheet.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await db.safetyCommunication.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await db.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await db.$disconnect();
});

describe("job risk sheets tenant isolation (IDOR)", () => {
  it("a sheet is visible when scoped to its owning organization", async () => {
    const found = await db.jobRiskSheet.findFirst({ where: { id: sheetA.id, organizationId: orgA.id } });
    expect(found).not.toBeNull();
  });

  it("the same sheet is invisible when scoped to a different organization", async () => {
    const found = await db.jobRiskSheet.findFirst({ where: { id: sheetA.id, organizationId: orgB.id } });
    expect(found).toBeNull();
  });
});

describe("safety communications: publish/unpublish and isolation", () => {
  it("a communication is created unpublished by default", async () => {
    expect(commA.publishedAt).toBeNull();
  });

  it("publishing sets publishedAt; unpublishing clears it back to null", async () => {
    const published = await db.safetyCommunication.update({ where: { id: commA.id }, data: { publishedAt: new Date() } });
    expect(published.publishedAt).not.toBeNull();

    const unpublished = await db.safetyCommunication.update({ where: { id: commA.id }, data: { publishedAt: null } });
    expect(unpublished.publishedAt).toBeNull();
  });

  it("a published-only query never returns another organization's communications", async () => {
    await db.safetyCommunication.update({ where: { id: commA.id }, data: { publishedAt: new Date() } });

    const visibleToB = await db.safetyCommunication.findMany({
      where: { organizationId: orgB.id, publishedAt: { not: null } },
    });
    expect(visibleToB.find((c) => c.id === commA.id)).toBeUndefined();

    const visibleToA = await db.safetyCommunication.findMany({
      where: { organizationId: orgA.id, publishedAt: { not: null } },
    });
    expect(visibleToA.find((c) => c.id === commA.id)).toBeDefined();
  });
});
