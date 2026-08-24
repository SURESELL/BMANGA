import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(hash).not.toBe("Sup3rSecret!");
    await expect(verifyPassword(hash, "Sup3rSecret!")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("never returns the same hash twice for the same input (random salt)", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toBe(b);
  });

  it("does not throw on a malformed stored hash, just returns false", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});
