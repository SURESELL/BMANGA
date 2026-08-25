// Dev-only demo data. Never run against a production database — guarded
// below. Creates one workspace, one admin user and the four initial demo
// brands with their default publishing cadence.
import "dotenv/config";
import { PrismaClient, SocialPlatform } from "./generated/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const DEMO_BRANDS = [
  {
    name: "PREUVIA QHSE",
    cadence: {
      [SocialPlatform.LINKEDIN]: 3,
      [SocialPlatform.FACEBOOK]: 2,
      [SocialPlatform.INSTAGRAM]: 2,
      [SocialPlatform.TIKTOK]: 2,
      [SocialPlatform.YOUTUBE]: 2,
    },
  },
  { name: "Suresell Partners", cadence: defaultCadence() },
  { name: "Welcomelink", cadence: defaultCadence() },
  { name: "clipforgemediafr", cadence: defaultCadence() },
];

function defaultCadence(): Partial<Record<SocialPlatform, number>> {
  return {
    [SocialPlatform.LINKEDIN]: 2,
    [SocialPlatform.FACEBOOK]: 2,
    [SocialPlatform.INSTAGRAM]: 2,
    [SocialPlatform.TIKTOK]: 2,
    [SocialPlatform.YOUTUBE]: 2,
  };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run the demo seed against NODE_ENV=production. Use `tsx scripts/create-admin.ts` instead."
    );
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@plannervids.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!12345";

  const workspace = await prisma.workspace.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "PlannerVids", slug: "default", timezone: "Europe/Paris" },
  });

  const passwordHash = await hashPassword(adminPassword);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Admin", passwordHash },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: user.id, role: "ADMIN" },
  });

  for (const demo of DEMO_BRANDS) {
    const slug = slugify(demo.name);
    const brand = await prisma.brand.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug } },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: demo.name,
        slug,
        languages: ["fr", "en"],
      },
    });

    await prisma.brandGuideline.upsert({
      where: { brandId: brand.id },
      update: {},
      create: { brandId: brand.id },
    });

    for (const [platform, perWeek] of Object.entries(demo.cadence) as [SocialPlatform, number][]) {
      await prisma.publishingCadence.upsert({
        where: { brandId_platform: { brandId: brand.id, platform } },
        update: { perWeek },
        create: { brandId: brand.id, platform, perWeek },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log("Change this password after first login — this is dev/demo data only.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
