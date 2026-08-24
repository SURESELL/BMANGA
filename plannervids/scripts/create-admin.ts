// Production-safe initial admin bootstrap. Unlike prisma/seed.ts, this
// creates NO demo brands and NO demo content — only the one workspace and
// the one admin account PlannerVids V1 needs.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' tsx scripts/create-admin.ts
//
// If ADMIN_PASSWORD is omitted, a random 24-char password is generated and
// printed once — store it in your password manager immediately, it is not
// recoverable afterwards (only its hash is stored).
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../prisma/generated/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error("Set ADMIN_EMAIL before running this script.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`A user with email ${email} already exists. Refusing to overwrite.`);
  }

  const password = process.env.ADMIN_PASSWORD ?? generatePassword();
  const passwordHash = await hashPassword(password);

  const workspace = await prisma.workspace.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "PlannerVids", slug: "default", timezone: "Europe/Paris" },
  });

  const user = await prisma.user.create({
    data: { email, name: "Admin", passwordHash },
  });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: "ADMIN" },
  });

  console.log("Admin account created.");
  console.log(`Email: ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Password (shown once): ${password}`);
  }
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
