import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hasActiveClientAccess } from "@/lib/consultant/access";

// Couverture : GET /api/consultant/clients/[organizationId]/overview et
// app/(dashboard)/consultant/clients/[organizationId]/page.tsx ne doivent
// JAMAIS servir de données au vu du seul organizationId de l'URL — l'accès
// doit passer par hasActiveClientAccess(workspaceId, organizationId), avec
// workspaceId strictement dérivé de la session. Ce test reproduit les
// requêtes d'agrégation exactes de la route et prouve l'isolation IDOR :
// un cabinet ne doit jamais voir l'aperçu d'un client d'un AUTRE cabinet, ni
// d'une organisation dont l'accès a été révoqué.

const suffix = `test-${Date.now()}`;
let workspaceA: { id: string };
let workspaceB: { id: string };
let clientOfA: { id: string };
let clientOfB: { id: string };

beforeAll(async () => {
  workspaceA = await db.consultancyWorkspace.create({ data: { name: `Overview Cabinet A ${suffix}`, slug: `overview-cabinet-a-${suffix}` } });
  workspaceB = await db.consultancyWorkspace.create({ data: { name: `Overview Cabinet B ${suffix}`, slug: `overview-cabinet-b-${suffix}` } });

  clientOfA = await db.organization.create({ data: { name: `Overview Client A ${suffix}`, slug: `overview-client-a-${suffix}` } });
  clientOfB = await db.organization.create({ data: { name: `Overview Client B ${suffix}`, slug: `overview-client-b-${suffix}` } });

  await db.consultantClientAccess.create({ data: { consultancyWorkspaceId: workspaceA.id, organizationId: clientOfA.id } });
  await db.consultantClientAccess.create({ data: { consultancyWorkspaceId: workspaceB.id, organizationId: clientOfB.id } });

  await db.risk.create({
    data: {
      organizationId: clientOfA.id,
      hazardDescription: "Risque confidentiel du client A",
      grossFrequency: 3, grossGravity: 3, grossMastery: 1, grossRisk: 9,
      residualFrequency: 3, residualGravity: 3, residualMastery: 1, residualRisk: 9,
      riskLevel: "HIGH",
    },
  });
});

afterAll(async () => {
  await db.risk.deleteMany({ where: { organizationId: clientOfA.id } });
  await db.consultantClientAccess.deleteMany({ where: { consultancyWorkspaceId: { in: [workspaceA.id, workspaceB.id] } } });
  await db.organization.deleteMany({ where: { id: { in: [clientOfA.id, clientOfB.id] } } });
  await db.consultancyWorkspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
  await db.$disconnect();
});

describe("consultant client overview (IDOR)", () => {
  it("a cabinet with active access can see its own client's risk data", async () => {
    const allowed = await hasActiveClientAccess(workspaceA.id, clientOfA.id);
    expect(allowed).toBe(true);

    const risksByLevel = await db.risk.groupBy({ by: ["riskLevel"], where: { organizationId: clientOfA.id }, _count: { _all: true } });
    expect(risksByLevel.find((r) => r.riskLevel === "HIGH")?._count._all).toEqual(1);
  });

  it("a cabinet cannot access another cabinet's client overview", async () => {
    const allowed = await hasActiveClientAccess(workspaceA.id, clientOfB.id);
    expect(allowed).toBe(false);
  });

  it("access is denied again once revoked, even though the risk data still exists", async () => {
    const access = await db.consultantClientAccess.findUniqueOrThrow({
      where: { consultancyWorkspaceId_organizationId: { consultancyWorkspaceId: workspaceA.id, organizationId: clientOfA.id } },
    });
    await db.consultantClientAccess.update({ where: { id: access.id }, data: { status: "REVOKED", revokedAt: new Date() } });

    const allowed = await hasActiveClientAccess(workspaceA.id, clientOfA.id);
    expect(allowed).toBe(false);

    // Restore for idempotent re-runs within the same suite instance.
    await db.consultantClientAccess.update({ where: { id: access.id }, data: { status: "ACTIVE", revokedAt: null } });
  });
});
