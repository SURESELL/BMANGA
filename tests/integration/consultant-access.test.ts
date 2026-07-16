import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getUserConsultancyWorkspaceId, hasActiveClientAccess, listAccessibleOrganizationIds } from "@/lib/consultant/access";

const suffix = `test-${Date.now()}`;

let workspaceA: { id: string };
let workspaceB: { id: string };
let clientOfA: { id: string };
let clientOfB: { id: string };
let consultantUserA: { id: string };

beforeAll(async () => {
  workspaceA = await db.consultancyWorkspace.create({ data: { name: `Cabinet A ${suffix}`, slug: `cabinet-a-${suffix}` } });
  workspaceB = await db.consultancyWorkspace.create({ data: { name: `Cabinet B ${suffix}`, slug: `cabinet-b-${suffix}` } });

  clientOfA = await db.organization.create({ data: { name: `Client A ${suffix}`, slug: `client-a-${suffix}` } });
  clientOfB = await db.organization.create({ data: { name: `Client B ${suffix}`, slug: `client-b-${suffix}` } });

  await db.consultantClientAccess.create({
    data: { consultancyWorkspaceId: workspaceA.id, organizationId: clientOfA.id },
  });
  await db.consultantClientAccess.create({
    data: { consultancyWorkspaceId: workspaceB.id, organizationId: clientOfB.id },
  });

  consultantUserA = await db.user.create({
    data: {
      email: `consultant-a-${suffix}@preuvia.test`,
      role: "CONSULTANT",
      consultancyWorkspaceId: workspaceA.id,
      passwordHash: "irrelevant-for-this-test",
    },
  });
});

afterAll(async () => {
  await db.consultantClientAccess.deleteMany({ where: { consultancyWorkspaceId: { in: [workspaceA.id, workspaceB.id] } } });
  await db.user.deleteMany({ where: { id: consultantUserA.id } });
  await db.organization.deleteMany({ where: { id: { in: [clientOfA.id, clientOfB.id] } } });
  await db.consultancyWorkspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
  await db.$disconnect();
});

describe("consultant multi-tenant isolation (IDOR)", () => {
  it("resolves the workspace strictly from the session-derived userId", async () => {
    const resolved = await getUserConsultancyWorkspaceId(consultantUserA.id);
    expect(resolved).toEqual(workspaceA.id);
  });

  it("grants access to a workspace's own client", async () => {
    await expect(hasActiveClientAccess(workspaceA.id, clientOfA.id)).resolves.toBe(true);
  });

  it("denies access to another cabinet's client (cross-tenant IDOR)", async () => {
    await expect(hasActiveClientAccess(workspaceA.id, clientOfB.id)).resolves.toBe(false);
    await expect(hasActiveClientAccess(workspaceB.id, clientOfA.id)).resolves.toBe(false);
  });

  it("listAccessibleOrganizationIds never leaks another cabinet's clients", async () => {
    const accessibleToA = await listAccessibleOrganizationIds(workspaceA.id);
    expect(accessibleToA).toContain(clientOfA.id);
    expect(accessibleToA).not.toContain(clientOfB.id);

    const accessibleToB = await listAccessibleOrganizationIds(workspaceB.id);
    expect(accessibleToB).toContain(clientOfB.id);
    expect(accessibleToB).not.toContain(clientOfA.id);
  });

  it("revoked access is no longer active", async () => {
    const access = await db.consultantClientAccess.findUniqueOrThrow({
      where: { consultancyWorkspaceId_organizationId: { consultancyWorkspaceId: workspaceA.id, organizationId: clientOfA.id } },
    });
    await db.consultantClientAccess.update({
      where: { id: access.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    await expect(hasActiveClientAccess(workspaceA.id, clientOfA.id)).resolves.toBe(false);
    const accessibleToA = await listAccessibleOrganizationIds(workspaceA.id);
    expect(accessibleToA).not.toContain(clientOfA.id);

    // Restore for potential re-runs within the same suite instance.
    await db.consultantClientAccess.update({ where: { id: access.id }, data: { status: "ACTIVE", revokedAt: null } });
  });
});
