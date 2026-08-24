import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

describe("credential encryption", () => {
  it("round-trips a secret", () => {
    const plain = "ya29.a0AfH6SMC-fake-oauth-token";
    const cipher = encryptSecret(plain);
    expect(cipher).not.toContain(plain);
    expect(decryptSecret(cipher)).toBe(plain);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plain = "same-token-value";
    expect(encryptSecret(plain)).not.toBe(encryptSecret(plain));
  });

  it("rejects a tampered ciphertext instead of silently returning garbage", () => {
    const cipher = encryptSecret("some-refresh-token");
    const [iv, tag, data] = cipher.split(":") as [string, string, string];
    const tamperedByte = Buffer.from(data, "base64");
    tamperedByte[0] = (tamperedByte[0] ?? 0) ^ 0xff;
    const tampered = [iv, tag, tamperedByte.toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
