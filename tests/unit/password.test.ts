import { describe, expect, it } from "vitest";
import { generateResetToken, hashPassword, hashResetToken, isPasswordStrong, verifyPassword } from "@/lib/password";

describe("password hashing (Argon2id)", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(hash).not.toEqual("Sup3rSecret!");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hash, "Sup3rSecret!")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    await expect(verifyPassword(hash, "WrongPassword1")).resolves.toBe(false);
  });

  it("never throws on a malformed hash", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});

describe("password strength policy", () => {
  it.each([
    ["short1A", false],
    ["alllowercase1", false],
    ["ALLUPPERCASE1", false],
    ["NoDigitsHere", false],
    ["ValidPass1", true],
  ])("isPasswordStrong(%s) === %s", (password, expected) => {
    expect(isPasswordStrong(password)).toBe(expected);
  });
});

describe("password reset tokens", () => {
  it("generates a token whose hash is reproducible and never stores the raw value", () => {
    const { token, tokenHash } = generateResetToken();
    expect(token).toHaveLength(64);
    expect(hashResetToken(token)).toEqual(tokenHash);
  });

  it("produces different tokens on each call", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toEqual(b.token);
  });
});
