import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// A Post's idempotencyKey is unique at the DB level, and a
// PublicationAttempt is unique per (postId, attemptNumber). Together these
// are what make "zero unintended double publication" enforceable rather
// than just a convention — the scheduler (Phase 8) relies on both
// constraints actually rejecting duplicates, not just avoiding them by
// discipline.
describe("anti-duplication constraints", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;
  let brandId: string;

  async function makeContentVariant() {
    const master = await prisma.contentMaster.create({
      data: { brandId, title: `Idempotency test ${randomUUID()}` },
    });
    return prisma.contentVariant.create({
      data: { contentMasterId: master.id, platform: "LINKEDIN" },
    });
  }

  beforeAll(async () => {
    const workspace = await prisma.workspace.create({
      data: { name: `Idempotency Test ${suffix}`, slug: `idempotency-test-${suffix}` },
    });
    workspaceId = workspace.id;
    const brand = await prisma.brand.create({
      data: { workspaceId, name: `Test Brand ${suffix}`, slug: `test-brand-${suffix}` },
    });
    brandId = brand.id;
  });

  afterAll(async () => {
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.$disconnect();
  });

  it("rejects two posts created with the same idempotency key", async () => {
    const key = randomUUID();
    const variantA = await makeContentVariant();
    const variantB = await makeContentVariant();

    await prisma.post.create({
      data: { brandId, contentVariantId: variantA.id, platform: "LINKEDIN", idempotencyKey: key },
    });

    await expect(
      prisma.post.create({
        data: { brandId, contentVariantId: variantB.id, platform: "LINKEDIN", idempotencyKey: key },
      })
    ).rejects.toThrow();
  });

  it("rejects two publication attempts with the same attempt number for a post", async () => {
    const variant = await makeContentVariant();
    const post = await prisma.post.create({
      data: { brandId, contentVariantId: variant.id, platform: "LINKEDIN" },
    });

    await prisma.publicationAttempt.create({
      data: { postId: post.id, attemptNumber: 1, idempotencyKey: post.idempotencyKey },
    });

    await expect(
      prisma.publicationAttempt.create({
        data: { postId: post.id, attemptNumber: 1, idempotencyKey: post.idempotencyKey },
      })
    ).rejects.toThrow();
  });

  it("allows a second attempt with an incremented attempt number (retry path)", async () => {
    const variant = await makeContentVariant();
    const post = await prisma.post.create({
      data: { brandId, contentVariantId: variant.id, platform: "LINKEDIN" },
    });

    await prisma.publicationAttempt.create({
      data: { postId: post.id, attemptNumber: 1, idempotencyKey: post.idempotencyKey, status: "FAILED" },
    });
    const second = await prisma.publicationAttempt.create({
      data: { postId: post.id, attemptNumber: 2, idempotencyKey: post.idempotencyKey },
    });

    expect(second.attemptNumber).toBe(2);
  });

  it("rejects a second PlatformPost claiming the same provider post id on the same account", async () => {
    const socialAccount = await prisma.socialAccount.create({
      data: { brandId, platform: "LINKEDIN", displayName: "Test Page" },
    });

    const variantA = await makeContentVariant();
    const postA = await prisma.post.create({
      data: { brandId, contentVariantId: variantA.id, platform: "LINKEDIN" },
    });
    await prisma.platformPost.create({
      data: { postId: postA.id, socialAccountId: socialAccount.id, providerPostId: "urn:li:share:123" },
    });

    const variantB = await makeContentVariant();
    const postB = await prisma.post.create({
      data: { brandId, contentVariantId: variantB.id, platform: "LINKEDIN" },
    });

    await expect(
      prisma.platformPost.create({
        data: { postId: postB.id, socialAccountId: socialAccount.id, providerPostId: "urn:li:share:123" },
      })
    ).rejects.toThrow();
  });
});
