import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

// Reproduit le pattern de scoping utilisé par toutes les routes API
// (ex. app/api/risks/[id]/route.ts) : `findFirst({ where: { id, organizationId } })`.
// Ce test garantit qu'un identifiant de ressource connu d'un tenant ne peut
// jamais être lu en fournissant l'organizationId d'un AUTRE tenant — c'est le
// coeur de la défense IDOR de l'application.

const suffix = `test-${Date.now()}`;
let orgA: { id: string };
let orgB: { id: string };
let riskInA: { id: string };

beforeAll(async () => {
  orgA = await db.organization.create({ data: { name: `Tenant A ${suffix}`, slug: `tenant-a-${suffix}` } });
  orgB = await db.organization.create({ data: { name: `Tenant B ${suffix}`, slug: `tenant-b-${suffix}` } });

  riskInA = await db.risk.create({
    data: {
      organizationId: orgA.id,
      hazardDescription: "Risque confidentiel du tenant A",
      grossFrequency: 3,
      grossGravity: 3,
      grossMastery: 1,
      grossRisk: 9,
      residualFrequency: 3,
      residualGravity: 3,
      residualMastery: 1,
      residualRisk: 9,
    },
  });
});

afterAll(async () => {
  await db.risk.deleteMany({ where: { id: riskInA.id } });
  await db.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await db.$disconnect();
});

describe("tenant isolation (IDOR) on organization-scoped resources", () => {
  it("a resource is readable when the correct organizationId is supplied", async () => {
    const found = await db.risk.findFirst({ where: { id: riskInA.id, organizationId: orgA.id } });
    expect(found).not.toBeNull();
    expect(found!.hazardDescription).toEqual("Risque confidentiel du tenant A");
  });

  it("the same resource id is invisible when scoped to a different tenant", async () => {
    const found = await db.risk.findFirst({ where: { id: riskInA.id, organizationId: orgB.id } });
    expect(found).toBeNull();
  });

  it("listing risks for tenant B never includes tenant A's data", async () => {
    const risksForB = await db.risk.findMany({ where: { organizationId: orgB.id } });
    expect(risksForB.find((r) => r.id === riskInA.id)).toBeUndefined();
  });
});
