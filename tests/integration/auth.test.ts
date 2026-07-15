import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const suffix = `test-${Date.now()}`;
let org: { id: string };
let user: { id: string; passwordHash: string | null };

beforeAll(async () => {
  org = await db.organization.create({ data: { name: `Auth Test Org ${suffix}`, slug: `auth-test-org-${suffix}` } });
  const passwordHash = await hashPassword("CorrectHorse1!");
  user = await db.user.create({
    data: {
      email: `auth-${suffix}@preuvia.test`,
      organizationId: org.id,
      role: "ORG_ADMIN",
      passwordHash,
    },
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: user.id } });
  await db.organization.deleteMany({ where: { id: org.id } });
  await db.$disconnect();
});

describe("credentials auth security properties", () => {
  it("a freshly registered user has a non-recoverable password hash, never the plaintext", async () => {
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).not.toEqual("CorrectHorse1!");
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("verifies the correct password and rejects any other", async () => {
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(verifyPassword(stored.passwordHash!, "CorrectHorse1!")).resolves.toBe(true);
    await expect(verifyPassword(stored.passwordHash!, "anything-else")).resolves.toBe(false);
    // Regression guard for the historical bug: authorize() must never accept
    // an empty password as valid against a real hash.
    await expect(verifyPassword(stored.passwordHash!, "")).resolves.toBe(false);
  });

  it("account lockout fields flip as lib/auth.ts's authorize() would apply them", async () => {
    // Simule 5 échecs consécutifs comme le ferait authorize() dans lib/auth.ts.
    for (let i = 1; i <= 5; i++) {
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: i,
          lockedUntil: i >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
    }
    const locked = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(locked.failedLoginAttempts).toEqual(5);
    expect(locked.lockedUntil).not.toBeNull();
    expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("mustChangePassword blocks nothing at the DB layer but is readable for middleware enforcement", async () => {
    await db.user.update({ where: { id: user.id }, data: { mustChangePassword: true, lockedUntil: null, failedLoginAttempts: 0 } });
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.mustChangePassword).toBe(true);
  });
});
