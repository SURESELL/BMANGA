"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const createBrandSchema = z.object({
  name: z.string().min(2).max(120),
});

export async function createBrand(formData: FormData) {
  const session = await requireSession();
  const parsed = createBrandSchema.parse({ name: formData.get("name") });

  const brand = await prisma.brand.create({
    data: {
      workspaceId: session.workspaceId,
      name: parsed.name,
      slug: slugify(parsed.name),
      guideline: { create: {} },
    },
  });

  await writeAuditLog({
    workspaceId: session.workspaceId,
    userId: session.sub,
    action: "settings_change",
    entityType: "brand",
    entityId: brand.id,
    metadata: { op: "create" },
  });

  revalidatePath("/app/brands");
  redirect(`/app/brands/${brand.id}`);
}

const listField = z
  .string()
  .optional()
  .transform((v) => (v ?? "").split("\n").map((s) => s.trim()).filter(Boolean));

const updateGuidelineSchema = z.object({
  brandId: z.string().uuid(),
  description: z.string().optional(),
  positioning: z.string().optional(),
  tone: z.string().optional(),
  promise: z.string().optional(),
  hashtags: listField,
  forbiddenPhrases: listField,
  priorityTopics: listField,
  forbiddenTopics: listField,
});

// A substantial edit to a brand's guideline does not itself touch already-
// approved posts (those are separate rows), so this only updates the
// BrandGuideline row — post-approval invalidation lives in the content
// edit path (lib/actions/content.ts, Phase 3).
export async function updateBrandGuideline(formData: FormData) {
  const session = await requireSession();
  const parsed = updateGuidelineSchema.parse({
    brandId: formData.get("brandId"),
    description: formData.get("description") ?? undefined,
    positioning: formData.get("positioning") ?? undefined,
    tone: formData.get("tone") ?? undefined,
    promise: formData.get("promise") ?? undefined,
    hashtags: formData.get("hashtags") ?? undefined,
    forbiddenPhrases: formData.get("forbiddenPhrases") ?? undefined,
    priorityTopics: formData.get("priorityTopics") ?? undefined,
    forbiddenTopics: formData.get("forbiddenTopics") ?? undefined,
  });

  const brand = await prisma.brand.findFirst({
    where: { id: parsed.brandId, workspaceId: session.workspaceId },
  });
  if (!brand) {
    throw new Error("Brand not found in this workspace");
  }

  await prisma.brandGuideline.upsert({
    where: { brandId: brand.id },
    create: {
      brandId: brand.id,
      description: parsed.description,
      positioning: parsed.positioning,
      tone: parsed.tone,
      promise: parsed.promise,
      hashtags: parsed.hashtags,
      forbiddenPhrases: parsed.forbiddenPhrases,
      priorityTopics: parsed.priorityTopics,
      forbiddenTopics: parsed.forbiddenTopics,
    },
    update: {
      description: parsed.description,
      positioning: parsed.positioning,
      tone: parsed.tone,
      promise: parsed.promise,
      hashtags: parsed.hashtags,
      forbiddenPhrases: parsed.forbiddenPhrases,
      priorityTopics: parsed.priorityTopics,
      forbiddenTopics: parsed.forbiddenTopics,
    },
  });

  await writeAuditLog({
    workspaceId: session.workspaceId,
    userId: session.sub,
    action: "settings_change",
    entityType: "brand_guideline",
    entityId: brand.id,
  });

  revalidatePath(`/app/brands/${brand.id}`);
}
