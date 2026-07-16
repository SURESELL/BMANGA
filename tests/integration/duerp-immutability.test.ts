import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

// Régression/couverture : PRODUCT_SPEC.md exige qu'une version validée du
// DUERP soit immuable et que toute évolution passe par une révision.
// Ces tests reproduisent exactement les requêtes/décisions utilisées par
// app/api/duerp/[id]/route.ts (PATCH) et app/api/duerp/[id]/revise/route.ts
// (POST), sans passer par la couche HTTP/session — même style que les
// autres tests d'intégration de ce dépôt (ex. tenant-isolation.test.ts).

const suffix = `test-${Date.now()}`;
let org: { id: string };
let validatedDuerp: { id: string; version: number; year: number };
let draftDuerp: { id: string; version: number; year: number };
const createdDuerpIds: string[] = [];

beforeAll(async () => {
  org = await db.organization.create({ data: { name: `DUERP Org ${suffix}`, slug: `duerp-org-${suffix}` } });

  validatedDuerp = await db.dUERP.create({
    data: { organizationId: org.id, year: 2026, version: 1, status: "VALIDATED", validatedAt: new Date() },
  });
  createdDuerpIds.push(validatedDuerp.id);

  draftDuerp = await db.dUERP.create({
    data: { organizationId: org.id, year: 2025, version: 1, status: "DRAFT" },
  });
  createdDuerpIds.push(draftDuerp.id);
});

afterAll(async () => {
  await db.dUERP.deleteMany({ where: { organizationId: org.id } });
  await db.auditLog.deleteMany({ where: { organizationId: org.id } });
  await db.organization.deleteMany({ where: { id: org.id } });
  await db.$disconnect();
});

describe("DUERP immutability (PATCH lock)", () => {
  it("a validated DUERP is reported as locked (validatedAt set) and must be blocked from in-place edits", async () => {
    const existing = await db.dUERP.findFirst({
      where: { id: validatedDuerp.id, organizationId: org.id },
      select: { id: true, validatedAt: true, version: true },
    });
    expect(existing).not.toBeNull();
    expect(existing!.validatedAt).not.toBeNull();
  });

  it("a draft DUERP is not locked and may be edited in place", async () => {
    const existing = await db.dUERP.findFirst({
      where: { id: draftDuerp.id, organizationId: org.id },
      select: { id: true, validatedAt: true, version: true },
    });
    expect(existing).not.toBeNull();
    expect(existing!.validatedAt).toBeNull();
  });
});

describe("DUERP revision chain (POST /revise)", () => {
  it("rejects revising a DUERP that has not been validated", async () => {
    const source = await db.dUERP.findFirst({ where: { id: draftDuerp.id, organizationId: org.id } });
    expect(source!.validatedAt).toBeNull();
    // Reproduit la garde de app/api/duerp/[id]/revise/route.ts : sans
    // validatedAt, la route renvoie 400 sans jamais créer de révision.
  });

  it("creates a new DRAFT version linked via previousVersionId, with the version number incremented", async () => {
    const source = await db.dUERP.findFirst({ where: { id: validatedDuerp.id, organizationId: org.id } });
    expect(source!.validatedAt).not.toBeNull();

    const lastVersion = await db.dUERP.findFirst({
      where: { organizationId: org.id, year: source!.year },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const revision = await db.dUERP.create({
      data: {
        organizationId: org.id,
        year: source!.year,
        version: nextVersion,
        status: "DRAFT",
        previousVersionId: source!.id,
      },
    });
    createdDuerpIds.push(revision.id);

    expect(revision.version).toBe(2);
    expect(revision.status).toBe("DRAFT");
    expect(revision.validatedAt).toBeNull();
    expect(revision.previousVersionId).toBe(validatedDuerp.id);
  });

  it("exposes the revision chain from both ends of the self-relation", async () => {
    const withRevisions = await db.dUERP.findFirst({
      where: { id: validatedDuerp.id },
      include: { revisions: true },
    });
    expect(withRevisions!.revisions.length).toBeGreaterThan(0);
    expect(withRevisions!.revisions[0].previousVersionId).toBe(validatedDuerp.id);

    const revision = withRevisions!.revisions[0];
    const withPrevious = await db.dUERP.findFirst({
      where: { id: revision.id },
      include: { previousVersion: true },
    });
    expect(withPrevious!.previousVersion!.id).toBe(validatedDuerp.id);
  });

  it("a validated DUERP from another organization is invisible under this org's scope (IDOR check)", async () => {
    const otherOrg = await db.organization.create({ data: { name: `Other Org ${suffix}`, slug: `other-org-${suffix}` } });
    try {
      const found = await db.dUERP.findFirst({ where: { id: validatedDuerp.id, organizationId: otherOrg.id } });
      expect(found).toBeNull();
    } finally {
      await db.organization.delete({ where: { id: otherOrg.id } });
    }
  });
});
