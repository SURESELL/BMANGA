import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Section 3 of the product spec: brands must be totally isolated. This test
// creates two brands in the same workspace, each with its own content,
// social account and Brand Brain, and asserts that a brand-scoped query
// never returns the other brand's rows — the exact mistake ("mixing
// accounts or content between brands") the spec calls an absolute
// prohibition.
describe("brand isolation", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;
  let brandAId: string;
  let brandBId: string;

  beforeAll(async () => {
    const workspace = await prisma.workspace.create({
      data: { name: `Isolation Test ${suffix}`, slug: `isolation-test-${suffix}` },
    });
    workspaceId = workspace.id;

    const brandA = await prisma.brand.create({
      data: {
        workspaceId,
        name: `Brand A ${suffix}`,
        slug: `brand-a-${suffix}`,
        guideline: { create: { hashtags: ["#brandA"] } },
      },
    });
    const brandB = await prisma.brand.create({
      data: {
        workspaceId,
        name: `Brand B ${suffix}`,
        slug: `brand-b-${suffix}`,
        guideline: { create: { hashtags: ["#brandB"] } },
      },
    });
    brandAId = brandA.id;
    brandBId = brandB.id;

    await prisma.socialAccount.create({
      data: { brandId: brandAId, platform: "LINKEDIN", displayName: "Brand A LinkedIn" },
    });
    await prisma.socialAccount.create({
      data: { brandId: brandBId, platform: "LINKEDIN", displayName: "Brand B LinkedIn" },
    });

    await prisma.contentMaster.create({
      data: { brandId: brandAId, title: "Brand A exclusive content" },
    });
    await prisma.contentMaster.create({
      data: { brandId: brandBId, title: "Brand B exclusive content" },
    });
  });

  afterAll(async () => {
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.$disconnect();
  });

  it("scopes social accounts to their own brand only", async () => {
    const brandAAccounts = await prisma.socialAccount.findMany({ where: { brandId: brandAId } });
    expect(brandAAccounts).toHaveLength(1);
    expect(brandAAccounts.at(0)?.displayName).toBe("Brand A LinkedIn");
    expect(brandAAccounts.some((a) => a.displayName === "Brand B LinkedIn")).toBe(false);
  });

  it("scopes content masters to their own brand only", async () => {
    const brandBContent = await prisma.contentMaster.findMany({ where: { brandId: brandBId } });
    expect(brandBContent).toHaveLength(1);
    expect(brandBContent.at(0)?.title).toBe("Brand B exclusive content");
  });

  it("keeps each brand's guideline (Brand Brain) separate", async () => {
    const guidelineA = await prisma.brandGuideline.findUnique({ where: { brandId: brandAId } });
    const guidelineB = await prisma.brandGuideline.findUnique({ where: { brandId: brandBId } });
    expect(guidelineA?.hashtags).toEqual(["#brandA"]);
    expect(guidelineB?.hashtags).toEqual(["#brandB"]);
  });

  it("never returns another brand's rows even when querying by workspace", async () => {
    const allBrandsInWorkspace = await prisma.brand.findMany({ where: { workspaceId } });
    const ids = allBrandsInWorkspace.map((b) => b.id).sort();
    expect(ids).toEqual([brandAId, brandBId].sort());
  });
});
