import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, generateTemporaryPassword } from "@/lib/password";

// Régression/couverture : avant cette fonctionnalité, rien dans le dépôt ne
// pouvait jamais créer une ConsultancyWorkspace ni assigner
// User.consultancyWorkspaceId — l'espace consultant était donc inaccessible
// en pratique. De même, POST /api/consultant/clients créait une Organization
// mais AUCUN utilisateur pour s'y connecter. Ces tests reproduisent la
// logique métier des deux routes qui comblent ce vide
// (POST /api/admin/consultancy-workspaces et POST /api/consultant/clients)
// directement contre la base, comme le reste de la suite d'intégration.

const suffix = `test-${Date.now()}`;
let workspace: Awaited<ReturnType<typeof db.consultancyWorkspace.create>>;
let clientOrg: Awaited<ReturnType<typeof db.organization.create>>;
let clientAdmin: Awaited<ReturnType<typeof db.user.create>>;
let consultantOwner: Awaited<ReturnType<typeof db.user.create>>;

afterAll(async () => {
  await db.consultantClientAccess.deleteMany({ where: { consultancyWorkspaceId: workspace.id } });
  await db.subscription.deleteMany({ where: { organizationId: clientOrg.id } });
  await db.user.deleteMany({ where: { id: { in: [clientAdmin.id, consultantOwner.id] } } });
  await db.organization.deleteMany({ where: { id: clientOrg.id } });
  await db.consultancyWorkspace.deleteMany({ where: { id: workspace.id } });
  await db.$disconnect();
});

describe("consultancy workspace provisioning", () => {
  it("creates a workspace with its owner as a CONSULTANT user carrying a working temporary password", async () => {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const result = await db.$transaction(async (tx) => {
      const ws = await tx.consultancyWorkspace.create({
        data: { name: `Cabinet Test ${suffix}`, slug: `cabinet-test-${suffix}` },
      });
      const owner = await tx.user.create({
        data: {
          email: `owner-${suffix}@preuvia.test`,
          role: "CONSULTANT",
          consultancyWorkspaceId: ws.id,
          passwordHash,
          mustChangePassword: true,
          passwordExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });
      return { ws, owner };
    });

    workspace = result.ws;
    consultantOwner = result.owner;

    expect(consultantOwner.consultancyWorkspaceId).toEqual(workspace.id);
    expect(consultantOwner.mustChangePassword).toBe(true);
    expect(consultantOwner.organizationId).toBeNull();
    await expect(verifyPassword(consultantOwner.passwordHash!, temporaryPassword)).resolves.toBe(true);
  });
});

describe("consultant client provisioning", () => {
  it("creating a client organization also creates a working ORG_ADMIN account for it", async () => {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const adminEmail = `client-admin-${suffix}@preuvia.test`;

    const result = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: `Client Test ${suffix}`, slug: `client-test-${suffix}` } });
      await tx.consultantClientAccess.create({
        data: { consultancyWorkspaceId: workspace.id, organizationId: org.id, grantedByUserId: consultantOwner.id },
      });
      await tx.subscription.create({ data: { organizationId: org.id, plan: "DIAGNOSTIC", status: "FREE" } });
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          role: "ORG_ADMIN",
          organizationId: org.id,
          passwordHash,
          mustChangePassword: true,
          passwordExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          createdByConsultantId: consultantOwner.id,
        },
      });
      return { org, admin };
    });

    clientOrg = result.org;
    clientAdmin = result.admin;

    expect(clientAdmin.organizationId).toEqual(clientOrg.id);
    expect(clientAdmin.role).toEqual("ORG_ADMIN");
    expect(clientAdmin.createdByConsultantId).toEqual(consultantOwner.id);
    await expect(verifyPassword(clientAdmin.passwordHash!, temporaryPassword)).resolves.toBe(true);

    const access = await db.consultantClientAccess.findUnique({
      where: { consultancyWorkspaceId_organizationId: { consultancyWorkspaceId: workspace.id, organizationId: clientOrg.id } },
    });
    expect(access?.status).toEqual("ACTIVE");
  });

  it("rejects provisioning a second account with an already-used email (unique constraint)", async () => {
    await expect(
      db.user.create({
        data: {
          email: clientAdmin.email, // already exists from the previous test
          role: "ORG_ADMIN",
          organizationId: clientOrg.id,
          passwordHash: await hashPassword("irrelevant"),
        },
      })
    ).rejects.toThrow();
  });
});
